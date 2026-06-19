// backend/src/routers/aiRouter.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { planTripWithAI } from "../controllers/aiController";

const router = Router();
router.use(authenticate); 

router.post("/plan-trip", planTripWithAI);

export default router;
