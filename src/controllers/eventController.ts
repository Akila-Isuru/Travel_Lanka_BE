import { Request, Response } from "express";
import EventModel from "../models/eventModel";
import EventBookingModel from "../models/eventBookingModel";
import { AuthRequest } from "../middleware/auth";
import cloudinary from "../config/cloudinary";
import crypto from "crypto";

// ===== Payment config =====
const MERCHANT_ID = process.env.MERCHANT_ID as string;
const MERCHANT_SECRET = process.env.MERCHANT_SECRET as string;
const SANDBOX = process.env.PAYHERE_SANDBOX === "true";
const FRONTEND_URL = process.env.FRONTEND_URL as string;
const BACKEND_URL = process.env.BACKEND_URL as string;

const generatePayhereHash = (
  merchantId: string,
  orderId: string,
  amount: string,
  currency: string,
  merchantSecret: string,
): string => {
  const amountFormatted = parseFloat(amount).toFixed(2);
  const hashedSecret = crypto
    .createHash("md5")
    .update(merchantSecret)
    .digest("hex")
    .toUpperCase();
  const hashString =
    merchantId + orderId + amountFormatted + currency + hashedSecret;
  const finalHash = crypto
    .createHash("md5")
    .update(hashString)
    .digest("hex")
    .toUpperCase();
  return finalHash;
};

// ─── HELPERS ──────────────────────────────────────────────────────

const uploadImages = async (
  files: Express.Multer.File[],
): Promise<string[]> => {
  const urls: string[] = [];
  for (const file of files) {
    const b64 = Buffer.from(file.buffer).toString("base64");
    const dataURI = "data:" + file.mimetype + ";base64," + b64;
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "events",
    });
    urls.push(result.secure_url);
  }
  return urls;
};

// ─── PUBLIC: Get all events ──────────────────────────────────────

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const {
      category,
      location,
      startDate,
      endDate,
      status,
      limit = 20,
      page = 1,
      search,
      featured,
    } = req.query;

    const query: any = { isPublished: true };

    if (category) query.category = category;
    if (location) query.location = { $regex: location, $options: "i" };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }
    if (status) query.status = status;
    if (featured === "true") {
      query.ratingsAverage = { $gte: 4 };
    }

    // Date range filter
    if (startDate || endDate) {
      query.$or = [];
      if (startDate && endDate) {
        query.$or.push({
          startDate: { $lte: new Date(endDate as string) },
          endDate: { $gte: new Date(startDate as string) },
        });
      } else if (startDate) {
        query.$or.push({ endDate: { $gte: new Date(startDate as string) } });
      } else if (endDate) {
        query.$or.push({ startDate: { $lte: new Date(endDate as string) } });
      }
    }

    // Show only upcoming and ongoing by default
    if (!status) {
      query.status = { $in: ["upcoming", "ongoing"] };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [events, total] = await Promise.all([
      EventModel.find(query)
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("destinationIds", "name slug location")
        .populate("agentIds", "name slug photo")
        .lean(),
      EventModel.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: events,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Failed to fetch events" });
  }
};

// ─── PUBLIC: Get event by slug ──────────────────────────────────

export const getEventBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const event = await EventModel.findOne({ slug, isPublished: true })
      .populate("destinationIds", "name slug location images pricePerNight")
      .populate("agentIds", "name slug photo pricePerDay rating");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Increment views
    event.views += 1;
    await event.save();

    res.status(200).json({ success: true, data: event });
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ message: "Failed to fetch event" });
  }
};

// ─── PUBLIC: Get events by destination ──────────────────────────

export const getEventsByDestination = async (req: Request, res: Response) => {
  try {
    const { destinationId } = req.params;
    const { startDate, endDate } = req.query;

    const query: any = {
      destinationIds: destinationId,
      isPublished: true,
      status: { $in: ["upcoming", "ongoing"] },
    };

    if (startDate) {
      query.startDate = { $gte: new Date(startDate as string) };
    }
    if (endDate) {
      query.endDate = { $lte: new Date(endDate as string) };
    }

    const events = await EventModel.find(query)
      .sort({ startDate: 1 })
      .limit(10)
      .lean();

    res.status(200).json({ success: true, data: events });
  } catch (error) {
    console.error("Error fetching events by destination:", error);
    res.status(500).json({ message: "Failed to fetch events" });
  }
};

// ─── PUBLIC: Get event categories ───────────────────────────────

