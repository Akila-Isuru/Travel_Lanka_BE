import mongoose, { Schema, Document, model } from "mongoose";

export interface IEventBooking extends Document {
  event: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  tickets: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled";
  specialRequests?: string;
  bookingDate: Date;
  paymentId?: string;
  paymentStatus: "pending" | "paid" | "failed";
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;
}

const eventBookingSchema = new Schema<IEventBooking>(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tickets: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    specialRequests: {
      type: String,
      default: "",
    },
    bookingDate: {
      type: Date,
      default: Date.now,
    },
    paymentId: {
      type: String,
      default: "",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

// Indexes
eventBookingSchema.index({ event: 1, user: 1 });
eventBookingSchema.index({ status: 1 });
eventBookingSchema.index({ paymentStatus: 1 });

const EventBookingModel = model<IEventBooking>(
  "EventBooking",
  eventBookingSchema,
);
export default EventBookingModel;
