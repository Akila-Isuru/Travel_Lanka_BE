import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { upload } from "../middleware/upload";
import {
  getAgentsByDestination,
  getAgentBySlug,
  getRecommendedAgent,
  bookAgent,
  getMyAgentBookings,
  cancelAgentBooking,
  getAllAgentsAdmin,
  createAgent,
  updateAgent,
  deleteAgent,
  getAllAgentBookingsAdmin,
  updateAgentBookingStatus,
} from "../controllers/agentController";

const router = Router();

// ── Public routes ──────────────────────────────────────────────────────────────
router.get("/destination/:destinationId", getAgentsByDestination);
router.get("/recommended/:destinationId", getRecommendedAgent);
router.get("/slug/:slug", getAgentBySlug);

// ── Authenticated user routes ─────────────────────────────────────────────────
router.post("/book", authenticate, bookAgent);
router.get("/my-bookings", authenticate, getMyAgentBookings);
router.put("/my-bookings/:id/cancel", authenticate, cancelAgentBooking);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get(
  "/admin/all",
  authenticate,
  requireRole(["ADMIN"]),
  getAllAgentsAdmin,
);
router.post(
  "/admin",
  authenticate,
  requireRole(["ADMIN"]),
  upload.array("photo", 1),
  createAgent,
);
router.put(
  "/admin/:id",
  authenticate,
  requireRole(["ADMIN"]),
  upload.array("photo", 1),
  updateAgent,
);
router.delete("/admin/:id", authenticate, requireRole(["ADMIN"]), deleteAgent);

router.get(
  "/admin/bookings",
  authenticate,
  requireRole(["ADMIN"]),
  getAllAgentBookingsAdmin,
);
router.put(
  "/admin/bookings/:id/status",
  authenticate,
  requireRole(["ADMIN"]),
  updateAgentBookingStatus,
);

export default router;
