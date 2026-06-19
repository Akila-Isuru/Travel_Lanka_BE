// backend/src/controllers/chatController.ts
import { Request, Response } from "express";
import axios from "axios";
import { AuthRequest } from "../middleware/auth";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";


const SYSTEM_PROMPT = `You are a friendly and knowledgeable Sri Lanka travel assistant. Answer questions about destinations, culture, weather, transport, packing tips, local customs, food, etc. Keep responses concise (1-3 sentences) and helpful. If you don't know, say "I'll find that out for you!" Do not mention you are an AI.`;

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    if (!DEEPSEEK_API_KEY) {
      console.error("DEEPSEEK_API_KEY is missing in .env");
      return res
        .status(500)
        .json({
          reply: "Chat service is not configured. Please contact support.",
        });
    }

    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 200,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
      },
    );

    const reply = response.data.choices[0].message.content;
    res.json({ reply });
  } catch (error: any) {
    console.error(
      "DeepSeek chat error:",
      error.response?.data || error.message,
    );
    let reply =
      "I'm sorry, I'm having trouble connecting. Please try again in a moment.";
    if (error.response?.status === 401) {
      reply = "API key invalid. Please check configuration.";
    } else if (error.response?.status === 429) {
      reply = "Too many requests. Please try again later.";
    }
    res.status(500).json({ reply });
  }
};
