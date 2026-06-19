import { Request, Response } from "express";
import UserModel from "../models/userModel";
import ReviewModel from "../models/reviewModel";
import { AuthRequest } from "../middleware/auth";



export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await UserModel.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};


export const updateUserRole = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { roles } = req.body; 

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.roles = roles;
    await user.save();
    res.status(200).json({ success: true, message: "User role updated", data: { id: user._id, roles: user.roles } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update user role" });
  }
};


export const deleteUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const user = await UserModel.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete user" });
  }
};



export const getAllReviews = async (req: Request, res: Response) => {
  try {
    const reviews = await ReviewModel.find()
      .populate("user", "name email")
      .populate("destination", "name slug")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
};

export const adminDeleteReview = async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  try {
    const review = await ReviewModel.findByIdAndDelete(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    res.status(200).json({ success: true, message: "Review deleted by admin" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete review" });
  }
};