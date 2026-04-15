import Issue from "../models/Issue.js";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const STATUS_ORDER = ["open", "in_progress", "resolved"];

// Simple in-memory cache with 1 hour TTL to reduce API quota usage
const responseCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

const getCacheKey = (message, analyticsSnapshot) => {
  return `${message.toLowerCase()}:${analyticsSnapshot}`;
};

const getCachedReply = (cacheKey) => {
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.reply;
  }
  responseCache.delete(cacheKey);
  return null;
};

const setCachedReply = (cacheKey, reply) => {
  responseCache.set(cacheKey, { reply, timestamp: Date.now() });
};

const normalizeCategory = (category) => category?.trim() || "General";

const getDateKey = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toISOString().slice(0, 10);
};

const buildAnalytics = (issues) => {
  const statusCounts = STATUS_ORDER.map((status) => ({
    label: status.replace("_", " "),
    value: issues.filter((issue) => issue.status === status).length
  }));

  const categoryMap = issues.reduce((accumulator, issue) => {
    const key = normalizeCategory(issue.category);
    accumulator.set(key, (accumulator.get(key) || 0) + 1);
    return accumulator;
  }, new Map());

  const categoryCounts = [...categoryMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);

  const trendMap = issues.reduce((accumulator, issue) => {
    const key = getDateKey(issue.createdAt);
    accumulator.set(key, (accumulator.get(key) || 0) + 1);
    return accumulator;
  }, new Map());

  const dailyTrend = [...trendMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-7)
    .map(([label, value]) => ({ label, value }));

  const hotspots = issues
    .map((issue) => ({
      id: issue._id.toString(),
      title: issue.title,
      category: normalizeCategory(issue.category),
      status: issue.status,
      latitude: issue.latitude,
      longitude: issue.longitude
    }))
    .filter(
      (issue) =>
        Number.isFinite(issue.latitude) &&
        Number.isFinite(issue.longitude)
    );

  return {
    totalIssues: issues.length,
    statusCounts,
    categoryCounts,
    dailyTrend,
    hotspots
  };
};

const getFallbackReply = (message, analytics) => {
  const text = message.toLowerCase();
  const openCount =
    analytics.statusCounts.find((item) => item.label === "open")?.value || 0;
  const progressCount =
    analytics.statusCounts.find((item) => item.label === "in progress")?.value || 0;
  const resolvedCount =
    analytics.statusCounts.find((item) => item.label === "resolved")?.value || 0;
  const topCategory = analytics.categoryCounts[0];

  if (text.includes("open")) {
    return `There are currently ${openCount} open issues across the city.`;
  }

  if (text.includes("resolved")) {
    return `There are ${resolvedCount} resolved issues in the system right now.`;
  }

  if (text.includes("progress")) {
    return `${progressCount} issues are actively being worked on at the moment.`;
  }

  if (text.includes("map") || text.includes("where")) {
    return `I mapped ${analytics.hotspots.length} reported issue locations below so you can spot clusters quickly.`;
  }

  if (text.includes("chart") || text.includes("trend") || text.includes("summary")) {
    return `Here is the current system summary: ${openCount} open, ${progressCount} in progress, and ${resolvedCount} resolved. ${
      topCategory
        ? `${topCategory.label} is the busiest category with ${topCategory.value} reports.`
        : ""
    }`.trim();
  }

  return `I analyzed ${analytics.totalIssues} issues and prepared charts plus a live issue map below. Ask about open tickets, resolved work, trends, categories, or location hotspots for a more focused answer.`;
};

const buildGeminiPrompt = (message, analytics) => {
  const serializedAnalytics = JSON.stringify(analytics, null, 2);

  return `
You are CivicCase AI, a concise municipal issue analysis assistant.
Use only the analytics data provided below.
Mention charts or the map when they support the answer.
Do not invent facts, locations, or counts.
Keep the reply to 3 short paragraphs or fewer.

User question:
${message}

Analytics:
${serializedAnalytics}
`.trim();
};

const getGeminiReply = async (message, analytics) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return getFallbackReply(message, analytics);
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: buildGeminiPrompt(message, analytics) }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 350
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("\n")
      .trim() || "";

  return text || getFallbackReply(message, analytics);
};

export const getChatbotReply = async (message) => {
  const issues = await Issue.find().sort({ createdAt: 1 });
  const analytics = buildAnalytics(issues);
  const analyticsSnapshot = JSON.stringify(analytics);
  const cacheKey = getCacheKey(message, analyticsSnapshot);

  // Check cache first to reduce API quota usage
  const cachedReply = getCachedReply(cacheKey);
  if (cachedReply) {
    return { reply: cachedReply, analytics, aiEnabled: Boolean(process.env.GEMINI_API_KEY) };
  }

  try {
    const reply = await getGeminiReply(message, analytics);
    setCachedReply(cacheKey, reply);
    return { reply, analytics, aiEnabled: Boolean(process.env.GEMINI_API_KEY) };
  } catch (error) {
    const errorMessage = error.message || "";
    const isInvalidKey = errorMessage.includes("API_KEY_INVALID");
    const isQuotaExceeded = errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED");
    let aiStatusMessage;

    if (isInvalidKey) {
      aiStatusMessage = "Gemini API key is invalid, so this answer is using local issue analytics instead.";
    } else if (isQuotaExceeded) {
      aiStatusMessage = "Gemini API quota exceeded, so this answer is using local issue analytics instead. Please upgrade to a paid plan or try again later.";
    } else {
      aiStatusMessage = "Gemini is unavailable right now, so this answer is using local issue analytics instead.";
    }

    console.error("Gemini chatbot error:", errorMessage);

    return {
      reply: `${getFallbackReply(message, analytics)} ${aiStatusMessage}`,
      analytics,
      aiEnabled: false
    };
  }
};