export const getEventCategories = async (req: Request, res: Response) => {
  try {
    const categories = await EventModel.distinct("category", {
      isPublished: true,
    });

    const categoryCounts = await Promise.all(
      categories.map(async (cat) => ({
        category: cat,
        count: await EventModel.countDocuments({
          category: cat,
          isPublished: true,
        }),
      })),
    );

    res.status(200).json({ success: true, data: categoryCounts });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

// ─── AUTHENTICATED: Book event ticket ───────────────────────────

export const bookEvent = async (req: AuthRequest, res: Response) => {
  const { eventId, tickets = 1, specialRequests } = req.body;

  try {
    const event = await EventModel.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.status === "cancelled") {
      return res.status(400).json({ message: "Event has been cancelled" });
    }

    if (event.status === "past") {
      return res.status(400).json({ message: "Event has already passed" });
    }

    const isFullyBooked =
      event.maxCapacity > 0 && event.currentBookings >= event.maxCapacity;
    if (isFullyBooked) {
      return res.status(400).json({ message: "Event is fully booked" });
    }

    if (
      event.maxCapacity > 0 &&
      tickets > event.maxCapacity - event.currentBookings
    ) {
      return res.status(400).json({
        message: `Only ${event.maxCapacity - event.currentBookings} tickets available`,
      });
    }

    const totalPrice = event.isFree ? 0 : event.price * tickets;

    const booking = new EventBookingModel({
      event: eventId,
      user: req.user.sub,
      tickets,
      totalPrice,
      specialRequests: specialRequests || "",
      status: totalPrice === 0 ? "confirmed" : "pending",
      paymentStatus: totalPrice === 0 ? "paid" : "pending",
    });

    await booking.save();

    // Update event bookings count
    event.currentBookings += tickets;
    await event.save();

    await booking.populate("event", "name startDate location price isFree");
    await booking.populate("user", "name email");

    res.status(201).json({
      success: true,
      message:
        totalPrice === 0 ? "Booking confirmed!" : "Booking pending payment",
      data: booking,
    });
  } catch (error) {
    console.error("Error booking event:", error);
    res.status(500).json({ message: "Failed to book event" });
  }
};

// ─── Initiate event payment ──────────────────────────────────────

export const initiateEventPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId } = req.body;
    const booking = await EventBookingModel.findById(bookingId)
      .populate("event", "name price isFree")
      .populate("user", "name email");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Booking has been cancelled" });
    }

    if (booking.paymentStatus === "paid") {
      return res.status(400).json({ message: "Payment already completed" });
    }

    const event = booking.event as any;
    const orderId = `EVENT_${booking._id}`;
    const amount = booking.totalPrice.toFixed(2);
    const currency = "LKR";

    const nameParts = (booking.user as any).name.split(" ");
    const firstName = nameParts[0] || "Guest";
    const lastName = nameParts.slice(1).join(" ") || "User";

    const hash = generatePayhereHash(
      MERCHANT_ID,
      orderId,
      amount,
      currency,
      MERCHANT_SECRET,
    );

    const paymentData = {
      sandbox: SANDBOX,
      merchant_id: MERCHANT_ID,
      return_url: `${FRONTEND_URL}/payment/return`,
      cancel_url: `${FRONTEND_URL}/payment/cancel`,
      notify_url: `${BACKEND_URL}/api/v1/payment/event-notify`,
      order_id: orderId,
      items: `Event: ${event.name} (${booking.tickets} tickets)`,
      amount: amount,
      currency: currency,
      hash: hash,
      first_name: firstName,
      last_name: lastName,
      email: (booking.user as any).email,
      phone: "0771234567",
      address: "Colombo",
      city: "Colombo",
      country: "Sri Lanka",
    };

    console.log("Event Payment Initiation Data:", paymentData);
    res.json(paymentData);
  } catch (error) {
    console.error("Error initiating event payment:", error);
    res.status(500).json({ message: "Error initiating payment" });
  }
};

// ─── Event payment notification webhook ─────────────────────────

