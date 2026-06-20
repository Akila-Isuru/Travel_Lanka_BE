import { Router } from "express";
import {
  createReview,
  getReviewsForTarget,
  getAverageRating,
  deleteReview,
} from "../controllers/reviewController";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

router.get("/:targetType/:targetId", getReviewsForTarget);

router.get("/:targetType/:targetId/rating", getAverageRating);

router.post("/", authenticate, createReview);

router.delete("/:reviewId", authenticate, deleteReview);

export default router;
