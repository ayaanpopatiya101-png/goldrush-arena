import AsyncStorage from "@react-native-async-storage/async-storage";
import { cancelSmsReminders, createPlayerSession, setBaseUrl, type PlayerSession } from "@workspace/api-client-react";
import { getApiBase } from "./api";
import { readCredential, writeCredential, removeCredential } from "./arenaCredentials";

const pending = new Map<string, Promise<PlayerSession>>();
const retiring = new Set<string>();
const profileEpochs=new Map<string,number>();
export const arenaProfileEpoch=(username:string)=>profileEpochs.get(username)??0;
const keyFor=(user:string)=>"arena_session_" + Array.from(user).map(c => c.codePointAt(0)!.toString(16)).join("_");
export async function cancelArenaSms(username: string) {
  // Do not create a new identity just to sign out a local-only profile.
  const saved = await readCredential(keyFor(username));
  if (!saved) return;
  const session = JSON.parse(saved) as PlayerSession;
  setBaseUrl(getApiBase());
  await cancelSmsReminders({ headers: { Authorization: `Bearer ${session.token}` }, signal: arenaTimeout() });
}
export async function retireArenaProfile(username:string) {
  const key=keyFor(username);
  retiring.add(key);
  try {
    await pending.get(key)?.catch(()=>{});
    const saved=await readCredential(key);
    if(saved){
      const session=JSON.parse(saved) as PlayerSession;
      const response=await fetch(`${getApiBase()}/api/multiplayer/avatar/retire`,{method:"POST",headers:{Authorization:`Bearer ${session.token}`},signal:arenaTimeout()});
      if(!response.ok && response.status!==401)throw new Error("Connect to delete the server photo before removing this player.");
    }
    await removeCredential(key);
    pending.delete(key);
    profileEpochs.set(username,arenaProfileEpoch(username)+1);
  } finally { retiring.delete(key); }
}
export function arenaTimeout(ms = 12000) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}
export async function getArenaSession(username?: string): Promise<PlayerSession> {
  const user = username ?? await AsyncStorage.getItem("@goldrush_current");
  if (!user) throw new Error("Choose a local player profile first.");
  const key = keyFor(user);
  if(retiring.has(key))throw new Error("This player is being deleted.");
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
