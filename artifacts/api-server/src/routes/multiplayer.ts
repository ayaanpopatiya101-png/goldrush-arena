import { Router, type IRouter } from "express";
import { db, arenaResults } from "@workspace/db";
import { eq } from "drizzle-orm";
import { JoinLiveQueueBody, GetLiveResultResponse, GetLiveRoomResponse } from "@workspace/api-zod";
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
  const parsed = JoinLiveQueueBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid queue request or unsupported online mode" }); return; }
  const input = parsed.data;
  if (input.mode === "ranked" && input.variant === "rally_race") {
    res.status(400).json({ error: "Rally Race is a Casual playlist; it does not change skill." }); return;
  }
  if (input.partyCode && !partyAllows(input.partyCode, res.locals.arenaPlayer.id, input.mode, input.variant)) {
    res.status(403).json({ error: "Join the party and use its leader's selected mode first." }); return;
  }
  const identity = res.locals.arenaPlayer;
  const rating = (identity.competitive[seasonKey()] ?? initialSeason()).rating;
  try { res.json(GetLiveRoomResponse.parse(publicRoom(joinRoom({ ...identity, rating }, input, input.partyCode ? partyMemberIds(input.partyCode) : undefined)))); }
  catch { res.status(503).json({ error: "Match server is busy. Try again." }); }
});
router.get("/multiplayer/competition", (_req, res) => {
  const history = res.locals.arenaPlayer.competitive;
  const season = seasonKey();
  res.json({ current: seasonView(season, history[season]), history: Object.keys(history).filter(k => k !== season).sort().reverse().map(k => seasonView(k, history[k])) });
});
router.get("/multiplayer/current", (_req, res) => {
  const room = currentRoom(res.locals.arenaPlayer.id);
  if (!room) { res.status(404).json({ error: "No active match. Server interruption never creates a win." }); return; }
  res.json(GetLiveRoomResponse.parse(publicRoom(room)));
});
router.delete("/multiplayer/queue", (_req, res) => {
  leaveRoom(res.locals.arenaPlayer.id); res.sendStatus(204);
});
router.get("/multiplayer/result/:matchId", async (req, res) => {
  const [row] = await db.select().from(arenaResults).where(eq(arenaResults.id, `${req.params.matchId}:${res.locals.arenaPlayer.id}`));
  if (!row) { res.status(404).json({ error: "No verified result exists for this player and match." }); return; }
  res.json(GetLiveResultResponse.parse(row.receipt));
});
export default router;
