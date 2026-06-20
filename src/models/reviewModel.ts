import mongoose, { Schema, Document, model } from "mongoose";

export interface IReview extends Document {
  user: mongoose.Types.ObjectId;
  targetId: mongoose.Types.ObjectId;
  targetType: "destination" | "event" | "stay";
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
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "targetType",
    },
    targetType: {
      type: String,
      enum: ["destination", "event", "stay"],
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
  },
);

reviewSchema.index({ user: 1, targetId: 1, targetType: 1 }, { unique: true });

reviewSchema.index({ targetId: 1, targetType: 1 });

const ReviewModel = model<IReview>("Review", reviewSchema);
export default ReviewModel;
