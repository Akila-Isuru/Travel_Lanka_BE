import { Request, Response } from "express";
import AgentModel from "../models/agentModel";
import AgentBookingModel from "../models/agentBookingModel";
import UserModel from "../models/userModel";
import { AuthRequest } from "../middleware/auth";
import cloudinary from "../config/cloudinary";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calcDays = (start: Date, end: Date): number =>
  Math.max(
    1,
    Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000),
  );

/**
 * Build a WhatsApp wa.me URL with pre-filled booking message.
 * No API key needed — opens WhatsApp on user's device.
 */
const buildWhatsAppUrl = (
  agentWhatsapp: string,
  data: {
    agentName: string;
    userName: string;
    userPhone: string;
    userEmail: string;
    destinationName: string;
    startDate: string;
    endDate: string;
    guests: number;
    totalDays: number;
    agentBookingId: string;
  },
): string => {
  const msg = [
    `🌴 New Booking - LankaTravel`,
    ``,
    `Hi ${data.agentName}! You have a new guide booking.`,
    ``,
    `👤 Traveler: ${data.userName}`,
    `📞 Contact: ${data.userPhone || "Not provided"}`,
    `📧 Email: ${data.userEmail}`,
    ``,
    `📍 Destination: ${data.destinationName}`,
    `📅 Start: ${new Date(data.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
    `📅 End: ${new Date(data.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
    `🌙 Days: ${data.totalDays}`,
    `👥 Guests: ${data.guests}`,
    ``,
    `Booking Ref: #AG${data.agentBookingId.slice(-6).toUpperCase()}`,
    ``,
    `Please confirm availability and contact the traveler directly.`,
    ``,
    `LankaTravel 🇱🇰`,
  ].join("\n");

  return `https://wa.me/${agentWhatsapp}?text=${encodeURIComponent(msg)}`;
};

// ─── Public: Get agents for a destination (with availability filter) ──────────

export const getAgentsByDestination = async (req: Request, res: Response) => {
  try {
    const { destinationId } = req.params;
    const { startDate, endDate } = req.query;

    // Base query: active agents covering this destination
    const agents = await AgentModel.find({
      destinations: destinationId,
      status: "active",
    })
      .populate("destinations", "name slug")
      .lean();

    if (!startDate || !endDate) {
      return res.status(200).json({ success: true, data: agents });
    }

    // Filter out agents who are already booked during the requested dates
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const busyAgentIds = await AgentBookingModel.distinct("agent", {
      status: { $in: ["pending", "confirmed"] },
      $or: [
        { startDate: { $lt: end }, endDate: { $gt: start } }, // overlap
      ],
    });

    const busySet = new Set(busyAgentIds.map((id: any) => id.toString()));
    const availableAgents = agents.filter(
      (a: any) => !busySet.has(a._id.toString()),
    );

    res.status(200).json({ success: true, data: availableAgents });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch agents" });
  }
};

// ─── Public: Get agent by slug ────────────────────────────────────────────────

export const getAgentBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const agent = await AgentModel.findOne({ slug }).populate(
      "destinations",
      "name slug location images",
    );
    if (!agent) return res.status(404).json({ message: "Agent not found" });
    res.status(200).json({ success: true, data: agent });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch agent" });
  }
};

// ─── Public: Get recommended agent for destination + dates ───────────────────

export const getRecommendedAgent = async (req: Request, res: Response) => {
  try {
    const { destinationId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "startDate and endDate required" });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Find busy agents for these dates
    const busyAgentIds = await AgentBookingModel.distinct("agent", {
      status: { $in: ["pending", "confirmed"] },
      $or: [{ startDate: { $lt: end }, endDate: { $gt: start } }],
    });

    // Get best available agent: highest rating, covers this destination
    const recommended = await AgentModel.findOne({
      destinations: destinationId,
      status: "active",
      _id: { $nin: busyAgentIds },
    })
      .sort({ rating: -1, reviewCount: -1 })
      .populate("destinations", "name slug");

    if (!recommended) {
      return res.status(200).json({ success: true, data: null });
    }

    res.status(200).json({ success: true, data: recommended });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch recommended agent" });
  }
};

