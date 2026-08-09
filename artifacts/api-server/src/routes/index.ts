import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import matchmakingRouter from "./matchmaking.js";
import partyRouter from "./party.js";
import stripeRouter from "./stripe.js";
import referralRouter from "./referral.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(matchmakingRouter);
router.use(partyRouter);
router.use(stripeRouter);
router.use(referralRouter);

export default router;
