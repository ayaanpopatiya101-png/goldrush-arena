import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db, arenaPlayers } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { CustomRoomInput, CustomJoinInput } from "@workspace/api-zod";
import { rooms, playerRooms, currentRoom, publicRoom } from "./arenaService.js";
import { type ArenaRoom, type SimPlayer } from "./arenaSimulation.js";
import { type ArenaIdentity } from "./arenaIdentity.js";
import { workshopPresetSchema } from "./workshopValidation.js";

export class CustomRoomError extends Error { constructor(public status: number, message:string) { super(message); } }
function available(p: ArenaIdentity) {
  const prior=currentRoom(p.id);
  if(prior && !['finished','void'].includes(prior.phase)) throw new CustomRoomError(409,"Leave your current match before joining another.");
}
function participant(p:ArenaIdentity,input:{name:string;color:string},room:ArenaRoom):SimPlayer {
  return {id:p.id,name:input.name.trim()||"Player",color:input.color,seat:room.players.length,isBot:false,connected:false,
    paddle:500,lives:room.customPreset!.rules.lives,hits:0,goals:0,place:0,rating:p.rating,
    target:500,seen:Date.now(),nextThink:0,seq:-1};
}
/** Persist the immutable configuration, not a claim that an interrupted sim finished.
 * After restart the player can recover it as a void room and create a new match. */
async function remember(p:ArenaIdentity,room:ArenaRoom) {
  const recovery={...publicRoom(room),phase:"void" as const,reason:"The private match server restarted or the room expired. No rewards were issued. Its configuration is preserved; create a new room to play again."};
  await db.transaction(async tx=>{
    const [fresh]=await tx.select().from(arenaPlayers).where(eq(arenaPlayers.id,p.id)).for("update");
    if(!fresh || fresh.tokenHash!==p.tokenHash)throw new CustomRoomError(401,"Player session expired.");
    await tx.update(arenaPlayers).set({cosmetics:{...fresh.cosmetics,lastCustomRoom:recovery}}).where(eq(arenaPlayers.id,p.id));
  });
}
export async function createPrivateRoom(p:ArenaIdentity,input:CustomRoomInput) {
  available(p);
  if(rooms.size>=1000)throw new CustomRoomError(503,"Match server is busy.");
  const preset=workshopPresetSchema.parse(input.preset);
  // Deep-freeze only configuration: simulation and agreement remain mutable.
  Object.freeze(preset.court);Object.freeze(preset.hit);Object.freeze(preset.rules);Object.freeze(preset);
  const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code:string;
  do { code=Array.from(randomBytes(8),n=>alphabet[n%alphabet.length]).join(""); }
  while([...rooms.values()].some(r=>r.customCode===code));
  const now=Date.now();
  const room:ArenaRoom={id:randomUUID(),mode:"casual",variant:"classic",phase:"waiting",region:"primary",players:[],balls:[],
    tick:0,serverTime:now,startAt:0,createdAt:now,reason:"Private custom — no rewards",latency:0,createdRating:0,nextBall:0,
    customPreset:preset,customCode:code,configHash:createHash("sha256").update(JSON.stringify(preset)).digest("hex"),agreedIds:[]};
  room.players.push(participant(p,input,room));
  await remember(p,room);
  // Recheck after I/O: a player must never enter two concurrent queues.
  available(p);
  rooms.set(room.id,room);playerRooms.set(p.id,room.id);
  return room;
}
const joinLocks=new Set<string>();
export async function joinPrivateRoom(p:ArenaIdentity,input:CustomJoinInput) {
  available(p);
  const room=[...rooms.values()].find(r=>r.customCode===input.code);
  if(!room || room.phase!=="waiting")throw new CustomRoomError(404,"Private room not available. Ask the host for a new code.");
  if(room.players.length>=4 || joinLocks.has(room.id))throw new CustomRoomError(409,"Room full or another player is joining. Retry.");
  joinLocks.add(room.id);
  try {
    await remember(p,room);
    available(p);
    if(room.phase!=="waiting" || room.players.length>=4)throw new CustomRoomError(409,"Room is no longer waiting.");
    room.players.push(participant(p,input,room));playerRooms.set(p.id,room.id);
    return room;
  } finally {joinLocks.delete(room.id);}
}
export function agreePrivateRoom(p:ArenaIdentity,roomId:string,hash:string) {
  const room=currentRoom(p.id);
  if(!room?.customPreset || room.id!==roomId || room.configHash!==hash || room.phase!=="waiting")
    throw new CustomRoomError(409,"Room or configuration changed. Review the current rules first.");
  room.agreedIds=[...new Set([...(room.agreedIds??[]),p.id])];
  return room;
}
export async function forgetPrivateRoom(p:ArenaIdentity) {
  await db.transaction(async tx=>{
    const [fresh]=await tx.select().from(arenaPlayers).where(eq(arenaPlayers.id,p.id)).for("update");
    if(!fresh || fresh.tokenHash!==p.tokenHash)throw new CustomRoomError(401,"Player session expired.");
    const {lastCustomRoom:_,...cosmetics}=fresh.cosmetics;
    await tx.update(arenaPlayers).set({cosmetics}).where(eq(arenaPlayers.id,p.id));
  });
}
