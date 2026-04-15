import { validateIssueInput } from "../utils/validateIssueInput.js";
import { validateRegisterInput, validateLoginInput } from "../utils/validateAuthInput.js";
import { setTokenCookie } from "../utils/setTokenCookie.js";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:5001";
const ISSUE_SERVICE_URL = process.env.ISSUE_SERVICE_URL || "http://localhost:5002";
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5008";

const getTokenFromRequest = (req) => {
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  if (req.headers.authorization) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
};

const fetchJson = async (url, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const message = body?.message || body?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body;
};

const getAuthHeaders = (req) => {
  const token = getTokenFromRequest(req);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const resolvers = {
  Query: {
    hello: () => "Server is running",

    me: async (_, __, context) => {
      const result = await fetchJson(`${AUTH_SERVICE_URL}/me`, {
        headers: getAuthHeaders(context.req)
      });
      return result.user;
    },

    issues: async (_, __, context) => {
      return await fetchJson(`${ISSUE_SERVICE_URL}/issues`, {
        headers: getAuthHeaders(context.req)
      });
    },

    myIssues: async (_, __, context) => {
      return await fetchJson(`${ISSUE_SERVICE_URL}/issues/my`, {
        headers: getAuthHeaders(context.req)
      });
    },

    staffUsers: async () => {
      return await fetchJson(`${ISSUE_SERVICE_URL}/users/staff`);
    },

    analytics: async (_, __, context) => {
      return await fetchJson(`${AI_SERVICE_URL}/analytics`, {
        headers: getAuthHeaders(context.req)
      });
    },

    notifications: async (_, __, context) => {
      return await fetchJson(`${ISSUE_SERVICE_URL}/notifications`, {
        headers: getAuthHeaders(context.req)
      });
    },

    unreadNotifications: async (_, __, context) => {
      return await fetchJson(`${ISSUE_SERVICE_URL}/notifications/unread`, {
        headers: getAuthHeaders(context.req)
      });
    }
  },

  Mutation: {
    register: async (_, { fullName, email, password, role }, context) => {
      validateRegisterInput({ fullName, email, password });

      const result = await fetchJson(`${AUTH_SERVICE_URL}/register`, {
        method: "POST",
        body: JSON.stringify({ fullName, email, password, role })
      });

      setTokenCookie(context.res, result.token);

      return {
        message: result.message,
        user: result.user,
        token: result.token
      };
    },

    login: async (_, { email, password }, context) => {
      validateLoginInput({ email, password });

      const result = await fetchJson(`${AUTH_SERVICE_URL}/login`, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      setTokenCookie(context.res, result.token);

      return {
        message: result.message,
        user: result.user,
        token: result.token
      };
    },

    logout: async (_, __, context) => {
      context.res.clearCookie("token");
      return "Logged out successfully";
    },

    createIssue: async (_, args, context) => {
      validateIssueInput(args);

      return await fetchJson(`${ISSUE_SERVICE_URL}/issues`, {
        method: "POST",
        headers: getAuthHeaders(context.req),
        body: JSON.stringify(args)
      });
    },

    updateIssueStatus: async (_, { issueId, status, assignedTo }, context) => {
      return await fetchJson(`${ISSUE_SERVICE_URL}/issues/${issueId}/status`, {
        method: "PUT",
        headers: getAuthHeaders(context.req),
        body: JSON.stringify({ status, assignedTo })
      });
    },

    markNotificationAsRead: async (_, { notificationId }, context) => {
      return await fetchJson(`${ISSUE_SERVICE_URL}/notifications/${notificationId}/read`, {
        method: "POST",
        headers: getAuthHeaders(context.req)
      });
    },

    suggestCategoryForIssue: async (_, { issueId }, context) => {
      return await fetchJson(`${AI_SERVICE_URL}/suggest-category`, {
        method: "POST",
        headers: getAuthHeaders(context.req),
        body: JSON.stringify({ issueId })
      });
    },

    chatbot: async (_, { message }, context) => {
      if (!message?.trim()) {
        throw new Error("Message is required");
      }

      return await fetchJson(`${AI_SERVICE_URL}/chatbot`, {
        method: "POST",
        headers: getAuthHeaders(context.req),
        body: JSON.stringify({ message })
      });
    }
  }
};

export default resolvers;
