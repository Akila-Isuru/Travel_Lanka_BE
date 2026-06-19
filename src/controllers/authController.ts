import { Request, Response } from "express";
import UserModel from "../models/userModel";
import bcrypt from "bcryptjs";
import { signAccessToken, signRefreshToken } from "../utils/token";
import { AuthRequest } from "../middleware/auth";
import { data } from "react-router-dom";

// Register

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

// LOGIn

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid Credentails!" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid Credentails!" });
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
    res.status(500).json({ message: "Failed to Register User!" });
  }
};

// Get my Detail

export const getMyDetails = async (req: AuthRequest, res: Response) => {
  try {
    const user = await UserModel.findById(req.user.sub).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not Found !" });
    }
    res.status(200).json({ message: "Success", data: user });
  } catch (error) {
    res.status(500).json({ message: "Failed to get UserDetails!" });
  }
};
