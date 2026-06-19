import { Router } from "express";
import {
  createReview,
  getReviewsForDestination,
  deleteReview,
} from "../controllers/reviewController";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

router.get("/destination/:destinationId", getReviewsForDestination);

router.post("/", authenticate, createReview);

router.delete("/:reviewId", authenticate, deleteReview);

export default router;
