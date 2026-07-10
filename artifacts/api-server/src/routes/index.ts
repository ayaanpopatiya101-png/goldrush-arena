import { Router, type IRouter } from "express";
import healthRouter from "./health";
import matchmakingRouter from "./matchmaking";

const router: IRouter = Router();

router.use(healthRouter);
router.use(matchmakingRouter);

export default router;
