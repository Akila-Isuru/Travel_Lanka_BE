// src/routers/bookingRouter.ts
import { Router } from "express";
import {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
  updateBookingStatus,
} from "../controllers/bookingController";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", createBooking);
router.get("/my-bookings", getMyBookings);
router.get("/:id", getBookingById);
router.put("/:id/cancel", cancelBooking);

router.get("/admin/all", requireRole(["ADMIN"]), getAllBookings);
router.put("/admin/:id/status", requireRole(["ADMIN"]), updateBookingStatus);

export default router;
