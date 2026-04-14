import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Issue from "../models/Issue.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validateIssueInput } from "../utils/validateIssueInput.js";
import { validateRegisterInput, validateLoginInput } from "../utils/validateAuthInput.js";
import { setTokenCookie } from "../utils/setTokenCookie.js";
import { getChatbotReply } from "../services/chatbotService.js";

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const resolvers = {
  Query: {
    hello: () => "Server is running 🚀",

    me: async (_, __, context) => {
      const authUser = requireAuth(context.req);

      const user = await User.findById(authUser.id);

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    },

    issues: async () => {
      return await Issue.find()
        .populate("reportedBy")
        .populate("assignedTo")
        .sort({ createdAt: -1 });
    },

    myIssues: async (_, __, context) => {
      const user = requireAuth(context.req);

      return await Issue.find({ reportedBy: user.id })
        .populate("reportedBy")
        .populate("assignedTo")
        .sort({ createdAt: -1 });
    }
  },

  Mutation: {
    register: async (_, { fullName, email, password, role }, context) => {
      validateRegisterInput({ fullName, email, password });

      const existingUser = await User.findOne({ email: email.toLowerCase() });

      if (existingUser) {
        throw new Error("User already exists with this email");
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role || "resident"
      });

      const token = createToken(user);

      setTokenCookie(context.res, token);

      return {
        message: "Registration successful",
        user,
        token
      };
    },

    login: async (_, { email, password }, context) => {
      validateLoginInput({ email, password });

      const user = await User.findOne({ email: email.toLowerCase().trim() });

      if (!user) {
        throw new Error("User not found");
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        throw new Error("Invalid credentials");
      }

      const token = createToken(user);

      setTokenCookie(context.res, token);

      return {
        message: "Login successful",
        user,
        token
      };
    },

    logout: async (_, __, context) => {
      context.res.clearCookie("token");

      return "Logged out successfully";
    },

    createIssue: async (_, args, context) => {
      const user = requireAuth(context.req);
      validateIssueInput(args);

      const issue = await Issue.create({
        ...args,
        title: args.title.trim(),
        description: args.description.trim(),
        category: args.category?.trim() || "General",
        imageUrl: args.imageUrl?.trim() || "",
        reportedBy: user.id
      });

      return await Issue.findById(issue._id)
        .populate("reportedBy")
        .populate("assignedTo");
    },

    updateIssueStatus: async (_, { issueId, status, assignedTo }, context) => {
      const user = requireAuth(context.req);
      requireRole(user, ["staff"]);

      const allowedStatuses = ["open", "in_progress", "resolved"];
      if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid status value");
      }

      const issue = await Issue.findById(issueId);

      if (!issue) {
        throw new Error("Issue not found");
      }

      // Staff can only resolve issues that are open or in progress
      if (status === "resolved" && !["open", "in_progress"].includes(issue.status)) {
        throw new Error("Can only resolve issues that are open or in progress");
      }

      issue.status = status;

      if (assignedTo) {
        issue.assignedTo = assignedTo;
      }

      await issue.save();

      return await Issue.findById(issue._id)
        .populate("reportedBy")
        .populate("assignedTo");
    },

    chatbot: async (_, { message }, context) => {
      requireAuth(context.req);

      if (!message?.trim()) {
        throw new Error("Message is required");
      }

      return await getChatbotReply(message.trim());
    }
  }
};

export default resolvers;
