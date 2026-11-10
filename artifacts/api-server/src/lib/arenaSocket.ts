import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { resolveIdentity } from "./arenaIdentity.js";
import { currentRoom, publicRoom, tickRooms } from "./arenaService.js";
import { clamp } from "./arenaSimulation.js";

export function installArenaSocket(server: Server) {
  // /api is explicitly routed by the artifact proxy, including websocket upgrades.
  const wss = new WebSocketServer({ server, path: "/api", maxPayload: 2048, perMessageDeflate: false });
  const sockets = new Map<string, WebSocket>();
  wss.on("connection", socket => {
    if (wss.clients.size > 2000) { socket.close(1013, "Server busy"); return; }
    let id = "", authenticating = false, windowStart = Date.now(), count = 0;
    const authTimeout = setTimeout(() => socket.close(1008, "Session required"), 5000);
    const send = (data: unknown) => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data)); };
    socket.on("message", async raw => {
      try {
        const now = Date.now();
        if (now-windowStart > 1000) { count = 0; windowStart = now; }
        if (++count > 80) { socket.close(1008, "Input rate exceeded"); return; }
        const message = JSON.parse(raw.toString());
        if (!id) {
          if (authenticating || message.type !== "auth") return;
          authenticating = true;
          const identity = await resolveIdentity(message.token);
          if (!identity || socket.readyState !== WebSocket.OPEN) { socket.close(1008, "Invalid session"); return; }
          id = identity.id;
          clearTimeout(authTimeout);
          const prior = sockets.get(id);
          sockets.set(id, socket);
          prior?.close(4001, "This player connected elsewhere");
          const room = currentRoom(id);
          const p = room?.players.find(p => p.id === id);
          if (p) { p.connected = true; p.seen = now; p.seq = -1; }
          send({ type: "ready", playerId: id });
          return;
        }
        if (sockets.get(id) !== socket) return;
        const room = currentRoom(id);
        const p = room?.players.find(p => p.id === id);
        if (!room || !p) { send({ type: "error", error: "Match no longer available. No unverified reward will be issued." }); return; }
        if (message.type === "ping") { p.seen = now; send({ type: "pong", time: now }); }
        if (message.type === "input" && room.phase === "playing" && p.lives > 0 &&
          typeof message.position === "number" && Number.isFinite(message.position) &&
          Number.isSafeInteger(message.seq) && message.seq > p.seq) {
          p.target = clamp(message.position); p.seq = message.seq; p.seen = now;
        }
      } catch { socket.close(1008, "Invalid message"); }
    });
    socket.on("close", () => {
      clearTimeout(authTimeout);
      if (id && sockets.get(id) === socket) {
        sockets.delete(id);
        const p = currentRoom(id)?.players.find(p => p.id === id);
        if (p) { p.connected = false; p.seen = Date.now(); }
      }
    });
    socket.on("error", () => socket.close());
  });
  let frame = 0;
  const timer = setInterval(() => {
    tickRooms();
    if (++frame % 3) return; // 60 Hz simulation / 20 Hz snapshots
    for (const [id, socket] of sockets) {
      const room = currentRoom(id);
      if (room && socket.readyState === WebSocket.OPEN && socket.bufferedAmount < 64000) {
        socket.send(JSON.stringify({ type: "snapshot", room: publicRoom(room) }));
      }
    }
  }, 1000/60);
  timer.unref();
  server.on("close", () => { clearInterval(timer); wss.close(); });
  return wss;
}
