import { Router } from "express";
import {
  getAllEvents,
  getEventBySlug,
  getEventsByDestination,
  getEventCategories,
  bookEvent,
  getMyEventBookings,
  cancelEventBooking,
  createEvent,
  updateEvent,
  deleteEvent,
  getAllEventsAdmin,
  getAllEventBookingsAdmin,
  updateEventBookingStatus,
  initiateEventPayment,
  handleEventPaymentNotification,
} from "../controllers/eventController";
import { authenticate, requireRole } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

// ── Public routes ────────────────────────────────────────────────
router.get("/", getAllEvents);
router.get("/categories", getEventCategories);
router.get("/slug/:slug", getEventBySlug);
router.get("/destination/:destinationId", getEventsByDestination);

// ── Authenticated user routes ───────────────────────────────────
router.post("/book", authenticate, bookEvent);
router.get("/my-bookings", authenticate, getMyEventBookings);
router.put("/my-bookings/:id/cancel", authenticate, cancelEventBooking);

// ===== NEW: Event payment routes =====
router.post("/payment/initiate", authenticate, initiateEventPayment);
router.post("/payment/notify", handleEventPaymentNotification);

// ── Admin routes ─────────────────────────────────────────────────
router.get(
  "/admin/all",
  authenticate,
  requireRole(["ADMIN"]),
  getAllEventsAdmin,
);
router.post(
  "/admin",
  authenticate,
  requireRole(["ADMIN"]),
  upload.array("images", 10),
  createEvent,
);
router.put(
  "/admin/:id",
  authenticate,
  requireRole(["ADMIN"]),
  upload.array("images", 10),
  updateEvent,
);
router.delete("/admin/:id", authenticate, requireRole(["ADMIN"]), deleteEvent);

router.get(
  "/admin/bookings",
  authenticate,
  requireRole(["ADMIN"]),
  getAllEventBookingsAdmin,
);
router.put(
  "/admin/bookings/:id/status",
  authenticate,
  requireRole(["ADMIN"]),
  updateEventBookingStatus,
);

export default router;