// ─── Authenticated: Book an agent + get WhatsApp URL ─────────────────────────

export const bookAgent = async (req: AuthRequest, res: Response) => {
  const {
    agentId,
    destinationId,
    startDate,
    endDate,
    guests,
    userPhone,
    specialRequests,
    bookingId, // optional: link to main booking
  } = req.body;

  try {
    const agent = await AgentModel.findById(agentId);
    if (!agent) return res.status(404).json({ message: "Agent not found" });
    if (agent.status !== "active")
      return res.status(400).json({ message: "Agent is not available" });

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Double-check availability
    const conflict = await AgentBookingModel.findOne({
      agent: agentId,
      status: { $in: ["pending", "confirmed"] },
      $or: [{ startDate: { $lt: end }, endDate: { $gt: start } }],
    });

    if (conflict) {
      return res.status(409).json({
        message: "This agent is already booked for the selected dates.",
      });
    }

    const totalDays = calcDays(start, end);
    const agentFee = totalDays * agent.pricePerDay;

    // Get user info for the WhatsApp message
    const user = await UserModel.findById(req.user.sub);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Save phone to user profile if they provided it and don't have one
    if (userPhone && !user.phone) {
      user.phone = userPhone;
      await user.save();
    }

    // Create agent booking
    const agentBooking = new AgentBookingModel({
      agent: agentId,
      user: req.user.sub,
      booking: bookingId || null,
      destination: destinationId,
      startDate: start,
      endDate: end,
      totalDays,
      agentFee,
      userPhone: userPhone || user.phone || "",
      userEmail: user.email,
      userName: user.name,
      specialRequests: specialRequests || "",
      status: "pending",
      whatsappSent: false,
    });

    await agentBooking.save();

    // Populate for response
    await agentBooking.populate(
      "agent",
      "name whatsappNumber pricePerDay photo",
    );
    await agentBooking.populate("destination", "name location");

    // Build WhatsApp URL — frontend will open this
    const whatsappUrl = buildWhatsAppUrl(agent.whatsappNumber, {
      agentName: agent.name,
      userName: user.name,
      userPhone: userPhone || user.phone || "Not provided",
      userEmail: user.email,
      destinationName: (agentBooking.destination as any)?.name || "Sri Lanka",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      guests: Number(guests) || 1,
      totalDays,
      agentBookingId: agentBooking._id.toString(),
    });

    // Mark whatsapp as sent (user will click to open)
    agentBooking.whatsappSent = true;
    await agentBooking.save();

    res.status(201).json({
      message: "Agent booked successfully!",
      data: {
        agentBooking,
        whatsappUrl,
        agentFee,
        totalDays,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to book agent" });
  }
};

// ─── Authenticated: Get my agent bookings ────────────────────────────────────

export const getMyAgentBookings = async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await AgentBookingModel.find({ user: req.user.sub })
      .populate("agent", "name slug photo whatsappNumber pricePerDay rating")
      .populate("destination", "name slug location images")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch your agent bookings" });
  }
};

// ─── Authenticated: Cancel agent booking ─────────────────────────────────────

export const cancelAgentBooking = async (req: AuthRequest, res: Response) => {
  try {
    const agentBooking = await AgentBookingModel.findOne({
      _id: req.params.id,
      user: req.user.sub,
    });
    if (!agentBooking)
      return res.status(404).json({ message: "Agent booking not found" });
    if (agentBooking.status === "cancelled")
      return res.status(400).json({ message: "Already cancelled" });

    agentBooking.status = "cancelled";
    await agentBooking.save();
    res
      .status(200)
      .json({ message: "Agent booking cancelled", data: agentBooking });
  } catch (error) {
    res.status(500).json({ message: "Failed to cancel agent booking" });
  }
};

// ─── Admin: Get all agents ────────────────────────────────────────────────────

export const getAllAgentsAdmin = async (req: Request, res: Response) => {
  try {
    const agents = await AgentModel.find()
      .populate("destinations", "name slug")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: agents });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch agents" });
  }
};

