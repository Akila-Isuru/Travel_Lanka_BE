import { Request, Response } from "express";
import UserModel from "../models/userModel";
import bcrypt from "bcryptjs";
import { signAccessToken, signRefreshToken } from "../utils/token";
import { AuthRequest } from "../middleware/auth";
import crypto from "crypto";
import {
  sendResetPasswordEmail,
  sendPasswordResetConfirmation,
} from "../utils/email";

export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  try {
    const exUser = await UserModel.findOne({ email });
    if (exUser) {
      return res.status(400).json({ message: "User already Exists...!" });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const newUser = new UserModel({
      name,
      email,
      password: hashedPassword,
    });
    const savedUser = await newUser.save();

    res.status(201).json({
      message: "Registration Successful!",
      data: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to Register User!" });
  }
};

// ===== Login =====
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid Credentials!" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid Credentials!" });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.status(200).json({
      message: "Login Success",
      data: {
        name: user.name,
        email: user.email,
        roles: user.roles,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to Login!" });
  }
};

// ===== Get My Details =====
export const getMyDetails = async (req: AuthRequest, res: Response) => {
  try {
    const user = await UserModel.findById(req.user.sub).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not Found!" });
    }
    res.status(200).json({ message: "Success", data: user });
  } catch (error) {
    res.status(500).json({ message: "Failed to get UserDetails!" });
  }
};

// ===== Forgot Password =====
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    console.log("📧 Forgot password request received");

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // ===== FIX: Ensure email is a string =====
    const emailStr =
      typeof email === "string" ? email.trim() : String(email).trim();

    if (!emailStr) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    console.log("📧 Looking for user with email:", emailStr);

    const user = await UserModel.findOne({ email: emailStr });
    if (!user) {
      console.log("❌ User not found with email:", emailStr);
      return res
        .status(404)
        .json({ message: "No account found with this email" });
    }

    console.log("✅ User found:", user.name);

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save to database
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    console.log("✅ Reset token saved for user:", user.name);

    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    console.log("📧 Sending reset email to:", emailStr);
    console.log("📧 Reset link:", resetLink);

    // Send email
    await sendResetPasswordEmail(emailStr, user.name, resetLink);

    res.status(200).json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      message: error.message || "Failed to send reset email",
    });
  }
};

// ===== Validate Reset Token =====
export const validateResetToken = async (req: Request, res: Response) => {
  const token = req.params.token as string; // ← FIX: cast (req.params can type as string | string[])

  try {
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await UserModel.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    res.status(200).json({
      success: true,
      message: "Token is valid",
      email: user.email,
    });
  } catch (error) {
    console.error("Validate token error:", error);
    res.status(500).json({ message: "Failed to validate token" });
  }
};

// ===== Reset Password =====
export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  try {
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token and new password are required" });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await UserModel.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Hash new password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    // Update user
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Send confirmation email
    await sendPasswordResetConfirmation(user.email, user.name);

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    res.status(500).json({
      message: error.message || "Failed to reset password",
    });
  }
};
