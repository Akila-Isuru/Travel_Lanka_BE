// backend/src/controllers/aiController.ts
import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AuthRequest } from "../middleware/auth";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const planTripWithAI = async (req: AuthRequest, res: Response) => {
  try {
    const { duration, interests, budget, startLocation } = req.body;

    if (!duration || !interests || !budget) {
      return res
        .status(400)
        .json({ message: "Duration, interests, and budget are required." });
    }

    const prompt = `
You are a Sri Lanka travel expert. The user wants a trip plan.

User preferences:
- Duration: ${duration}
- Interests: ${interests.join(", ")}
- Budget (USD): $${budget}
- Start location: ${startLocation || "any"}

Create a day-by-day itinerary with realistic destinations in Sri Lanka. For each day, suggest one place (city or attraction) and a brief activity.
Return a **valid JSON object** with this exact structure:
{
  "itineraryName": "A catchy name for the trip",
  "days": [
    {
      "dayNumber": 1,
      "destinationName": "Place name",
      "description": "What to do there"
    }
  ]
}
Do not include any extra text outside the JSON.
`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let aiPlan;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiPlan = JSON.parse(jsonMatch[0]);
      } else {
        aiPlan = JSON.parse(responseText);
      }
    } catch (err) {
      console.error("Failed to parse AI response:", responseText);
      return res
        .status(500)
        .json({ message: "AI response format error. Please try again." });
    }

    res.status(200).json({
      success: true,
      itineraryName: aiPlan.itineraryName,
      days: aiPlan.days,
    });
  } catch (error: any) {
    console.error("AI planning error:", error);
    let errorMsg = "Failed to generate trip plan. Please try again.";
    if (error.message?.includes("429") || error.message?.includes("quota")) {
      errorMsg =
        "AI service quota exceeded. Please try again later or contact support.";
    } else if (error.message?.includes("API key")) {
      errorMsg = "Invalid API key. Please check configuration.";
    }
    res.status(500).json({ message: errorMsg });
  }
};
