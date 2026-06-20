import { Request, Response } from "express";
import ReviewModel from "../models/reviewModel";
import DestinationModel from "../models/destinationModel";
import EventModel from "../models/eventModel";
import StayModel from "../models/stayModel";
import { AuthRequest } from "../middleware/auth";
import mongoose from "mongoose";

const updateTargetRating = async (targetId: string, targetType: string) => {
  const result = await ReviewModel.aggregate([
    {
      $match: {
        targetId: new mongoose.Types.ObjectId(targetId),
        targetType,
      },
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const avg = result.length > 0 ? Math.round(result[0].avgRating * 10) / 10 : 0;
  const count = result.length > 0 ? result[0].count : 0;

  if (targetType === "destination") {
    await DestinationModel.findByIdAndUpdate(targetId, {
      ratingsAverage: avg,
      ratingsQuantity: count,
    });
  } else if (targetType === "event") {
    await EventModel.findByIdAndUpdate(targetId, {
      ratingsAverage: avg,
      ratingsQuantity: count,
    });
  } else if (targetType === "stay") {
    await StayModel.findByIdAndUpdate(targetId, {
      ratingsAverage: avg,
      ratingsQuantity: count,
    });
  }
};

const getTarget = async (targetId: string, targetType: string) => {
  if (targetType === "destination") {
    return await DestinationModel.findById(targetId);
  } else if (targetType === "event") {
    return await EventModel.findById(targetId);
  } else if (targetType === "stay") {
    return await StayModel.findById(targetId);
  }
  return null;
};

export const createReview = async (req: AuthRequest, res: Response) => {
  const { targetId, targetType, rating, comment } = req.body;

  if (!req.user || !req.user.sub) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (!["destination", "event", "stay"].includes(targetType)) {
    return res.status(400).json({ message: "Invalid target type" });
  }

  try {
    const target = await getTarget(targetId, targetType);
    if (!target) {
      return res.status(404).json({ message: `${targetType} not found` });
    }

    const existing = await ReviewModel.findOne({
      user: req.user.sub,
      targetId,
      targetType,
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: `You already reviewed this ${targetType}` });
    }

    const review = new ReviewModel({
      user: req.user.sub,
      targetId,
      targetType,
      rating: Number(rating),
      comment,
    });

    await review.save();

    await updateTargetRating(targetId, targetType);

    await review.populate("user", "name");

    res.status(201).json({ message: "Review added!", data: review });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create review" });
  }
};

// ===== Params casts below: req.params values are typed string | string[] in strict mode =====

export const getReviewsForTarget = async (req: Request, res: Response) => {
  const targetId = req.params.targetId as string;
  const targetType = req.params.targetType as "destination" | "event" | "stay";

  // Validate targetType
  if (!["destination", "event", "stay"].includes(targetType)) {
    return res.status(400).json({ message: "Invalid target type" });
  }

  try {
    const reviews = await ReviewModel.find({ targetId, targetType })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ data: reviews });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get reviews" });
  }
};

// ===== GET AVERAGE RATING FOR TARGET =====
export const getAverageRating = async (req: Request, res: Response) => {
  const targetId = req.params.targetId as string;
  const targetType = req.params.targetType as "destination" | "event" | "stay";

  try {
    const result = await ReviewModel.aggregate([
      {
        $match: {
          targetId: new mongoose.Types.ObjectId(targetId),
          targetType,
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    const avg =
      result.length > 0 ? Math.round(result[0].avgRating * 10) / 10 : 0;
    const count = result.length > 0 ? result[0].count : 0;

    res.status(200).json({
      data: {
        ratingsAverage: avg,
        ratingsQuantity: count,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get rating" });
  }
};

export const deleteReview = async (req: AuthRequest, res: Response) => {
  const { reviewId } = req.params;

  try {
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const isOwner = review.user.toString() === req.user?.sub;
    const isAdmin = req.user?.roles?.includes("ADMIN");

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const targetId = review.targetId.toString();
    const targetType = review.targetType;

    await review.deleteOne();

    await updateTargetRating(targetId, targetType);

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete review" });
  }
};
