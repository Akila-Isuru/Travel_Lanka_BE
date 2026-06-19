import express, { Request, Response } from "express";
import axios from "axios";

const router = express.Router();

router.get("/travel-time", async (req: Request, res: Response) => {
  const { startLng, startLat, endLng, endLat } = req.query;

  if (!startLng || !startLat || !endLng || !endLat) {
    return res.status(400).json({ message: "Missing coordinates" });
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=false`;
    const response = await axios.get(url);
    const route = response.data.routes?.[0];

    res.json({
      duration: route?.duration || null,
      distance: route?.distance || null,
    });
  } catch (err: any) {
    console.error("OSRM error:", err?.response?.data || err?.message);
    res.status(500).json({ message: "Failed to fetch travel time" });
  }
});

export default router;