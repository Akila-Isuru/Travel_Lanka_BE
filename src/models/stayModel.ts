import mongoose, { Schema, Document, model } from "mongoose";

export interface IStay extends Document {
  name: string;
  slug: string;
  description: string;
  images: string[];
  location: string;
  destinationId: mongoose.Types.ObjectId;
  pricePerNight: number;
  address: string;
  contactPhone: string;
  amenities: string[];
  rating: number;
  coordinates?: {
    type: string;
    coordinates: number[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const staySchema = new Schema<IStay>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    images: { type: [String], required: true },
    location: { type: String, required: true },
    destinationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DestinationModel",
      required: true,
    },
    pricePerNight: { type: Number, required: true, min: 0 },
    address: { type: String, required: true },
    contactPhone: { type: String, default: "" },
    amenities: { type: [String], default: [] },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: { type: [Number] },
    },
  },
  { timestamps: true },
);

staySchema.index({ destinationId: 1 });
staySchema.index({ coordinates: "2dsphere" }, { sparse: true });

const StayModel = model<IStay>("Stay", staySchema);
export default StayModel;
