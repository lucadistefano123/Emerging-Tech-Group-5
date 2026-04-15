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
const PORT = process.env.AI_SERVICE_PORT || 5003;

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
    hotspots
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

app.post("/chatbot", authenticate, async (req, res) => {
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
