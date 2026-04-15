import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { connectDB } from "../config/db.js";
import Issue from "../models/Issue.js";
import { getChatbotReply } from "../services/chatbotService.js";

dotenv.config();

const app = express();
const PORT = process.env.AI_SERVICE_PORT || 5008;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const authenticate = (req, res, next) => {
  try {
    const headerToken = req.headers.authorization?.split(" ")[1];
    const cookieToken = req.cookies?.token;
    const token = headerToken || cookieToken;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

const buildAnalytics = (issues) => {
  const statusCounts = [
    { label: "open", value: issues.filter((issue) => issue.status === "open").length },
    { label: "in progress", value: issues.filter((issue) => issue.status === "in_progress").length },
    { label: "resolved", value: issues.filter((issue) => issue.status === "resolved").length }
  ];

  const categoryMap = new Map();
  issues.forEach((issue) => {
    const cat = issue.category?.trim() || "General";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  });

  const categoryCounts = Array.from(categoryMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const trendClusters = Array.from(categoryMap.entries())
    .map(([label, value]) => ({
      label,
      count: value,
      exampleIssue: issues.find((issue) => (issue.category?.trim() || "General") === label)?.title || "Example report"
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const trendMap = new Map();
  issues.forEach((issue) => {
    const date = new Date(issue.createdAt).toISOString().slice(0, 10);
    trendMap.set(date, (trendMap.get(date) || 0) + 1);
  });

  const dailyTrend = Array.from(trendMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7)
    .map(([label, value]) => ({ label, value }));

  const hotspots = issues
    .map((issue) => ({
      id: issue._id.toString(),
      title: issue.title,
      category: issue.category?.trim() || "General",
      status: issue.status,
      latitude: issue.latitude,
      longitude: issue.longitude
    }))
    .filter((issue) => Number.isFinite(issue.latitude) && Number.isFinite(issue.longitude));

  return {
    totalIssues: issues.length,
    openIssues: issues.filter((issue) => issue.status === "open").length,
    inProgressIssues: issues.filter((issue) => issue.status === "in_progress").length,
    resolvedIssues: issues.filter((issue) => issue.status === "resolved").length,
    statusCounts,
    categoryCounts,
    dailyTrend,
    hotspots,
    trendClusters
  };
};

app.get("/analytics", authenticate, async (req, res) => {
  try {
    const issues = await Issue.find().populate("reportedBy").populate("assignedTo");
    res.json(buildAnalytics(issues));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/chatbot", async (req, res) => { // temporarily removed authenticate for testing
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const reply = await getChatbotReply(message.trim());
    res.json(reply);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/suggest-category", authenticate, async (req, res) => {
  try {
    const { issueId } = req.body;
    if (!issueId) {
      return res.status(400).json({ message: "Issue ID is required" });
    }

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ message: "AI service unavailable" });
    }

    const prompt = `Classify this issue into one of these categories: Infrastructure, Environment, Safety, Transportation, Utilities, Health, Education, Other.
Issue Title: ${issue.title}
Issue Description: ${issue.description}
Respond with only the category name.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 50 }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${response.status}`);
    }

    const data = await response.json();
    const category = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "General";

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ai service healthy" });
});

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`AI service running on http://localhost:${PORT}`);
  });
};

start();
