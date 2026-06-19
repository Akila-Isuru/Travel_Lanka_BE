import mongoose, { Schema, Document, model } from "mongoose";

export interface IAgent extends Document {
  name: string;
  slug: string;
  photo: string;
  bio: string;
  specialties: string[];
  languages: string[];
  whatsappNumber: string; // format: 94771234567 (no + or spaces)
  email: string;
  phone: string;
  pricePerDay: number;
  rating: number;
  reviewCount: number;
  destinations: mongoose.Types.ObjectId[];
  status: "active" | "inactive";
  yearsExperience: number;
  createdAt: Date;
  updatedAt: Date;
}

const agentSchema = new Schema<IAgent>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    photo: { type: String, default: "" },
    bio: { type: String, required: true },
    specialties: { type: [String], default: [] },
    languages: { type: [String], default: ["English"] },
    whatsappNumber: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    pricePerDay: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    destinations: [
      { type: mongoose.Schema.Types.ObjectId, ref: "DestinationModel" },
    ],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    yearsExperience: { type: Number, default: 1 },
  },
  { timestamps: true },
);

agentSchema.index({ destinations: 1 });
agentSchema.index({ status: 1 });

const AgentModel = model<IAgent>("Agent", agentSchema);
export default AgentModel;
