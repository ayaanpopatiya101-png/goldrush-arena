import { Router, type IRouter } from "express";
import { db, arenaResults, arenaPlayers } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { GetArenaLeaderboardQueryParams, GetArenaLeaderboardResponse, UpdateLeaderboardProfileBody, UpdateLeaderboardProfileResponse } from "@workspace/api-zod";
import { buildLeaderboard, publicPreference } from "../lib/leaderboard.js";
import { JoinLiveQueueBody, GetLiveResultResponse, GetLiveRoomResponse, CreateCustomRoomBody, JoinCustomRoomBody, AgreeCustomRoomBody } from "@workspace/api-zod";
import { createPrivateRoom, joinPrivateRoom, agreePrivateRoom, forgetPrivateRoom, CustomRoomError } from "../lib/customRooms.js";
import { workshopPresetSchema } from "../lib/workshopValidation.js";
import { issueIdentity, limited, requireArenaIdentity } from "../lib/arenaIdentity.js";
import { currentRoom, joinRoom, leaveRoom, publicRoom } from "../lib/arenaService.js";
import { partyAllows, partyMemberIds } from "./party.js";
import { initialSeason, seasonKey, seasonView } from "../lib/competition.js";

const router: IRouter = Router();
router.post("/multiplayer/session", async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (limited(`session:${req.ip}`, 60, 3600000)) { res.status(429).json({ error: "Too many new sessions" }); return; }
  res.json(await issueIdentity());
});
router.use("/multiplayer", requireArenaIdentity, (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (limited(`http:${res.locals.arenaPlayer.id}`, 120)) { res.status(429).json({ error: "Too many requests" }); return; }
  next();
});
router.post("/multiplayer/queue", (req, res) => {
  const parsed = JoinLiveQueueBody.strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid queue request or unsupported online mode" }); return; }
  const input = parsed.data;
  if (input.mode === "ranked" && input.variant === "rally_race") {
    res.status(400).json({ error: "Rally Race is a Casual playlist; it does not change skill." }); return;
  }
  if (input.partyCode && !partyAllows(input.partyCode, res.locals.arenaPlayer.id, input.mode, input.variant)) {
    res.status(403).json({ error: "Join the party and use its leader's selected mode first." }); return;
  }
  const identity = res.locals.arenaPlayer;
  if(currentRoom(identity.id)?.customPreset && !["finished","void"].includes(currentRoom(identity.id)!.phase)){
    res.status(409).json({error:"Leave your private custom room before joining a standard queue."});return;
  }
  const rating = (identity.competitive[seasonKey()] ?? initialSeason()).rating;
  try { res.json(GetLiveRoomResponse.parse(publicRoom(joinRoom({ ...identity, rating }, input, input.partyCode ? partyMemberIds(input.partyCode) : undefined)))); }
  catch { res.status(503).json({ error: "Match server is busy. Try again." }); }
});
router.get("/multiplayer/competition", (_req, res) => {
  const history = res.locals.arenaPlayer.competitive;
  const season = seasonKey();
  res.json({ current: seasonView(season, history[season]), history: Object.keys(history).filter(k => k !== season).sort().reverse().map(k => seasonView(k, history[k])) });
});
router.get("/multiplayer/leaderboard", async (req, res): Promise<void> => {
  const parsed = GetArenaLeaderboardQueryParams.safeParse(req.query);
  if (!parsed.success || !Number.isInteger(parsed.data.page)) { res.status(400).json({ error: "Invalid leaderboard filters." }); return; }
  const players = await db.select({
    id: arenaPlayers.id, competitive: arenaPlayers.competitive,
    profile: sql<unknown>`${arenaPlayers.cosmetics}->'leaderboard'`,
    lastRankedAt: sql<string | null>`(select max(r.created_at) from arena_results r
      where r.player_id = "arena_players"."id" and r.receipt->>'matchType' = 'ranked'
      and r.receipt->>'humanCount' = '4')`,
  }).from(arenaPlayers);
  const viewer = players.find(p => p.id === res.locals.arenaPlayer.id);
  if (!viewer) { res.status(401).json({ error: "Player session required." }); return; }
  res.json(GetArenaLeaderboardResponse.parse(buildLeaderboard(players, viewer, parsed.data)));
});
router.put("/multiplayer/leaderboard/profile", async (req, res): Promise<void> => {
  const parsed = UpdateLeaderboardProfileBody.strict().safeParse(req.body);
  if (!parsed.success || (!parsed.data.anonymous && !/^[\p{L}\p{N} _.-]{2,24}$/u.test(parsed.data.nickname.trim()))) {
    res.status(400).json({ error: "Use a 2–24 character nickname with letters, numbers, spaces, dots, hyphens or underscores." }); return;
  }
  const preference = publicPreference({ ...parsed.data, nickname: parsed.data.nickname.trim() });
  // Update only this key; never overwrite concurrently changed purchases or room presets.
  await db.update(arenaPlayers).set({
    cosmetics: sql`jsonb_set(${arenaPlayers.cosmetics}, '{leaderboard}', ${JSON.stringify(preference)}::jsonb, true)`,
  }).where(eq(arenaPlayers.id, res.locals.arenaPlayer.id));
  res.json(UpdateLeaderboardProfileResponse.parse(preference));
});
const customWrap=(fn:(req:any,res:any)=>Promise<void>)=>async(req:any,res:any)=>{
  try{await fn(req,res);}catch(e){res.status(e instanceof CustomRoomError?e.status:503).json({error:e instanceof CustomRoomError?e.message:"Private room could not be saved. Retry."});}
};
router.post("/multiplayer/custom",customWrap(async(req,res)=>{
  const parsed=CreateCustomRoomBody.extend({preset:workshopPresetSchema}).strict().safeParse(req.body);
  if(!parsed.success){res.status(400).json({error:"Invalid custom preset or player details."});return;}
  res.json(GetLiveRoomResponse.parse(publicRoom(await createPrivateRoom(res.locals.arenaPlayer,parsed.data))));
}));
router.post("/multiplayer/custom/join",customWrap(async(req,res)=>{
  const parsed=JoinCustomRoomBody.strict().safeParse(req.body);
  if(!parsed.success){res.status(400).json({error:"Enter an eight-character private room code."});return;}
  res.json(GetLiveRoomResponse.parse(publicRoom(await joinPrivateRoom(res.locals.arenaPlayer,parsed.data))));
}));
router.post("/multiplayer/custom/agree",customWrap(async(req,res)=>{
  const parsed=AgreeCustomRoomBody.strict().safeParse(req.body);
  if(!parsed.success){res.status(400).json({error:"Review and agree to the current configuration."});return;}
  res.json(GetLiveRoomResponse.parse(publicRoom(agreePrivateRoom(res.locals.arenaPlayer,parsed.data.roomId,parsed.data.configHash))));
}));
router.get("/multiplayer/current", (_req, res) => {
  const room = currentRoom(res.locals.arenaPlayer.id);
  if(!room && res.locals.arenaPlayer.cosmetics.lastCustomRoom){
    res.json(GetLiveRoomResponse.parse(res.locals.arenaPlayer.cosmetics.lastCustomRoom));return;
  }
  if (!room) { res.status(404).json({ error: "No active match. Server interruption never creates a win." }); return; }
  res.json(GetLiveRoomResponse.parse(publicRoom(room)));
});
router.delete("/multiplayer/queue", customWrap(async(_req, res) => {
  await forgetPrivateRoom(res.locals.arenaPlayer);
  leaveRoom(res.locals.arenaPlayer.id); res.sendStatus(204);
}));
router.get("/multiplayer/result/:matchId", async (req, res) => {
  const [row] = await db.select().from(arenaResults).where(eq(arenaResults.id, `${req.params.matchId}:${res.locals.arenaPlayer.id}`));
  if (!row) { res.status(404).json({ error: "No verified result exists for this player and match." }); return; }
  res.json(GetLiveResultResponse.parse(row.receipt));
});
export default router;
