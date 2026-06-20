import { Router } from "express";
import {
  getWeather,
  getWeatherForMultiple,
} from "../controllers/weatherController";

const router = Router();

router.get("/", getWeather);
router.get("/multiple", getWeatherForMultiple);

export default router;
