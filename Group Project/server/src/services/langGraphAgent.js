import dotenv from "dotenv";
dotenv.config();

import { StateGraph, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import Issue from "../models/Issue.js";

// ✅ ИСПРАВЛЕНО: Правильная инициализация Gemini модели
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash-exp",
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.3,
});

// ==================== ИНСТРУМЕНТЫ (TOOLS) ====================

// Tool 1: Получение аналитики
const getAnalyticsTool = {
  name: "get_analytics",
  description:
    "Получает статистику по всем проблемам: количество открытых, в работе, решённых, распределение по категориям",
  schema: {
    type: "object",
    properties: {},
  },
  func: async () => {
    const issues = await Issue.find();
    const openCount = issues.filter((i) => i.status === "open").length;
    const inProgressCount = issues.filter(
      (i) => i.status === "in_progress",
    ).length;
    const resolvedCount = issues.filter((i) => i.status === "resolved").length;

    const categoryMap = {};
    issues.forEach((issue) => {
      const cat = issue.category || "General";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    return JSON.stringify({
      total: issues.length,
      open: openCount,
      inProgress: inProgressCount,
      resolved: resolvedCount,
      categories: categoryMap,
    });
  },
};

// Tool 2: Поиск проблем
const searchIssuesTool = {
  name: "search_issues",
  description: "Ищет проблемы по категории или статусу",
  schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description: "Категория проблемы (potholes, streetlights, flooding)",
      },
      status: {
        type: "string",
        description: "Статус проблемы (open, in_progress, resolved)",
      },
    },
  },
  func: async ({ category, status }) => {
    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;

    const issues = await Issue.find(query).limit(5);
    return JSON.stringify(
      issues.map((i) => ({
        id: i._id,
        title: i.title,
        category: i.category,
        status: i.status,
        createdAt: i.createdAt,
      })),
    );
  },
};

// Tool 3: Обнаружение трендов
const detectTrendsTool = {
  name: "detect_trends",
  description: "Находит самые частые категории проблем за последние 7 дней",
  schema: {
    type: "object",
    properties: {},
  },
  func: async () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentIssues = await Issue.find({ createdAt: { $gte: weekAgo } });

    const trendMap = {};
    recentIssues.forEach((issue) => {
      const cat = issue.category || "General";
      trendMap[cat] = (trendMap[cat] || 0) + 1;
    });

    const trends = Object.entries(trendMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return JSON.stringify({
      totalLastWeek: recentIssues.length,
      topTrends: trends.map(([category, count]) => ({ category, count })),
    });
  },
};

// Tool 4: Классификация проблемы
const classifyIssueTool = {
  name: "classify_issue",
  description: "Предлагает категорию для новой проблемы на основе её описания",
  schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Заголовок проблемы" },
      description: { type: "string", description: "Описание проблемы" },
    },
    required: ["title", "description"],
  },
  func: async ({ title, description }) => {
    const categories = [
      "potholes",
      "streetlights",
      "flooding",
      "safety",
      "trash",
      "graffiti",
      "parks",
      "sidewalks",
      "traffic",
      "noise",
      "other",
    ];

    const text = `${title} ${description}`.toLowerCase();

    // Простая эвристика для классификации
    if (
      text.includes("pothole") ||
      text.includes("hole") ||
      text.includes("road")
    )
      return "potholes";
    if (
      text.includes("light") ||
      text.includes("lamp") ||
      text.includes("dark")
    )
      return "streetlights";
    if (text.includes("flood") || text.includes("water")) return "flooding";
    if (text.includes("trash") || text.includes("garbage")) return "trash";
    if (text.includes("graffiti") || text.includes("vandal")) return "graffiti";
    if (text.includes("park") || text.includes("tree")) return "parks";
    if (text.includes("sidewalk") || text.includes("pavement"))
      return "sidewalks";
    if (text.includes("traffic") || text.includes("car")) return "traffic";

    return "other";
  },
};

