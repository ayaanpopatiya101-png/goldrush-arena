import { Router, raw as rawBody, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db, arenaPlayers, avatarUploads } from "@workspace/db";
import { and, eq, lt } from "drizzle-orm";
import { limited, requireArenaIdentity } from "../lib/arenaIdentity.js";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "../lib/objectStorage.js";
import { RequestAvatarUploadBody, CommitAvatarBody, ShareAvatarBody } from "@workspace/api-zod";
import { rooms } from "../lib/arenaService.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();
const storage = new ObjectStorageService();
const MAX = 5 * 1024 * 1024;
let decoding = 0;
let receiving = 0;
let cleaning = false;
function stagingFile(id: string) {
  const parts = storage.getPrivateObjectDir().replace(/^\/+/, "").split("/");
  return objectStorageClient.bucket(parts.shift()!).file(`${parts.join("/")}/uploads/${id}`);
}
export async function cleanupAvatarUploads() {
  if (cleaning) return;
  cleaning = true;
  try {
    const expired = await db.select().from(avatarUploads).where(lt(avatarUploads.createdAt, new Date(Date.now() - 1200000))).limit(100);
    for (const upload of expired) {
      try {
        const file = await storage.getObjectEntityFile(upload.objectPath);
        await file.delete({ignoreNotFound:true});
      } catch (error) { if (!(error instanceof ObjectNotFoundError)) continue; }
      await db.delete(avatarUploads).where(eq(avatarUploads.id, upload.id));
    }
  } finally { cleaning = false; }
}
export function startAvatarCleanup() {
  const run = () => { void cleanupAvatarUploads().catch(() => logger.warn("Avatar staging cleanup will retry")); };
  run();
  setInterval(run, 60000).unref();
}
function outputFile(id: string) {
  const parts = storage.getPrivateObjectDir().replace(/^\/+/, "").split("/");
  return objectStorageClient.bucket(parts.shift()!).file(`${parts.join("/")}/avatars/${id}.jpg`);
}
function updatePeers(playerId: string, avatarId: string | null, shared: boolean) {
  for (const room of rooms.values()) {
    const player = room.players.find(p => p.id === playerId);
    if (player) player.avatarUrl = shared && avatarId ? `/api/avatars/${avatarId}` : null;
  }
}
router.get("/avatars/:id", async (req, res) => {
  if (!/^[a-f0-9-]{36}$/.test(req.params.id)) { res.sendStatus(404); return; }
  const [owner] = await db.select({ id: arenaPlayers.id }).from(arenaPlayers).where(and(eq(arenaPlayers.avatarId, req.params.id), eq(arenaPlayers.avatarShared, true)));
  if (!owner) { res.sendStatus(404); return; }
  res.set({ "Cache-Control": "no-store", "Content-Type": "image/jpeg", "X-Content-Type-Options": "nosniff" });
  outputFile(req.params.id).createReadStream().on("error", () => res.destroy()).pipe(res);
});
router.use("/multiplayer/avatar", requireArenaIdentity, (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (limited(`avatar:${res.locals.arenaPlayer.id}`, 30)) { res.status(429).json({ error: "Too many avatar requests. Try again shortly." }); return; }
  next();
});
router.get("/multiplayer/avatar", (_req, res) => {
  const p = res.locals.arenaPlayer;
  res.json({ id: p.avatarId, shared: p.avatarShared });
});
router.get("/multiplayer/avatar/image", (_req, res) => {
  const id = res.locals.arenaPlayer.avatarId;
  if (!id) { res.sendStatus(404); return; }
  res.set({ "Content-Type": "image/jpeg", "X-Content-Type-Options": "nosniff" });
  outputFile(id).createReadStream().on("error", () => res.destroy()).pipe(res);
});
router.post("/multiplayer/avatar/upload", async (req, res) => {
  if (!RequestAvatarUploadBody.safeParse(req.body).success) {
    res.status(400).json({ error: "Choose JPEG, PNG or WebP up to 5 MB." }); return;
  }
  if (limited("avatar-uploads-global", 30)) { res.status(429).json({error:"Photo uploads are busy. Retry shortly."}); return; }
  const id = randomUUID();
  await db.insert(avatarUploads).values({ id, playerId: res.locals.arenaPlayer.id, objectPath: `/objects/uploads/${id}` });
  res.json({ id, uploadUrl: `/api/multiplayer/avatar/upload/${id}` });
});
// Bytes cross a size-limited authenticated boundary BEFORE any storage write.
// No unrestricted presigned PUT URL is given to the guest.
router.put("/multiplayer/avatar/upload/:id", async (req,res,next) => {
  const [upload] = await db.select().from(avatarUploads).where(and(eq(avatarUploads.id,req.params.id),eq(avatarUploads.playerId,res.locals.arenaPlayer.id)));
  if (!upload || Date.now()-upload.createdAt.getTime()>600000) { res.sendStatus(404); return; }
  if (!req.is(["image/jpeg","image/png","image/webp"]) || (req.headers["content-encoding"] && req.headers["content-encoding"]!=="identity")) { res.sendStatus(415); return; }
  if (Number(req.headers["content-length"])>MAX) { res.sendStatus(413); return; }
  if (receiving>=2) { res.sendStatus(503); return; }
  receiving++;
  let released=false;
  const deadline=setTimeout(()=>res.destroy(),15000);
  const release=()=>{if(!released){receiving--;released=true;clearTimeout(deadline);}};
  res.once("close",release);res.once("finish",release);
  next();
}, rawBody({type:["image/jpeg","image/png","image/webp"],limit:MAX,inflate:false}), async(req,res)=>{
  if (!Buffer.isBuffer(req.body) || !req.body.length || req.body.length>MAX) { res.sendStatus(400);return; }
  // One immutable object per ticket, including races/retries.
  try {
    await db.transaction(async tx=>{
      const [ticket]=await tx.select().from(avatarUploads).where(and(eq(avatarUploads.id,req.params.id),eq(avatarUploads.playerId,res.locals.arenaPlayer.id))).for("update");
      if(!ticket || Date.now()-ticket.createdAt.getTime()>600000)throw new Error("Expired ticket");
      const [owner]=await tx.select().from(arenaPlayers).where(eq(arenaPlayers.id,res.locals.arenaPlayer.id));
      if(owner!.tokenHash!==res.locals.arenaPlayer.tokenHash)throw new Error("Player retired");
      await stagingFile(req.params.id).save(req.body,{resumable:false,contentType:req.get("content-type"),preconditionOpts:{ifGenerationMatch:0}});
    });
    res.sendStatus(204);
  } catch { res.status(409).json({error:"Upload already used or unavailable. Request a new upload."}); }
});
router.post("/multiplayer/avatar/commit", async (req, res) => {
  const parsed = CommitAvatarBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid avatar request." }); return; }
  const { uploadId, shared } = parsed.data;
  const owner = res.locals.arenaPlayer.id;
  const [upload] = await db.select().from(avatarUploads).where(and(eq(avatarUploads.id, uploadId), eq(avatarUploads.playerId, owner)));
  if (!upload || Date.now() - upload.createdAt.getTime() > 600000) { res.status(400).json({ error: "Upload expired or belongs to another player. Choose the image again." }); return; }
  if (decoding >= 2) { res.status(503).json({error:"Photo processing is busy. Your old avatar is unchanged. Retry shortly."}); return; }
  decoding++;
  try {
    const raw = await storage.getObjectEntityFile(upload.objectPath);
    const [meta] = await raw.getMetadata();
    if (Number(meta.size) > MAX) throw new Error("oversize");
    // Pin the generation checked above: a still-valid PUT must not replace
    // the object between size validation and decoding.
    const [bytes] = await raw.bucket.file(raw.name, { generation: meta.generation }).download();
    if (bytes.length > MAX) throw new Error("oversize");
    const pipeline = sharp(bytes, { limitInputPixels: 16000000, animated: false });
    const info = await pipeline.metadata();
    if (!["jpeg", "png", "webp"].includes(info.format ?? "") || (info.pages ?? 1) > 1) throw new Error("format");
    // Re-encode strips metadata and executable/polyglot content. Never serve originals.
    const clean = await pipeline.rotate().resize(512,512,{fit:"cover"}).jpeg({quality:85}).toBuffer();
    const id = randomUUID();
    await outputFile(id).save(clean,{ contentType: "image/jpeg", resumable: false });
    const previous = await db.transaction(async tx => {
      const [p] = await tx.select().from(arenaPlayers).where(eq(arenaPlayers.id, owner)).for("update");
      if(p!.tokenHash!==res.locals.arenaPlayer.tokenHash)throw new Error("Player retired");
      const consumed = await tx.delete(avatarUploads).where(and(eq(avatarUploads.id, uploadId), eq(avatarUploads.playerId, owner))).returning();
      if (!consumed.length) throw new Error("Upload already used");
      await tx.update(arenaPlayers).set({avatarId:id, avatarShared:shared}).where(eq(arenaPlayers.id, owner));
      return p!.avatarId;
    });
    updatePeers(owner,id,shared);
    await raw.delete().catch(() => {});
    if (previous) await outputFile(previous).delete().catch(() => {});
    res.json({ id, shared });
  } catch { res.status(400).json({error:"The image could not be validated or saved. Your previous avatar is unchanged; choose a valid image and retry."}); }
  finally { decoding--; }
});
router.patch("/multiplayer/avatar", async (req, res) => {
  if (!ShareAvatarBody.safeParse(req.body).success) { res.status(400).json({error:"Choose whether to share this photo."}); return; }
  const p = res.locals.arenaPlayer;
  const [updated] = await db.update(arenaPlayers).set({avatarShared:req.body.shared}).where(and(eq(arenaPlayers.id,p.id),eq(arenaPlayers.tokenHash,p.tokenHash))).returning();
  if(!updated){res.sendStatus(401);return;}
  updatePeers(p.id,updated!.avatarId,req.body.shared);
  res.json({id:updated!.avatarId,shared:req.body.shared});
});
router.post("/multiplayer/avatar/retire", async(_req,res)=>{
  const p=res.locals.arenaPlayer;
  const previous=await db.transaction(async tx=>{
    const [current]=await tx.select().from(arenaPlayers).where(eq(arenaPlayers.id,p.id)).for("update");
    await tx.update(arenaPlayers).set({avatarId:null,avatarShared:false,tokenHash:randomUUID()}).where(eq(arenaPlayers.id,p.id));
    // Keep original staging timestamps: legacy signed URLs must expire before
    // the independent janitor removes their tracked objects.
    return current!.avatarId;
  });
  updatePeers(p.id,null,false);
  if(previous)await outputFile(previous).delete().catch(()=>{});
  res.sendStatus(204);
});
router.delete("/multiplayer/avatar", async (_req,res) => {
  const p=res.locals.arenaPlayer;
  const removedId = await db.transaction(async tx => {
    const [current] = await tx.select().from(arenaPlayers).where(eq(arenaPlayers.id,p.id)).for("update");
    await tx.update(arenaPlayers).set({avatarId:null,avatarShared:false}).where(eq(arenaPlayers.id,p.id));
    return current!.avatarId;
  });
  updatePeers(p.id,null,false);
  if(removedId)await outputFile(removedId).delete().catch(()=>{});
  res.sendStatus(204);
});
export default router;
