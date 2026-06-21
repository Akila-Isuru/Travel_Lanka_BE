import mongoose, { Schema, Document, model } from "mongoose";

export interface IEvent extends Document {
  name: string;
  slug: string;
  description: string;
  category:
    | "cultural"
    | "music"
    | "arts"
    | "food"
    | "nature"
    | "wellness"
    | "seasonal"
    | "sports"
    | "religious"
    | "other";
  subCategory?: string;
  startDate: Date;
  endDate: Date;
  isRecurring: boolean;
  recurringPattern?: "daily" | "weekly" | "monthly" | "yearly";
  location: string;
  address?: string;
  coordinates?: {
    type: string;
    coordinates: number[];
  };
  images: string[];
  coverImage: string;
  videoUrl?: string;
  organizer: string;
  organizerEmail: string;
  organizerPhone: string;
  website?: string;
  price: number;
  currency: "LKR" | "USD";
  isFree: boolean;
  maxCapacity: number;
  currentBookings: number;
  features: string[];
  status: "draft" | "published" | "upcoming" | "ongoing" | "past" | "cancelled";
  isPublished: boolean;
  destinationIds: mongoose.Types.ObjectId[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  views: number;
  interestedCount: number;
  ratingsAverage: number;
  ratingsQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: [
        "cultural",
        "music",
        "arts",
        "food",
        "nature",
        "wellness",
        "seasonal",
        "sports",
        "religious",
        "other",
      ],
      required: true,
    },
    subCategory: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isRecurring: { type: Boolean, default: false },
    recurringPattern: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
      default: null,
    },
    location: { type: String, required: true },
    address: { type: String, default: "" },
    coordinates: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [80.7718, 7.8731] },
    },
    images: { type: [String], default: [] },
    coverImage: { type: String, default: "" },
    videoUrl: { type: String, default: "" },
    organizer: { type: String, required: true },
    organizerEmail: { type: String, required: true },
    organizerPhone: { type: String, required: true },
    website: { type: String, default: "" },
    price: { type: Number, default: 0, min: 0 },
    currency: { type: String, enum: ["LKR", "USD"], default: "USD" },
    isFree: { type: Boolean, default: true },
    maxCapacity: { type: Number, default: 0, min: 0 },
    currentBookings: { type: Number, default: 0, min: 0 },
    features: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["draft", "published", "upcoming", "ongoing", "past", "cancelled"],
      default: "draft",
    },
    isPublished: { type: Boolean, default: true },
    destinationIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DestinationModel",
        default: [],
      },
    ],
    // ===== REMOVED: agentIds field (Agent feature no longer used) =====
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    metaKeywords: { type: [String], default: [] },
    views: { type: Number, default: 0, min: 0 },
    interestedCount: { type: Number, default: 0, min: 0 },
    ratingsAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingsQuantity: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// Indexes
eventSchema.index({ startDate: 1, endDate: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ isPublished: 1 });
eventSchema.index({ coordinates: "2dsphere" });

// ===== Check availability method =====
eventSchema.methods.isAvailable = function (): boolean {
  if (this.status === "cancelled") return false;
  if (this.maxCapacity === 0) return true;
  return this.currentBookings < this.maxCapacity;
};

const EventModel = model<IEvent>("Event", eventSchema);
export default EventModel;
