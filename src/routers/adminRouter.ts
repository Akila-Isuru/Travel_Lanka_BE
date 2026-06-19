import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import {
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllReviews,
  adminDeleteReview,
} from "../controllers/adminController";

const router = Router();

router.use(authenticate, requireRole(["ADMIN"]));

router.get("/users", getAllUsers);
router.put("/users/:userId/role", updateUserRole);
router.delete("/users/:userId", deleteUser);

router.get("/reviews", getAllReviews);
router.delete("/reviews/:reviewId", adminDeleteReview);

export default router;
