import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  createItinerary,
  addToItinerary,
  removeFromItinerary,
  updateItineraryDestination,
  getMyItineraries,
  getItineraryById,
  deleteItinerary,
  bookItinerary,
} from "../controllers/itineraryController";    

const router = Router();
router.use(authenticate);

router.post("/", createItinerary);
router.post("/add", addToItinerary);
router.delete("/:itineraryId/dest/:destIndex", removeFromItinerary);
router.put("/:itineraryId/dest/:destIndex", updateItineraryDestination);
router.get("/", getMyItineraries);
router.get("/:id", getItineraryById);
router.delete("/:id", deleteItinerary);
router.post("/:id/book", bookItinerary);

export default router;
