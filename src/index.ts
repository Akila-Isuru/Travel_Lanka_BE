import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRouter from "./routers/authRouter";
import destinationRouter from "./routers/destinationRouter";
import bookingRouter from "./routers/bookingRouter";
import reviewRouter from "./routers/reviewRouter";
import paymentRouter from "./routers/paymentRouter";
import adminRouter from "./routers/adminRouter";
import travelRouter from "./routers/travelRouter";
import itineraryRouter from "./routers/itineraryRouter";
import stayRouter from "./routers/stayRouter";
import passport from "passport";
import aiRouter from "./routers/aiRouter";
import chatRouter from "./routers/chatRouter";
import "./config/passport";
import eventRouter from "./routers/eventRouter";
import weatherRouter from "./routers/weatherRouter";

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;
const DB_URL = process.env.DB_URL as string;

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// ===== Serverless-safe MongoDB connection caching =====
// Vercel reuses warm function instances, so we cache the connection
// to avoid reconnecting (and timing out) on every single request.
let cachedConnection: typeof mongoose | null = null;

const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    cachedConnection = await mongoose.connect(DB_URL, {
      serverSelectionTimeoutMS: 30000, // give Atlas more time on cold start
      socketTimeoutMS: 45000,
    });
    console.log("Connected to MongoDB successfully!");
    return cachedConnection;
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    cachedConnection = null;
    throw error;
  }
};

// Ensure DB is connected before handling any request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res
      .status(503)
      .json({ message: "Database connection failed. Please try again." });
  }
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/destinations", destinationRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/payment", paymentRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/travel", travelRouter);
app.use("/api/v1/itineraries", itineraryRouter);
app.use("/api/v1/stays", stayRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/events", eventRouter);
app.use("/api/v1/weather", weatherRouter);

// Health check / root route (fixes "Cannot GET /")
app.get("/", (req, res) => {
  res.json({ message: "Travel Lanka API is running" });
});

// ===== Local development only =====
// On Vercel, this file is imported as a serverless function handler
// (see vercel.json) and app.listen() never runs there.
if (process.env.NODE_ENV !== "production") {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running beautifully on port ${PORT}`);
    });
  });
}

export default app;
