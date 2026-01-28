import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { initializeDatabase } from "./db/db.connect.js";
import AiTrips from "./models/AiTrips.model.js";

if (!process.env.OPENROUTER_API_KEY) {
  console.error(
    "Please set OPENROUTER_API_KEY in your .env before running index.js",
  );
  process.exit(1);
}

// OpenRouter via OpenAI SDK
const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1/",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";
// const MODEL = "upstage/solar-pro-3:free";

const SYSTEM_PROMPT = `
You are an AI assistant acting as a helpful travel agent.
Respond with JSON only. No Prose, markdown, or backticks.

Use exactly this schema and field names:
{
  "destination": "string - city, country",
  "best_time": "string - month(s)/season with one sentence why",
  "duration_days": "number",
  "top_attractions": ["string"],
  "sample_itinerary": [
  {"day": 1, "plan": "string"},
  {"day": 2, "plan": "string"},
  {"day": 3, "plan": "string"}
  ],
  "estimated_budget_inr": {"low": number, "mid":number, "high": number},
  "local_tips": ["string", "string"]
  }

  Rules:
  - Output valid JSON only, nothing else.
  - Keep numbers unquoted.
  - If unsure, use null or [] but keep the schema
`;

const QUERY_SYSTEM_PROMPT = `
You are an AI assistant acting as a helpful travel agent.
Respond with JSON only. No Prose, markdown, or backticks.

Use exactly this schema and field names:
{
"city": ["string"],
"country": ["string"]
}

  Rules:
  - Limit to 10 locations only.
  - Cities must be well-known international tourist destinations
  - Output valid JSON only, nothing else.
  - Do not add extra fields
  - If unsure, use null or [] but keep the schema
`;

const QUERY_USER_PROMPT =
  "Give me a list of major tourist cities and their countries in the world.";

const app = express();
app.use(express.json());
app.use(cors());

initializeDatabase();

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/place-list", async (req, res) => {
  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: QUERY_SYSTEM_PROMPT },
        { role: "user", content: QUERY_USER_PROMPT },
      ],
      temperature: 0.2,
      timeout: 20_000,
    });

    const raw = response?.choices[0]?.message.content;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.error("Invalid JSON from model:", raw);
      return res.status(500).json({ error: "Model returned invalid JSON" });
    }

    res.status(200).json(parsed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate travel plan" });
  }
});

app.get("/api/travel-plan", async (req, res) => {
  const city = (req.query.city || "Bengaluru").toString();
  const country = (req.query.country || "India").toString();
  const days = Number(req.query.days || 3);

  const USER_PROMPT = `Create a short ${days}-day travel plan for ${city}, ${country} for a first-time visitors`;

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT },
      ],
      temperature: 0.2,
      timeout: 20_000,
    });

    // console.log("Raw model response:", JSON.stringify(response, null, 2));

    const raw = response?.choices[0]?.message.content;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.error("Invalid JSON from model:", raw);
      return res.status(500).json({ error: "Model returned invalid JSON" });
    }

    res.status(200).json(parsed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate travel plan" });
  }
});

app.post("/saveTrips", async (req, res) => {
  try {
    const saveNewTrip = new AiTrips(req.body);
    const savedTrips = await saveNewTrip.save();

    return res
      .status(201)
      .json({ message: "Trip created successfully.", trip: savedTrips });
  } catch (error) {
    res.status(500).json({ error: "Failed to add trip." });
  }
});

app.get("/saveTrips", async (req, res) => {
  try {
    const readTrips = await AiTrips.find();

    return res.status(200).json(readTrips);
  } catch (error) {
    res.status(500).json({ error: "Failed to get trips." });
  }
});

app.delete("/saveTrips/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedtrip = await AiTrips.findOneAndDelete(id);

    if (!deletedtrip) {
      return res.status(404).json({ error: "Trip not found." });
    }

    return res
      .status(200)
      .json({
        message: "Trip has been deleted successfully.",
        trip: deletedtrip,
      });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete trip." });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