export const handleEventPaymentNotification = async (
  req: Request,
  res: Response,
) => {
  console.log("Event Payment Webhook Hit!", req.body);
  try {
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      method,
    } = req.body;

    const generatedHash = crypto
      .createHash("md5")
      .update(
        merchant_id +
          order_id +
          payhere_amount +
          payhere_currency +
          status_code +
          crypto
            .createHash("md5")
            .update(MERCHANT_SECRET)
            .digest("hex")
            .toUpperCase(),
      )
      .digest("hex")
      .toUpperCase();

    if (generatedHash !== md5sig) {
      console.error("Hash mismatch");
      return res.status(400).send("Hash verification failed");
    }

    // Extract booking ID from order_id (remove EVENT_ prefix)
    const bookingId = order_id.replace("EVENT_", "");
    const booking = await EventBookingModel.findById(bookingId);

    if (!booking) {
      console.error("Event booking not found");
      return res.status(404).send("Booking not found");
    }

    if (status_code === "2") {
      // Payment successful
      booking.paymentStatus = "paid";
      booking.paymentId = payment_id;
      booking.paymentMethod = method;
      booking.status = "confirmed";
      await booking.save();
      console.log(`Event booking ${bookingId} confirmed.`);
    } else if (status_code === "-2") {
      // Payment failed
      booking.paymentStatus = "failed";
      await booking.save();
      console.log(`Payment for event booking ${bookingId} failed.`);
    } else if (status_code === "-1") {
      // Payment cancelled
      booking.status = "cancelled";
      booking.paymentStatus = "failed";
      await booking.save();
      console.log(`Event booking ${bookingId} cancelled.`);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing event payment notification:", error);
    res.status(500).send("Error processing notification");
  }
};

// ─── AUTHENTICATED: Get my event bookings ──────────────────────

export const getMyEventBookings = async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await EventBookingModel.find({ user: req.user.sub })
      .populate(
        "event",
        "name slug startDate endDate location images coverImage price isFree",
      )
      .sort({ bookingDate: -1 });

    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
};

// ─── AUTHENTICATED: Cancel event booking ───────────────────────

export const cancelEventBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const booking = await EventBookingModel.findOne({
      _id: id,
      user: req.user.sub,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Already cancelled" });
    }

    // Check if event is still upcoming
    const event = await EventModel.findById(booking.event);
    if (event && event.startDate < new Date()) {
      return res.status(400).json({ message: "Cannot cancel past events" });
    }

    booking.status = "cancelled";
    booking.paymentStatus = "failed";
    await booking.save();

    // Update event bookings count
    if (event) {
      event.currentBookings = Math.max(
        0,
        event.currentBookings - booking.tickets,
      );
      await event.save();
    }

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ message: "Failed to cancel booking" });
  }
};

// ─── ADMIN: Create event ────────────────────────────────────────

export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      slug,
      description,
      category,
      subCategory,
      startDate,
      endDate,
      isRecurring,
      recurringPattern,
      location,
      address,
      organizer,
      organizerEmail,
      organizerPhone,
      website,
      price,
      currency,
      isFree,
      maxCapacity,
      features,
      destinationIds,
      agentIds,
      metaTitle,
      metaDescription,
      metaKeywords,
      status,
      isPublished,
      coordinates,
    } = req.body;

    // Parse coordinates
    let parsedCoordinates;
    if (coordinates) {
      try {
        parsedCoordinates =
          typeof coordinates === "string"
            ? JSON.parse(coordinates)
            : coordinates;
      } catch (e) {
        return res.status(400).json({ message: "Invalid coordinates format" });
      }
    }

    // Upload images
    const files = req.files as Express.Multer.File[];
    let images: string[] = [];
    let coverImage = "";

    if (files && files.length > 0) {
      images = await uploadImages(files);
      coverImage = images[0] || "";
    }

    const event = new EventModel({
      name,
      slug,
      description,
      category,
      subCategory: subCategory || "",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isRecurring: isRecurring === "true" || isRecurring === true,
      recurringPattern: recurringPattern || null,
      location,
      address: address || "",
      coordinates: parsedCoordinates || {
        type: "Point",
        coordinates: [80.7718, 7.8731],
      },
      images,
      coverImage,
      organizer,
      organizerEmail,
      organizerPhone,
      website: website || "",
      price: Number(price) || 0,
      currency: currency || "USD",
      isFree: isFree === "true" || isFree === true || Number(price) === 0,
      maxCapacity: Number(maxCapacity) || 0,
      features: features
        ? typeof features === "string"
          ? features.split(",").map((f: string) => f.trim())
          : features
        : [],
      destinationIds: destinationIds
        ? typeof destinationIds === "string"
          ? destinationIds.split(",").map((id: string) => id.trim())
          : destinationIds
        : [],
      agentIds: agentIds
        ? typeof agentIds === "string"
          ? agentIds.split(",").map((id: string) => id.trim())
          : agentIds
        : [],
      metaTitle: metaTitle || name,
      metaDescription: metaDescription || description.slice(0, 160),
      metaKeywords: metaKeywords
        ? typeof metaKeywords === "string"
          ? metaKeywords.split(",").map((k: string) => k.trim())
          : metaKeywords
        : [],
      status: status || "draft",
      isPublished: isPublished === "true" || isPublished === true,
    });

    await event.save();

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: event,
    });
  } catch (error: any) {
    console.error("Error creating event:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Event slug already exists" });
    }
    res.status(500).json({ message: "Failed to create event" });
  }
};

