import mongoose, { Schema, Document, model } from "mongoose";

export interface IDestination extends Document {
  name: string;
  slug: string;
  description: string;
  images: string[];
  location: string;
  category: string;
  pricePerNight: number;
  ratingsAverage: number;
  ratingsQuantity: number;
  coordinates: {
    type: string;
    coordinates: number[];
  };
}

const destinationSchema = new Schema<IDestination>(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    images: {
      type: [String],
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    pricePerNight: {
      type: Number,
      required: true,
    },
    ratingsAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
       
      },
    },
  },
  { timestamps: true },
);


destinationSchema.index({ coordinates: "2dsphere" });

const DestinationModel = model<IDestination>(
  "DestinationModel",
  destinationSchema,
);
export default DestinationModel;
