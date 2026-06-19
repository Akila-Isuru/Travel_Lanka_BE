import mongoose, { Schema, Document, model } from "mongoose";

export interface IAgentBooking extends Document {
  agent: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId; // ref to main BookingModel
  destination: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  agentFee: number;
  userPhone: string; // collected at booking time for WhatsApp
  userEmail: string;
  userName: string;
  status: "pending" | "confirmed" | "cancelled";
  whatsappSent: boolean;
  specialRequests: string;
  createdAt: Date;
  updatedAt: Date;
}

const agentBookingSchema = new Schema<IAgentBooking>(
  {
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingModel",
      default: null,
    },
    destination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DestinationModel",
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true, min: 1 },
    agentFee: { type: Number, required: true },
    userPhone: { type: String, default: "" },
    userEmail: { type: String, default: "" },
    userName: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    whatsappSent: { type: Boolean, default: false },
    specialRequests: { type: String, default: "" },
  },
  { timestamps: true },
);

// Index for fast availability checks
agentBookingSchema.index({ agent: 1, startDate: 1, endDate: 1 });
agentBookingSchema.index({ user: 1 });

const AgentBookingModel = model<IAgentBooking>(
  "AgentBooking",
  agentBookingSchema,
);
export default AgentBookingModel;
