import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import matchmakingRouter from "./matchmaking.js";
import partyRouter from "./party.js";
import stripeRouter from "./stripe.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(matchmakingRouter);
router.use(partyRouter);
router.use(stripeRouter);

export default router;
