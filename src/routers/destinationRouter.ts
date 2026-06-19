import { Router } from "express";
import {
  createDestination,
  getAllDestinations,
  getDestinationBySlug,
  updateDestination,
  deleteDestination,
  getNearbyDestinations,
} from "../controllers/destinationController";
import { authenticate, requireRole } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

router.post(
  "/create",
  authenticate,
  requireRole(["ADMIN"]),
  upload.array("images", 5),
  createDestination,
);

router.put(
  "/:id",
  authenticate,
  requireRole(["ADMIN"]),
  upload.array("images", 5),
  updateDestination,
);

router.delete("/:id", authenticate, requireRole(["ADMIN"]), deleteDestination);
router.get("/", getAllDestinations);
router.get("/slug/:slug", getDestinationBySlug);
router.get("/nearby", getNearbyDestinations);

export default router;
