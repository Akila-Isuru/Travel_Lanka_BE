import { Request, Response } from "express";
import BookingModel from "../models/bookingModel";
import DestinationModel from "../models/destinationModel";
import { AuthRequest } from "../middleware/auth";
import StayModel from "../models/stayModel";

const calcNights = (checkIn: Date, checkOut: Date): number => {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

export const createBooking = async (req: AuthRequest, res: Response) => {
  const { destination, stayId, checkIn, checkOut, guests, specialRequests } =
    req.body;

  try {
    const nights = calcNights(new Date(checkIn), new Date(checkOut));
    if (nights < 1) {
      return res
        .status(400)
        .json({ message: "Check-out must be after check-in." });
    }

    let totalPriceCalculated = 0;
    let bookingDestination = null;

    if (destination) {
      const dest = await DestinationModel.findById(destination);
      if (!dest) {
        return res.status(404).json({ message: "Destination not found" });
      }
      totalPriceCalculated += nights * dest.pricePerNight * guests;
      bookingDestination = destination;
    }

    if (stayId) {
      const stay = await StayModel.findById(stayId);
      if (!stay) {
        return res.status(404).json({ message: "Selected stay not found" });
      }

      if (
        bookingDestination &&
        stay.destinationId.toString() !== bookingDestination.toString()
      ) {
        return res.status(400).json({
          message: "Selected stay does not belong to this destination",
        });
      }
      totalPriceCalculated += nights * stay.pricePerNight * guests;
    }

    if (totalPriceCalculated === 0) {
      return res
        .status(400)
        .json({ message: "No valid destination or stay selected." });
    }

    const newBooking = new BookingModel({
      user: req.user.sub,
      destination: bookingDestination,
      stayId: stayId || null,
      checkIn,
      checkOut,
      guests,
      specialRequests,
      totalPrice: totalPriceCalculated,
      paymentAmount: totalPriceCalculated,
      itineraryId: req.body.itineraryId || null,
    });

    const saved = await newBooking.save();

    if (bookingDestination) {
      await saved.populate(
        "destination",
        "name slug location images pricePerNight",
      );
    }

    if (stayId) {
      await saved.populate(
        "stayId",
        "name slug pricePerNight images location address amenities contactPhone",
      );
    }

    res.status(201).json({ message: "Booking created!", data: saved });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create booking" });
  }
};

export const getMyBookings = async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await BookingModel.find({ user: req.user.sub })
      .populate("destination", "name slug location images pricePerNight")
      .populate("stayId", "name slug pricePerNight images location") // ✅ FIXED: Added slug field
      .sort({ createdAt: -1 });
    res.status(200).json({ data: bookings });
  } catch (error) {
    res.status(500).json({ message: "Failed to get bookings" });
  }
};

export const getBookingById = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await BookingModel.findOne({
      _id: req.params.id,
      user: req.user.sub,
    })
      .populate(
        "destination",
        "name slug location images pricePerNight description",
      )
      .populate(
        "stayId",
        "name slug pricePerNight images location address amenities contactPhone",
      ); // ✅ FIXED: Added slug field

    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.status(200).json({ data: booking });
  } catch (error) {
    res.status(500).json({ message: "Failed to get booking" });
  }
};

export const cancelBooking = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await BookingModel.findOne({
      _id: req.params.id,
      user: req.user.sub,
    });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status === "cancelled")
      return res.status(400).json({ message: "Booking already cancelled" });

    booking.status = "cancelled";
    await booking.save();
    res.status(200).json({ message: "Booking cancelled", data: booking });
  } catch (error) {
    res.status(500).json({ message: "Failed to cancel booking" });
  }
};

export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await BookingModel.find()
      .populate("destination", "name slug location images pricePerNight")
      .populate("stayId", "name slug pricePerNight images location") // ✅ FIXED: Added slug field
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json({ data: bookings });
  } catch (error) {
    res.status(500).json({ message: "Failed to get bookings" });
  }
};

export const updateBookingStatus = async (req: Request, res: Response) => {
  const { status } = req.body;
  const validStatuses = ["pending", "confirmed", "cancelled"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  try {
    const booking = await BookingModel.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    )
      .populate("destination", "name slug location")
      .populate("stayId", "name slug pricePerNight")
      .populate("user", "name email");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.status(200).json({ message: "Status updated", data: booking });
  } catch (error) {
    res.status(500).json({ message: "Failed to update booking status" });
  }
};
