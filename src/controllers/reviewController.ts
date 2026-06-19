import { Request, Response } from "express";
import ReviewModel from "../models/reviewModel";
import DestinationModel from "../models/destinationModel";
import { AuthRequest } from "../middleware/auth";

const updateDestinationRating = async (destinationId: string) => {
  const result = await ReviewModel.aggregate([
    { $match: { destination: destinationId } },
    {
      $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } },
    },
  ]);

  const avg = result.length > 0 ? Math.round(result[0].avgRating * 10) / 10 : 0;
  const count = result.length > 0 ? result[0].count : 0;

  await DestinationModel.findByIdAndUpdate(destinationId, {
    ratingsAverage: avg,
    ratingsQuantity: count,
  });
};

export const createReview = async (req: AuthRequest, res: Response) => {
  const { destinationId, rating, comment } = req.body;

  if (!req.user || !req.user.sub) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const destination = await DestinationModel.findById(destinationId);
    if (!destination) {
      return res.status(404).json({ message: "Destination not found" });
    }

    const existing = await ReviewModel.findOne({
      user: req.user.sub,
      destination: destinationId,
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "You already reviewed this destination" });
    }

    const review = new ReviewModel({
      user: req.user.sub,
      destination: destinationId,
      rating: Number(rating),
      comment,
    });

    await review.save();

    await updateDestinationRating(destinationId);

    await review.populate("user", "name");

    res.status(201).json({ message: "Review added!", data: review });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create review" });
  }
};

export const getReviewsForDestination = async (req: Request, res: Response) => {
  const { destinationId } = req.params;

  try {
    const reviews = await ReviewModel.find({ destination: destinationId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ data: reviews });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get reviews" });
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

    const destinationId = review.destination;
    await review.deleteOne();

    await updateDestinationRating(destinationId.toString());

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete review" });
  }
};