// ─── ADMIN: Update event ────────────────────────────────────────

export const updateEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const event = await EventModel.findById(id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const updateFields = [
      "name",
      "slug",
      "description",
      "category",
      "subCategory",
      "location",
      "address",
      "organizer",
      "organizerEmail",
      "organizerPhone",
      "website",
      "currency",
      "maxCapacity",
      "metaTitle",
      "metaDescription",
      "status",
    ];

    updateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        (event as any)[field] = req.body[field];
      }
    });

    // Date fields
    if (req.body.startDate) event.startDate = new Date(req.body.startDate);
    if (req.body.endDate) event.endDate = new Date(req.body.endDate);

    // Boolean fields
    if (req.body.isRecurring !== undefined) {
      event.isRecurring =
        req.body.isRecurring === "true" || req.body.isRecurring === true;
    }
    if (req.body.isPublished !== undefined) {
      event.isPublished =
        req.body.isPublished === "true" || req.body.isPublished === true;
    }
    if (req.body.isFree !== undefined) {
      event.isFree = req.body.isFree === "true" || req.body.isFree === true;
    }

    // Numeric fields
    if (req.body.price !== undefined) event.price = Number(req.body.price);
    if (req.body.recurringPattern)
      event.recurringPattern = req.body.recurringPattern;

    // Array fields
    const parseArray = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        if (val.trim().startsWith("[")) {
          try {
            return JSON.parse(val);
          } catch {}
        }
        return val
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
      return [];
    };

    if (req.body.features !== undefined)
      event.features = parseArray(req.body.features);
    if (req.body.destinationIds !== undefined) {
      event.destinationIds = parseArray(req.body.destinationIds) as any;
    }
    if (req.body.agentIds !== undefined) {
      event.agentIds = parseArray(req.body.agentIds) as any;
    }
    if (req.body.metaKeywords !== undefined) {
      event.metaKeywords = parseArray(req.body.metaKeywords);
    }

    // Coordinates
    if (req.body.coordinates) {
      try {
        const parsed =
          typeof req.body.coordinates === "string"
            ? JSON.parse(req.body.coordinates)
            : req.body.coordinates;
        if (parsed?.coordinates) {
          event.coordinates = parsed;
        }
      } catch (e) {
        return res.status(400).json({ message: "Invalid coordinates format" });
      }
    }

    // Upload new images
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      const newImages = await uploadImages(files);
      event.images = [...event.images, ...newImages];
      if (!event.coverImage) {
        event.coverImage = event.images[0] || "";
      }
    }

    // Remove images if specified
    if (req.body.removeImages) {
      const removeList =
        typeof req.body.removeImages === "string"
          ? JSON.parse(req.body.removeImages)
          : req.body.removeImages;
      if (Array.isArray(removeList)) {
        event.images = event.images.filter((img) => !removeList.includes(img));
      }
    }

    await event.save();

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: event,
    });
  } catch (error: any) {
    console.error("Error updating event:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Event slug already exists" });
    }
    res.status(500).json({ message: "Failed to update event" });
  }
};

// ─── ADMIN: Delete event ────────────────────────────────────────

export const deleteEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const event = await EventModel.findByIdAndDelete(id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ message: "Failed to delete event" });
  }
};

// ─── ADMIN: Get all events (including drafts) ──────────────────

export const getAllEventsAdmin = async (req: AuthRequest, res: Response) => {
  try {
    // ===== FIXED: Show ALL events regardless of publish status =====
    const events = await EventModel.find()
      .sort({ createdAt: -1 })
      .populate("destinationIds", "name slug")
      .populate("agentIds", "name slug");

    res.status(200).json({ success: true, data: events });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Failed to fetch events" });
  }
};

// ─── ADMIN: Get all event bookings ──────────────────────────────

export const getAllEventBookingsAdmin = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const bookings = await EventBookingModel.find()
      .populate("event", "name slug startDate location price isFree")
      .populate("user", "name email")
      .sort({ bookingDate: -1 });

    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
};

// ─── ADMIN: Update event booking status ─────────────────────────

export const updateEventBookingStatus = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const booking = await EventBookingModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    ).populate("event", "name");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // If status is confirmed, also update payment status
    if (status === "confirmed") {
      booking.paymentStatus = "paid";
      await booking.save();
    }

    res.status(200).json({
      success: true,
      message: "Booking status updated",
      data: booking,
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ message: "Failed to update booking status" });
  }
};
