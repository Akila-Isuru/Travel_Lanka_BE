import { Request, Response } from "express";
import ItineraryModel, {
  IItineraryDestination,
} from "../models/itineraryModel";
import DestinationModel from "../models/destinationModel";
import BookingModel from "../models/bookingModel";
import { AuthRequest } from "../middleware/auth";

const calcNights = (checkIn: Date, checkOut: Date): number => {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

const recalculateItineraryTotals = async (itineraryId: string) => {
  const itinerary = await ItineraryModel.findById(itineraryId).populate(
    "destinations.destinationId",
  );
  if (!itinerary) return;
  let totalPrice = 0;
  let totalNights = 0;
  for (const item of itinerary.destinations) {
    const dest = item.destinationId as any;
    const nights = calcNights(item.checkIn, item.checkOut);
    totalNights += nights;
    totalPrice += nights * dest.pricePerNight * item.guests;
  }
  itinerary.totalPrice = totalPrice;
  itinerary.totalNights = totalNights;
  await itinerary.save();
};

export const createItinerary = async (req: AuthRequest, res: Response) => {
  const {
    name,
    destinationId,
    checkIn,
    checkOut,
    guests,
    transportMode,
    specialRequests,
  } = req.body;
  try {
    const dest = await DestinationModel.findById(destinationId);
    if (!dest)
      return res.status(404).json({ message: "Destination not found" });

    const itinerary = new ItineraryModel({
      user: req.user.sub,
      name: name || `Trip to ${dest.name}`,
      destinations: [
        {
          destinationId,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          guests: Number(guests),
          transportMode: transportMode || "car",
          specialRequests: specialRequests || "",
        },
      ],
    });
    await recalculateItineraryTotals(itinerary._id.toString());
    const saved = await itinerary.save();
    res.status(201).json({ message: "Itinerary created", data: saved });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create itinerary" });
  }
};

export const addToItinerary = async (req: AuthRequest, res: Response) => {
  const {
    itineraryId,
    destinationId,
    checkIn,
    checkOut,
    guests,
    transportMode,
    specialRequests,
  } = req.body;
  try {
    const itinerary = await ItineraryModel.findOne({
      _id: itineraryId,
      user: req.user.sub,
    });
    if (!itinerary)
      return res.status(404).json({ message: "Itinerary not found" });
    if (itinerary.status !== "draft")
      return res
        .status(400)
        .json({ message: "Cannot modify booked itinerary" });

    const dest = await DestinationModel.findById(destinationId);
    if (!dest)
      return res.status(404).json({ message: "Destination not found" });

    itinerary.destinations.push({
      destinationId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guests: Number(guests),
      transportMode: transportMode || "car",
      specialRequests: specialRequests || "",
    });
    await recalculateItineraryTotals(itinerary._id.toString());
    await itinerary.save();
    res.status(200).json({ message: "Destination added", data: itinerary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add destination" });
  }
};

export const removeFromItinerary = async (req: AuthRequest, res: Response) => {
  const { itineraryId, destIndex } = req.params;
  try {
    const itinerary = await ItineraryModel.findOne({
      _id: itineraryId,
      user: req.user.sub,
    });
    if (!itinerary)
      return res.status(404).json({ message: "Itinerary not found" });
    if (itinerary.status !== "draft")
      return res
        .status(400)
        .json({ message: "Cannot modify booked itinerary" });

    const index = parseInt(destIndex);
    if (isNaN(index) || index < 0 || index >= itinerary.destinations.length) {
      return res.status(400).json({ message: "Invalid destination index" });
    }
    itinerary.destinations.splice(index, 1);
    await recalculateItineraryTotals(itinerary._id.toString());
    await itinerary.save();
    res.status(200).json({ message: "Destination removed", data: itinerary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to remove destination" });
  }
};

export const updateItineraryDestination = async (
  req: AuthRequest,
  res: Response,
) => {
  const { itineraryId, destIndex } = req.params;
  const { checkIn, checkOut, guests, transportMode, specialRequests } =
    req.body;
  try {
    const itinerary = await ItineraryModel.findOne({
      _id: itineraryId,
      user: req.user.sub,
    });
    if (!itinerary)
      return res.status(404).json({ message: "Itinerary not found" });
    if (itinerary.status !== "draft")
      return res
        .status(400)
        .json({ message: "Cannot modify booked itinerary" });

    const index = parseInt(destIndex);
    if (isNaN(index) || index < 0 || index >= itinerary.destinations.length) {
      return res.status(400).json({ message: "Invalid destination index" });
    }
    const destItem = itinerary.destinations[index];
    if (checkIn) destItem.checkIn = new Date(checkIn);
    if (checkOut) destItem.checkOut = new Date(checkOut);
    if (guests) destItem.guests = Number(guests);
    if (transportMode) destItem.transportMode = transportMode;
    if (specialRequests !== undefined)
      destItem.specialRequests = specialRequests;
    await recalculateItineraryTotals(itinerary._id.toString());
    await itinerary.save();
    res.status(200).json({ message: "Destination updated", data: itinerary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update destination" });
  }
};

export const getMyItineraries = async (req: AuthRequest, res: Response) => {
  try {
    const itineraries = await ItineraryModel.find({ user: req.user.sub })
      .populate(
        "destinations.destinationId",
        "name slug location images pricePerNight",
      )
      .sort({ updatedAt: -1 });
    res.status(200).json({ data: itineraries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch itineraries" });
  }
};

export const getItineraryById = async (req: AuthRequest, res: Response) => {
  try {
    const itinerary = await ItineraryModel.findOne({
      _id: req.params.id,
      user: req.user.sub,
    }).populate(
      "destinations.destinationId",
      "name slug location images pricePerNight coordinates",
    );
    if (!itinerary)
      return res.status(404).json({ message: "Itinerary not found" });
    res.status(200).json({ data: itinerary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch itinerary" });
  }
};

export const deleteItinerary = async (req: AuthRequest, res: Response) => {
  try {
    const itinerary = await ItineraryModel.findOne({
      _id: req.params.id,
      user: req.user.sub,
    });
    if (!itinerary)
      return res.status(404).json({ message: "Itinerary not found" });
    if (itinerary.status !== "draft")
      return res
        .status(400)
        .json({ message: "Cannot delete booked itinerary" });
    await itinerary.deleteOne();
    res.status(200).json({ message: "Itinerary deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete itinerary" });
  }
};

export const bookItinerary = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const itinerary = await ItineraryModel.findOne({
      _id: id,
      user: req.user.sub,
    }).populate("destinations.destinationId");
    if (!itinerary)
      return res.status(404).json({ message: "Itinerary not found" });
    if (itinerary.status !== "draft")
      return res.status(400).json({ message: "Itinerary already booked" });

    const createdBookings = [];
    for (const destItem of itinerary.destinations) {
      const dest = destItem.destinationId as any;
      const nights = calcNights(destItem.checkIn, destItem.checkOut);
      const totalPrice = nights * dest.pricePerNight * destItem.guests;

      const booking = new BookingModel({
        user: req.user.sub,
        destination: destItem.destinationId,
        checkIn: destItem.checkIn,
        checkOut: destItem.checkOut,
        guests: destItem.guests,
        totalPrice,
        specialRequests: destItem.specialRequests,
        paymentStatus: "pending",
        paymentAmount: totalPrice,
        itineraryId: itinerary._id,
      });
      await booking.save();
      createdBookings.push(booking);
    }

    itinerary.status = "booked";
    await itinerary.save();

    res.status(200).json({
      message: "All destinations booked successfully",
      data: { itinerary, bookings: createdBookings },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to book itinerary" });
  }
};