const tools = [
  getAnalyticsTool,
  searchIssuesTool,
  detectTrendsTool,
  classifyIssueTool,
];

// ==================== ГРАФ СОСТОЯНИЙ ====================

// Определение состояния
const graphState = {
  messages: {
    value: (x, y) => x.concat(y),
    default: () => [],
  },
  analytics: {
    value: (x, y) => y ?? x,
    default: () => null,
  },
  result: {
    value: (x, y) => y ?? x,
    default: () => "",
  },
};

// Node 1: Анализ запроса
async function analyzeNode(state) {
  const userMessage = state.messages[state.messages.length - 1].content;

  let intent = "general";
  const lowerMsg = userMessage.toLowerCase();

  if (
    lowerMsg.includes("analytics") ||
    lowerMsg.includes("statistics") ||
    lowerMsg.includes("stats")
  ) {
    intent = "analytics";
  } else if (lowerMsg.includes("search") || lowerMsg.includes("find")) {
    intent = "search";
  } else if (lowerMsg.includes("trend") || lowerMsg.includes("pattern")) {
    intent = "trends";
  } else if (lowerMsg.includes("classify") || lowerMsg.includes("category")) {
    intent = "classify";
  }

  return {
    ...state,
    intent,
  };
}

// Node 2: Выполнение инструмента
async function executeNode(state) {
  const { intent, messages } = state;
  const userMessage = messages[messages.length - 1].content;

  let toolResult;

  try {
    switch (intent) {
      case "analytics":
        toolResult = await getAnalyticsTool.func({});
        break;
      case "search":
        toolResult = await searchIssuesTool.func({ status: "open" });
        break;
      case "trends":
        toolResult = await detectTrendsTool.func({});
        break;
      case "classify":
        toolResult = await classifyIssueTool.func({
          title: userMessage,
          description: userMessage,
        });
        break;
      default:
        toolResult = await getAnalyticsTool.func({});
    }
  } catch (error) {
    console.error("Tool execution error:", error);
    toolResult = JSON.stringify({ error: "Failed to execute tool" });
  }

  return {
    ...state,
    analytics: toolResult
  };
}

// Node 3: Генерация ответа
async function respondNode(state) {
  const { messages, analytics } = state;
  const userMessage = messages[messages.length - 1].content;

  const prompt = `
You are CivicCase AI, a municipal issue analysis assistant.
User question: ${userMessage}
Data from tools: ${analytics}

Provide a concise, helpful answer based ONLY on the data provided.
Keep it under 3 paragraphs.
`;

  try {
    const response = await model.invoke([{ role: "user", content: prompt }]);

    return {
      ...state,
      result: response.content,
    };
  } catch (error) {
    console.error("Gemini API error:", error);
    return {
      ...state,
      result: `I found the following data: ${analytics}. However, I encountered an error generating a natural language response.`,
    };
  }
}

// Построение графа
function buildGraph() {
  const workflow = new StateGraph({ channels: graphState });

  // Добавляем узлы
  workflow.addNode("analyze", analyzeNode);
  workflow.addNode("execute", executeNode);
  workflow.addNode("respond", respondNode);

  // Определяем рёбра (последовательность выполнения)
  workflow.addEdge("__start__", "analyze");
  workflow.addEdge("analyze", "execute");
  workflow.addEdge("execute", "respond");
  workflow.addEdge("respond", END);

  return workflow.compile();
}

// ==================== ЭКСПОРТ ====================

export const runLangGraphAgent = async (userMessage) => {
  const graph = buildGraph();

  const initialState = {
    messages: [{ role: "user", content: userMessage }],
    analytics: null,
    result: "",
  };

  try {
    const result = await graph.invoke(initialState);
    return {
      reply: result.result,
      analytics: result.analytics,
      aiEnabled: true,
    };
  } catch (error) {
    console.error("LangGraph agent error:", error);
    return {
      reply:
        "Sorry, I encountered an error processing your request. Please try again.",
      analytics: null,
      aiEnabled: false,
    };
  }
};
