import { Request, Response } from "express";
import axios from "axios";

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_API_URL = "https://api.openweathermap.org/data/2.5/weather";

export const getWeather = async (req: Request, res: Response) => {
  try {
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({ message: "City name is required" });
    }

    if (!WEATHER_API_KEY) {
      return res
        .status(500)
        .json({ message: "Weather API key not configured" });
    }

    const response = await axios.get(WEATHER_API_URL, {
      params: {
        q: city,
        appid: WEATHER_API_KEY,
        units: "metric",
      },
    });

    const data = response.data;

    // Format response
    const weatherData = {
      city: data.name,
      temp: data.main.temp,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      wind_speed: data.wind.speed,
      description: data.weather[0].description,
      main: data.weather[0].main,
      icon: data.weather[0].icon,
      visibility: data.visibility || 10000,
      pressure: data.main.pressure,
      country: data.sys.country,
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset,
    };

    res.json(weatherData);
  } catch (error: any) {
    console.error("Weather API error:", error.response?.data || error.message);

    if (error.response?.status === 404) {
      return res.status(404).json({ message: "City not found" });
    }

    if (error.response?.status === 401) {
      return res.status(401).json({ message: "Invalid API key" });
    }

    res.status(500).json({
      message: error.response?.data?.message || "Failed to fetch weather data",
    });
  }
};

export const getWeatherForMultiple = async (req: Request, res: Response) => {
  try {
    const { cities } = req.query;

    if (!cities) {
      return res.status(400).json({ message: "Cities parameter is required" });
    }

    const cityList = (cities as string).split(",");
    const results = await Promise.allSettled(
      cityList.map(async (city) => {
        const response = await axios.get(WEATHER_API_URL, {
          params: {
            q: city.trim(),
            appid: WEATHER_API_KEY,
            units: "metric",
          },
        });
        const data = response.data;
        return {
          city: data.name,
          temp: data.main.temp,
          feels_like: data.main.feels_like,
          humidity: data.main.humidity,
          wind_speed: data.wind.speed,
          description: data.weather[0].description,
          main: data.weather[0].main,
          icon: data.weather[0].icon,
          visibility: data.visibility || 10000,
          pressure: data.main.pressure,
        };
      }),
    );

    const weatherData = results
      .filter((r) => r.status === "fulfilled")
      .map((r: any) => r.value);

    res.json(weatherData);
  } catch (error: any) {
    console.error("Weather API error:", error.message);
    res.status(500).json({ message: "Failed to fetch weather data" });
  }
};
