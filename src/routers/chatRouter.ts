// backend/src/routers/chatRouter.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { sendMessage } from "../controllers/chatController";

const router = Router();
router.use(authenticate); 

router.post("/send", sendMessage);

export default router;