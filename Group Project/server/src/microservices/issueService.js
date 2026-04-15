import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import Issue from "../models/Issue.js";
import Notification from "../models/Notification.js";
import { validateIssueInput } from "../utils/validateIssueInput.js";

const ISSUE_CATEGORY_KEYWORDS = [
  { category: "Roadway", keywords: ["pothole", "road", "street", "highway", "traffic", "sign", "lane", "crosswalk", "bridge"] },
  { category: "Lighting", keywords: ["light", "streetlight", "lamp", "dark", "illumination"] },
  { category: "Water", keywords: ["water", "sewer", "drain", "flood", "pipe", "leak"] },
  { category: "Sanitation", keywords: ["trash", "garbage", "litter", "dumping", "bin", "clean"] },
  { category: "Public Safety", keywords: ["noise", "crime", "vandalism", "graffiti", "danger", "unsafe"] },
  { category: "Transit", keywords: ["bus", "train", "station", "transit", "stop", "route"] },
  { category: "Parks", keywords: ["park", "tree", "green", "playground", "garden", "landscap"] }
];

const autoCategorizeIssue = ({ title, description }) => {
  const text = `${title || ""} ${description || ""}`.toLowerCase();
  for (const bucket of ISSUE_CATEGORY_KEYWORDS) {
    if (bucket.keywords.some((keyword) => text.includes(keyword))) {
      return bucket.category;
    }
  }
  return "General";
};

dotenv.config();

const app = express();
const PORT = process.env.ISSUE_SERVICE_PORT || 5002;

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

app.get("/issues", async (req, res) => {
  try {
    const issues = await Issue.find()
      .populate("reportedBy")
      .populate("assignedTo")
      .sort({ createdAt: -1 });

    res.json(issues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/issues/my", authenticate, async (req, res) => {
  try {
    const issues = await Issue.find({ reportedBy: req.user.id })
      .populate("reportedBy")
      .populate("assignedTo")
      .sort({ createdAt: -1 });

    res.json(issues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/users/staff", async (req, res) => {
  try {
    const staffUsers = await User.find({ role: "staff" })
      .select("-password")
      .sort({ fullName: 1 });

    res.json(staffUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/issues", authenticate, async (req, res) => {
  try {
    validateIssueInput(req.body);

    const providedCategory = req.body.category?.trim();
    const category = providedCategory && providedCategory !== "General"
      ? providedCategory
      : autoCategorizeIssue(req.body);

    const issue = await Issue.create({
      ...req.body,
      title: req.body.title.trim(),
      description: req.body.description.trim(),
      category,
      imageUrl: req.body.imageUrl?.trim() || "",
      reportedBy: req.user.id
    });

    const staffUsers = await User.find({ role: "staff" });
    for (const staff of staffUsers) {
      await Notification.create({
        userId: staff._id,
        issueId: issue._id,
        type: "issue_created",
        message: `New issue reported: ${issue.title}`
      });
    }

    const result = await Issue.findById(issue._id)
      .populate("reportedBy")
      .populate("assignedTo");

    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put("/issues/:issueId/status", authenticate, async (req, res) => {
  try {
    const { issueId } = req.params;
    const { status, assignedTo } = req.body;

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const allowedStatuses = ["open", "in_progress", "resolved"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    if (status === "resolved" && !["open", "in_progress"].includes(issue.status)) {
      return res.status(400).json({ message: "Can only resolve issues that are open or in progress" });
    }

    issue.status = status;
    if (assignedTo) {
      issue.assignedTo = assignedTo;
      await Notification.create({
        userId: assignedTo,
        issueId: issue._id,
        type: "issue_assigned",
        message: `Issue assigned to you: ${issue.title}`
      });
    }

    await Notification.create({
      userId: issue.reportedBy,
      issueId: issue._id,
      type: "issue_updated",
      message: `Your issue status updated to: ${status.replace("_", " ")}`
    });

    if (status === "resolved") {
      await Notification.create({
        userId: issue.reportedBy,
        issueId: issue._id,
        type: "issue_resolved",
        message: `Your issue has been resolved: ${issue.title}`
      });
    }

    await issue.save();

    const updatedIssue = await Issue.findById(issue._id)
      .populate("reportedBy")
      .populate("assignedTo");

    res.json(updatedIssue);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/notifications", authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .populate("issueId")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/notifications/unread", authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id, read: false })
      .populate("issueId")
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/notifications/:notificationId/read", authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findOne({ _id: notificationId, userId: req.user.id });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.read = true;
    await notification.save();
    await notification.populate("issueId");

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "issue service healthy" });
});

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Issue service running on http://localhost:${PORT}`);
  });
};

start();
