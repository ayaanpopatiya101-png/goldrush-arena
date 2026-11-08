import AsyncStorage from "@react-native-async-storage/async-storage";
import { createPlayerSession, setBaseUrl, type PlayerSession } from "@workspace/api-client-react";
import { getApiBase } from "./api";
import { readCredential, writeCredential } from "./arenaCredentials";

const pending = new Map<string, Promise<PlayerSession>>();
export function arenaTimeout(ms = 12000) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}
export async function getArenaSession(username?: string): Promise<PlayerSession> {
  const user = username ?? await AsyncStorage.getItem("@goldrush_current");
  if (!user) throw new Error("Choose a local player profile first.");
  const key = "arena_session_" + Array.from(user).map(c => c.codePointAt(0)!.toString(16)).join("_");
  let promise = pending.get(key);
  if (!promise) {
    promise = (async () => {
      setBaseUrl(getApiBase());
      const saved = await readCredential(key);
      if (saved) {
        const parsed = JSON.parse(saved) as PlayerSession;
        if (parsed.playerId && /^[a-f0-9]{64}$/.test(parsed.token)) return parsed;
        throw new Error("The online identity could not be read. Your local save is unchanged.");
      }
      const session = await createPlayerSession({ signal: arenaTimeout() });
      await writeCredential(key, JSON.stringify(session));
      return session;
    })();
    pending.set(key, promise);
    promise.catch(() => pending.delete(key));
  }
  return promise;
}
export async function arenaRequestOptions(username?: string): Promise<RequestInit> {
  const session = await getArenaSession(username);
  return { headers: { Authorization: `Bearer ${session.token}` }, signal: arenaTimeout() };
}