// ─── Admin: Create agent ──────────────────────────────────────────────────────

export const createAgent = async (req: AuthRequest, res: Response) => {
  const {
    name,
    slug,
    bio,
    specialties,
    languages,
    whatsappNumber,
    email,
    phone,
    pricePerDay,
    destinations,
    yearsExperience,
    status,
  } = req.body;

  try {
    let photoUrl = "";
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      const file = files[0];
      const b64 = Buffer.from(file.buffer).toString("base64");
      const dataURI = "data:" + file.mimetype + ";base64," + b64;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "agents",
      });
      photoUrl = result.secure_url;
    }

    const parseArr = (val: any): string[] => {
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

    const parseIds = (val: any): string[] => {
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

    const agent = new AgentModel({
      name,
      slug,
      bio,
      photo: photoUrl,
      specialties: parseArr(specialties),
      languages: parseArr(languages),
      whatsappNumber: whatsappNumber.replace(/\D/g, ""), // strip non-digits
      email: email || "",
      phone: phone || "",
      pricePerDay: Number(pricePerDay),
      destinations: parseIds(destinations),
      yearsExperience: Number(yearsExperience) || 1,
      status: status || "active",
    });

    await agent.save();
    await agent.populate("destinations", "name slug");
    res.status(201).json({ message: "Agent created", data: agent });
  } catch (error: any) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Slug already exists" });
    }
    res.status(500).json({ message: "Failed to create agent" });
  }
};

// ─── Admin: Update agent ──────────────────────────────────────────────────────

export const updateAgent = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const agent = await AgentModel.findById(id);
    if (!agent) return res.status(404).json({ message: "Agent not found" });

    const fields = [
      "name",
      "slug",
      "bio",
      "whatsappNumber",
      "email",
      "phone",
      "status",
      "yearsExperience",
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) (agent as any)[f] = req.body[f];
    });

    if (req.body.pricePerDay !== undefined)
      agent.pricePerDay = Number(req.body.pricePerDay);

    const parseArr = (val: any): string[] => {
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

    if (req.body.specialties !== undefined)
      agent.specialties = parseArr(req.body.specialties);
    if (req.body.languages !== undefined)
      agent.languages = parseArr(req.body.languages);
    if (req.body.destinations !== undefined)
      agent.destinations = parseArr(req.body.destinations) as any;

    // Handle new photo
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      const file = files[0];
      const b64 = Buffer.from(file.buffer).toString("base64");
      const dataURI = "data:" + file.mimetype + ";base64," + b64;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "agents",
      });
      agent.photo = result.secure_url;
    }

    if (agent.whatsappNumber)
      agent.whatsappNumber = agent.whatsappNumber.replace(/\D/g, "");

    await agent.save();
    await agent.populate("destinations", "name slug");
    res.status(200).json({ message: "Agent updated", data: agent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update agent" });
  }
};

// ─── Admin: Delete agent ──────────────────────────────────────────────────────

export const deleteAgent = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await AgentModel.findByIdAndDelete(id);
    res.status(200).json({ message: "Agent deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete agent" });
  }
};

// ─── Admin: Get all agent bookings ────────────────────────────────────────────

export const getAllAgentBookingsAdmin = async (req: Request, res: Response) => {
  try {
    const bookings = await AgentBookingModel.find()
      .populate("agent", "name slug photo whatsappNumber")
      .populate("user", "name email phone")
      .populate("destination", "name slug location")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch agent bookings" });
  }
};

// ─── Admin: Update agent booking status ──────────────────────────────────────

export const updateAgentBookingStatus = async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!["pending", "confirmed", "cancelled"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  try {
    const booking = await AgentBookingModel.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    )
      .populate("agent", "name whatsappNumber")
      .populate("user", "name email");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.status(200).json({ message: "Status updated", data: booking });
  } catch (error) {
    res.status(500).json({ message: "Failed to update status" });
  }
};
