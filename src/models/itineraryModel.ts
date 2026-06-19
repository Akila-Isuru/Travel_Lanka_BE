import mongoose, { Schema, Document, model } from "mongoose";

export interface IItineraryDestination {
  destinationId: mongoose.Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  transportMode: "car" | "train" | "bus" | "flight";
  specialRequests?: string;
}

export interface IItinerary extends Document {
  user: mongoose.Types.ObjectId;
  name: string;
  destinations: IItineraryDestination[];
  totalPrice: number;
  totalNights: number;
  status: "draft" | "booked" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const ItineraryDestinationSchema = new Schema<IItineraryDestination>({
  destinationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DestinationModel",
    required: true,
  },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  guests: { type: Number, required: true, min: 1 },
  transportMode: {
    type: String,
    enum: ["car", "train", "bus", "flight"],
    default: "car",
  },
  specialRequests: { type: String, default: "" },
});

const ItinerarySchema = new Schema<IItinerary>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    destinations: [ItineraryDestinationSchema],
    totalPrice: { type: Number, default: 0 },
    totalNights: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "booked", "cancelled"],
      default: "draft",
    },
  },
  { timestamps: true },
);

export default model<IItinerary>("Itinerary", ItinerarySchema);
