
import mongoose, { Schema, Document, model } from "mongoose";

export interface IReview extends Document {
  user: mongoose.Types.ObjectId;
  destination: mongoose.Types.ObjectId;
  rating: number;        
  comment: string;
  createdAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    destination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DestinationModel",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ user: 1, destination: 1 }, { unique: true });

const ReviewModel = model<IReview>("Review", reviewSchema);
export default ReviewModel;