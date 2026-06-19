import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { upload } from "../middleware/upload";
import {
  getStaysByDestination,
  getStayBySlug,
  createStay,
  updateStay,
  deleteStay,
  getAllStaysAdmin,
} from "../controllers/stayController";

const router = Router();

// Public
router.get("/destination/:destinationId", getStaysByDestination);
router.get("/slug/:slug", getStayBySlug);

// Admin only
router.post(
  "/",
  authenticate,
  requireRole(["ADMIN"]),
  upload.array("images", 5),
  createStay,
);
router.put(
  "/:id",
  authenticate,
  requireRole(["ADMIN"]),
  upload.array("images", 5),
  updateStay,
);
router.delete("/:id", authenticate, requireRole(["ADMIN"]), deleteStay);

router.get(
  "/admin/all",
  authenticate,
  requireRole(["ADMIN"]),
  getAllStaysAdmin,
);

export default router;
