import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import partyRouter from "./party.js";
import stripeRouter from "./stripe.js";
import storeOffersRouter from "./storeOffers.js";
import referralRouter from "./referral.js";
import challengeRouter from "./challenge.js";
import multiplayerRouter from "./multiplayer.js";
import avatarsRouter from "./avatars.js";
import cosmeticsRouter from "./cosmetics.js";
import smsRemindersRouter from "./smsReminders.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(smsRemindersRouter);
router.use(avatarsRouter);
router.use(cosmeticsRouter);
router.use(multiplayerRouter);
router.use("/matchmaking", (_req, res) => {
  res.status(410).json({ error: "Legacy local matchmaking retired. Use authenticated multiplayer queue." });
});
router.use(partyRouter);
router.use(stripeRouter);
router.use(storeOffersRouter);
router.use(referralRouter);
router.use(challengeRouter);

export default router;
