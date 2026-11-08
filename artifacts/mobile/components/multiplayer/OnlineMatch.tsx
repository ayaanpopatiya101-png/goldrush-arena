import React, { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { router } from "expo-router";
import { getLiveRoom, joinLiveQueue, leaveLiveQueue, getLiveResult, type LiveRoom, type LiveResult, type QueueInput } from "@workspace/api-client-react";
import { LiveMatchView } from "./LiveMatchView";
import { usePlayer } from "@/context/PlayerContext";
import { useParty } from "@/context/PartyContext";
import { getGameConfig, updateGameConfig } from "@/store/gameSession";
import { getArenaSession, arenaRequestOptions, arenaTimeout } from "@/utils/arenaSession";
import { apiUrl } from "@/utils/api";

export const onlineVariants = ["classic", "duos", "blitz", "chaos", "survival", "sudden_death", "turbo", "pinball", "rally_race"];
export function isOnlineMode() {
  const c = getGameConfig();
  return !c.practice && !c.challengeSeed && !c.featuredModeId && ["ranked", "casual"].includes(c.matchType) && onlineVariants.includes(c.variant);
}
export default function OnlineMatch() {
  const { profile, currentUsername, addMatchResult } = usePlayer();
  const { partyCode } = useParty();
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [connection, setConnection] = useState("connecting");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const socket = useRef<WebSocket | null>(null);
  const latest = useRef(room); latest.current = room;
  const receipt = useRef<LiveResult | null>(null);
  const saving = useRef(false);
  const saveAttempted = useRef<string | null>(null);
  const cancelled = useRef(false);
  const sequence = useRef(0);
  const lastInput = useRef(0);
  const profileRef = useRef(profile); profileRef.current = profile;
  const saveRef = useRef(addMatchResult); saveRef.current = addMatchResult;
  const pendingKey = `@goldrush_pending_online_${currentUsername}`;
  const forfeitedKey = `@goldrush_forfeited_online_${currentUsername}`;

  async function saveResult(matchId: string) {
    if (saving.current || receipt.current?.matchId === matchId) return;
    saveAttempted.current = matchId;
    saving.current = true;
    try {
      // Earlier forfeits never block a new queue. Recover up to two completed
      // receipts here before publishing this match's result, preserving order.
      const archived: string[] = JSON.parse(await AsyncStorage.getItem(forfeitedKey) ?? "[]");
      const recovered = new Set<string>();
      for (const id of archived.slice(0, 2)) {
        try {
          const old = await getLiveResult(id, await arenaRequestOptions(currentUsername));
          await saveRef.current({ ...old, serverMatchId: id, transactionId: id });
          recovered.add(id);
        } catch (e) {
          if ((e as { status?: number }).status !== 404) throw e;
        }
      }
      await AsyncStorage.setItem(forfeitedKey, JSON.stringify(archived.filter(id => !recovered.has(id))));
      const verified = await getLiveResult(matchId, await arenaRequestOptions(currentUsername));
      updateGameConfig({ onlineMatchId: matchId, matchId, matchType: verified.matchType, bankLivesUsed: 0 });
      await saveRef.current({ ...verified, transactionId: matchId });
      await AsyncStorage.removeItem(pendingKey);
      receipt.current = verified;
      if (!cancelled.current) { setSaved(true); setError(null); socket.current?.close(); }
    } catch {
      if (!cancelled.current) setError("Could not confirm all result-saving steps. Retry before playing again; rewards are checked for duplicates.");
    } finally { saving.current = false; }
  }

  useEffect(() => {
    cancelled.current = false;
    let disposed = false, backgrounded = false, reconnect: ReturnType<typeof setTimeout> | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let lastMessage = Date.now(), retries = 0;
    const connect = async () => {
      if (disposed || backgrounded) return;
      try {
        const session = await getArenaSession(currentUsername);
        if (disposed) return;
        setPlayerId(session.playerId);
        const options = await arenaRequestOptions(currentUsername);
        let active: LiveRoom | undefined;
        try { active = await getLiveRoom(options); }
        catch (e) {
          if ((e as { status?: number }).status !== 404) throw e;
        }
        if (!active) {
          const pending = await AsyncStorage.getItem(pendingKey);
          if (pending) {
            const prior = JSON.parse(pending) as LiveRoom;
            try {
              const verified = await getLiveResult(prior.id, await arenaRequestOptions(currentUsername));
              updateGameConfig({ onlineMatchId: prior.id, matchId: prior.id, matchType: verified.matchType, variant: prior.variant as QueueInput["variant"] });
              await saveRef.current({ ...verified, transactionId: prior.id });
              await AsyncStorage.removeItem(pendingKey);
              if (!disposed) router.replace("/postgame");
              return;
            } catch (e) {
              if ((e as { status?: number }).status !== 404) throw e;
              if (!disposed) {
                setRoom({ ...prior, phase: "void", reason: "This match was interrupted before a verified result was saved. No rewards were fabricated." });
                latest.current = { ...prior, phase: "void" };
                setConnection("disconnected");
              }
              return;
            }
          }
          // A finished screen reconnect/HMR is not permission to start another match.
          const completedId = getGameConfig().onlineMatchId;
          if (completedId && profileRef.current.rewardedMatchIds?.includes(completedId)) {
            const verified = await getLiveResult(completedId, await arenaRequestOptions(currentUsername));
            await saveRef.current({ ...verified, transactionId: completedId });
            if (!disposed) router.replace("/postgame");
            return;
          }
        }
        if (active?.phase === "finished" && profileRef.current.rewardedMatchIds?.includes(active.id) &&
          getGameConfig().onlineMatchId !== active.id) {
          await leaveLiveQueue(options); active = undefined;
        }
        if (!active) {
          if (latest.current && !["finished","void"].includes(latest.current.phase)) {
            setError("The match was interrupted and is no longer on the server. No unverified rewards were issued.");
            setRoom({ ...latest.current, phase: "void", reason: "Server interruption" });
            return;
          }
          const config = getGameConfig();
          const start = Date.now();
          // The health request measures this client's round-trip to the sole current region.
          await fetch(apiUrl("/healthz"), { signal: arenaTimeout(8000) });
          active = await joinLiveQueue({
            name: profileRef.current.name.slice(0,24), color: config.playerColor,
            mode: config.matchType === "ranked" ? "ranked" : "casual",
            variant: config.variant as QueueInput["variant"], latency: Math.min(2000, Date.now()-start),
            ...(partyCode ? { partyCode } : {}),
          }, await arenaRequestOptions(currentUsername));
        }
        if (disposed || backgrounded) return;
        await AsyncStorage.setItem(pendingKey, JSON.stringify(active));
        if (disposed || backgrounded) return;
        setRoom(active);
        updateGameConfig({ onlineMatchId: active.id, matchId: active.id, matchType: active.mode,
          variant: active.variant as QueueInput["variant"], bankLivesUsed: 0 });
        const ws = new WebSocket(apiUrl("").replace(/^http/, "ws"));
        socket.current = ws;
        ws.onopen = () => {
          lastMessage = Date.now();
          sequence.current = 0;
          ws.send(JSON.stringify({ type: "auth", token: session.token }));
        };
        ws.onmessage = event => {
          if (disposed) return;
          lastMessage = Date.now();
          try {
            const message = JSON.parse(event.data);
            if (message.type === "ready") { setConnection("connected"); setError(null); retries = 0; }
            if (message.type === "snapshot") {
              const snapshot = message.room as LiveRoom;
              latest.current = snapshot; setRoom(snapshot);
              if (snapshot.phase === "finished" && !receipt.current && !saving.current && saveAttempted.current !== snapshot.id) void saveResult(snapshot.id);
            }
            if (message.type === "error") setError(message.error);
          } catch { setError("An invalid server update was received."); }
        };
        ws.onclose = event => {
          if (disposed) return;
          if (latest.current?.phase === "finished" || latest.current?.phase === "void") {
            setConnection("complete"); return;
          }
          setConnection("reconnecting");
          if (event.code === 4001 || event.code === 1008) {
            setError("This player session was disconnected. Close any other match tab and retry."); return;
          }
          if (backgrounded) return;
          if (retries++ < 8) reconnect = setTimeout(connect, Math.min(4000, 500 * 2 ** retries));
          else setError("Connection lost. Retry to reconnect or return to Play.");
        };
        ws.onerror = () => ws.close();
      } catch (e) {
        if (!disposed) { setConnection("offline"); setError(e instanceof Error ? e.message : "Could not connect to the game server."); }
      }
    };
    void connect();
    heartbeat = setInterval(() => {
      const ws = socket.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
        if (Date.now()-lastMessage > 12000) ws.close();
      }
    }, 3000);
    const background = AppState.addEventListener("change", state => {
      backgrounded = state !== "active";
      clearTimeout(reconnect);
      if (backgrounded) socket.current?.close();
      else if (!socket.current || socket.current.readyState === WebSocket.CLOSED) void connect();
    });
    return () => {
      disposed = true; cancelled.current = true;
      clearTimeout(reconnect); clearInterval(heartbeat); background.remove();
      socket.current?.close(); socket.current = null;
    };
  }, [attempt, currentUsername, partyCode]);

  async function leave() {
    try {
      if (latest.current?.phase === "playing") {
        const archived: string[] = JSON.parse(await AsyncStorage.getItem(forfeitedKey) ?? "[]");
        await AsyncStorage.setItem(forfeitedKey, JSON.stringify([...new Set([...archived, latest.current.id])]));
      }
      await leaveLiveQueue(await arenaRequestOptions(currentUsername));
      await AsyncStorage.removeItem(pendingKey);
      cancelled.current = true; socket.current?.close(); router.replace("/");
    } catch { setError("Could not confirm leaving. Retry; the online match cannot pause."); }
  }
  async function again(casual = false) {
    if (casual && partyCode) { setError("Party mode changes must be made together: cancel the queue, then ask the leader to choose Casual on Home."); return; }
    if (latest.current?.phase === "saving" || (latest.current?.phase === "finished" && !saved)) {
      setError("Save the verified result before starting another match."); return;
    }
    try {
      await leaveLiveQueue(await arenaRequestOptions(currentUsername));
      await AsyncStorage.removeItem(pendingKey);
      receipt.current = null; saveAttempted.current = null; setSaved(false); setError(null); latest.current = null; setRoom(null);
      updateGameConfig({ onlineMatchId: undefined, ...(casual ? { matchType: "casual" as const } : {}) });
      setAttempt(v => v+1);
    } catch { setError("Could not start a fresh queue. Please retry."); }
  }
  return <LiveMatchView room={room} playerId={playerId} connection={connection} error={error} saved={saved}
    onMove={position => {
      if (Date.now()-lastInput.current < 30) return;
      lastInput.current = Date.now();
      if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify({ type: "input", position, seq: ++sequence.current }));
    }}
    ratingChange={saved && receipt.current?.matchType === "ranked" ? `${receipt.current.ratingBefore} to ${receipt.current.ratingAfter} (${receipt.current.ratingAfter - receipt.current.ratingBefore >= 0 ? "+" : ""}${receipt.current.ratingAfter - receipt.current.ratingBefore})` : undefined}
    onLeave={() => void leave()} onCasual={partyCode ? undefined : () => void again(true)} onAgain={() => void again()}
    onRetry={() => { setError(null); if (latest.current?.phase === "finished") void saveResult(latest.current.id); else setAttempt(v => v+1); }}
    onResults={() => { if (saved && receipt.current) router.replace("/postgame"); }} />;
}
