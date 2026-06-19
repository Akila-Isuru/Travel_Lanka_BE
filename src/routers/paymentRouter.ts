import { Router } from "express";
import {
  initiatePayment,
  handleNotification,
  initiateItineraryPayment,
} from "../controllers/paymentController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/initiate", authenticate, initiatePayment);
router.post("/initiate-itinerary", authenticate, initiateItineraryPayment);

router.post("/notify", handleNotification);

export default router;
