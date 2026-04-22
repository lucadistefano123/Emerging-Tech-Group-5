import Issue from "../models/Issue.js";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Lazy initialization of Gemini model
let model = null;
let aiDisabledReason = "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const VALID_CLASSIFICATION_CATEGORIES = [
  "Infrastructure",
  "Environment",
  "Safety",
  "Transportation",
  "Utilities",
  "Health",
  "Education",
  "Other"
];

const isBlockedApiKeyError = (error) => {
  const message = String(error?.message ?? "").toLowerCase();
  return error?.status === 403 && (message.includes("api key was reported as leaked") || message.includes("forbidden"));
};

const disableAi = (reason) => {
  aiDisabledReason = reason;
  model = null;
};

const getModel = () => {
  if (aiDisabledReason) {
    return null;
  }

  if (!model && process.env.GOOGLE_API_KEY) {
    try {
      model = new ChatGoogleGenerativeAI({
        model: GEMINI_MODEL,
        apiKey: process.env.GOOGLE_API_KEY,
        temperature: 0.3,
      });
    } catch (error) {
      console.error("Failed to initialize Gemini model:", error);
      return null;
    }
  }
  return model;
};

const analyticsTool = tool(async () => {
  try {
    const issues = await Issue.find();
    const statusCounts = [
      { label: "open", value: issues.filter(i => i.status === "open").length },
      { label: "in progress", value: issues.filter(i => i.status === "in_progress").length },
      { label: "resolved", value: issues.filter(i => i.status === "resolved").length }
    ];
    const categoryMap = new Map();
    issues.forEach(issue => {
      const cat = issue.category || "General";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });
    const categoryCounts = Array.from(categoryMap.entries()).map(([label, value]) => ({ label, value }));

    return {
      totalIssues: issues.length,
      statusCounts,
      categoryCounts,
      summary: `Total issues: ${issues.length}, Open: ${statusCounts[0].value}, In Progress: ${statusCounts[1].value}, Resolved: ${statusCounts[2].value}`
    };
  } catch (error) {
    console.error("Analytics tool error:", error);
    return { totalIssues: 0, statusCounts: [], categoryCounts: [], summary: "Error retrieving analytics" };
  }
}, {
  name: "analytics",
  description: "Get comprehensive analytics about municipal issues including counts by status and category",
  schema: z.object({}),
});

const searchTool = tool(async ({ query }) => {
  try {
    const issues = await Issue.find({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } }
      ]
    }).limit(10);

    const results = issues.map(issue => ({
      id: issue._id.toString(),
      title: issue.title,
      description: issue.description.substring(0, 200),
      category: issue.category,
      status: issue.status,
      createdAt: issue.createdAt
    }));

    return {
      results,
      count: results.length,
      summary: `Found ${results.length} issues matching "${query}"`
    };
  } catch (error) {
    console.error("Search tool error:", error);
    return { results: [], count: 0, summary: "Error performing search" };
  }
}, {
  name: "search",
  description: "Search for municipal issues by title or description",
  schema: z.object({
    query: z.string().describe("The search query to find relevant issues"),
  }),
});

const trendsTool = tool(async () => {
  try {
    const issues = await Issue.find().sort({ createdAt: -1 });

    const trendMap = new Map();
    issues.forEach(issue => {
      const date = new Date(issue.createdAt).toISOString().slice(0, 10);
      trendMap.set(date, (trendMap.get(date) || 0) + 1);
    });
    const dailyTrend = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([label, value]) => ({ label, value }));

    const categoryClusters = {};
    issues.forEach(issue => {
      const category = issue.category || "General";
      if (!categoryClusters[category]) {
        categoryClusters[category] = [];
      }
      categoryClusters[category].push({
        id: issue._id.toString(),
        title: issue.title,
        description: issue.description.substring(0, 100)
      });
    });

    const clusters = [];
    Object.entries(categoryClusters).forEach(([category, issues]) => {
      if (issues.length > 1) {
        const keywordGroups = {};
        issues.forEach(issue => {
          const keywords = issue.title.toLowerCase().split(/\s+/).filter(word => word.length > 3);
          const key = keywords.slice(0, 2).join(' ');

          if (!keywordGroups[key]) {
            keywordGroups[key] = [];
          }
          keywordGroups[key].push(issue);
        });

        Object.entries(keywordGroups).forEach(([key, group]) => {
          if (group.length > 1) {
            clusters.push({
              category,
              clusterKey: key,
              count: group.length,
              examples: group.slice(0, 3).map(i => i.title)
            });
          }
        });
      }
    });

    return {
      dailyTrend,
      clusters,
      summary: `Daily trends: ${dailyTrend.map(t => `${t.label}: ${t.value}`).join(', ')}. Found ${clusters.length} issue clusters.`
    };
  } catch (error) {
    console.error("Trends tool error:", error);
    return { dailyTrend: [], clusters: [], summary: "Error analyzing trends" };
  }
}, {
  name: "trends",
  description: "Analyze trends and identify clusters of similar municipal issues over time",
  schema: z.object({}),
});

const classifyTool = tool(async ({ issueId }) => {
  try {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      return { category: "General", confidence: 0, summary: "Issue not found" };
    }

    const llm = getModel();
    if (!llm) {
      return {
        category: issue.category?.trim() || "General",
        confidence: 0,
        issueId,
        title: issue.title,
        summary: "AI classification unavailable"
      };
    }

    const prompt = `Classify this municipal issue into one of these categories: Infrastructure, Environment, Safety, Transportation, Utilities, Health, Education, Other.

Issue Title: ${issue.title}
Issue Description: ${issue.description}

Respond with ONLY the category name.`;

    const response = await llm.invoke([{
      role: "user",
      content: prompt
    }]);

    const category = String(response.content ?? "").trim();
    const finalCategory = VALID_CLASSIFICATION_CATEGORIES.includes(category) ? category : (issue.category?.trim() || "General");

    return {
      category: finalCategory,
      issueId: issueId,
      title: issue.title,
      summary: `Issue "${issue.title}" classified as ${finalCategory}`
    };
    } catch (error) {
      if (isBlockedApiKeyError(error)) {
        disableAi("Google rejected the configured Gemini API key.");
      }
      console.error("Classify tool error:", error);
      return { category: "General", confidence: 0, summary: "Error classifying issue" };
    }
}, {
  name: "classify",
  description: "Classify a specific municipal issue into predefined categories using AI",
  schema: z.object({
    issueId: z.string().describe("The ID of the issue to classify"),
  }),
});

const summarizeTool = tool(async ({ issueId }) => {
  try {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      return { summary: "Issue not found", issueId };
    }

    const llm = getModel();
    if (!llm) {
      return {
        summary: issue.description.substring(0, 200) + (issue.description.length > 200 ? "..." : ""),
        issueId: issueId,
        title: issue.title,
        aiGenerated: false
      };
    }

    const prompt = `Summarize this municipal issue in 2-3 sentences, focusing on the key problem, location, and impact:

Issue Title: ${issue.title}
Issue Description: ${issue.description}
Category: ${issue.category || "General"}
Status: ${issue.status}

Provide a concise summary that captures the essence of the issue.`;

    const response = await llm.invoke([{
      role: "user",
      content: prompt
    }]);

    return {
      summary: String(response.content ?? "").trim(),
      issueId: issueId,
      title: issue.title,
      category: issue.category,
      status: issue.status,
      aiGenerated: true
    };
    } catch (error) {
      if (isBlockedApiKeyError(error)) {
        disableAi("Google rejected the configured Gemini API key.");
      }
      console.error("Summarize tool error:", error);
      return { summary: "Error generating summary", issueId, aiGenerated: false };
    }
}, {
  name: "summarize",
  description: "Generate an AI-powered concise summary of a specific municipal issue",
  schema: z.object({
    issueId: z.string().describe("The ID of the issue to summarize"),
  }),
});

const sentimentTool = tool(async ({ issueId }) => {
  try {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      return { sentiment: "neutral", confidence: 0, summary: "Issue not found" };
    }

    const llm = getModel();
    if (!llm) {
      return {
        sentiment: "neutral",
        confidence: 0,
        issueId: issueId,
        title: issue.title,
        summary: "AI sentiment analysis unavailable"
      };
    }

    const prompt = `Analyze the sentiment of this municipal issue report. Classify as positive, negative, or neutral, and provide a confidence score (0-1).

Issue Title: ${issue.title}
Issue Description: ${issue.description}

Respond with JSON format: {"sentiment": "positive|negative|neutral", "confidence": 0.85, "reasoning": "brief explanation"}`;

    const response = await llm.invoke([{
      role: "user",
      content: prompt
    }]);

    let sentimentData;
    try {
      const content = String(response.content ?? "").trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      sentimentData = jsonMatch ? JSON.parse(jsonMatch[0]) : { sentiment: "neutral", confidence: 0.5, reasoning: "Unable to parse response" };
    } catch (parseError) {
      sentimentData = { sentiment: "neutral", confidence: 0.5, reasoning: "Parse error" };
    }

    return {
      sentiment: sentimentData.sentiment || "neutral",
      confidence: sentimentData.confidence || 0.5,
      reasoning: sentimentData.reasoning || "Analysis completed",
      issueId: issueId,
      title: issue.title,
      summary: `Issue "${issue.title}" has ${sentimentData.sentiment || "neutral"} sentiment`
    };
    } catch (error) {
      if (isBlockedApiKeyError(error)) {
        disableAi("Google rejected the configured Gemini API key.");
      }
      console.error("Sentiment tool error:", error);
      return { sentiment: "neutral", confidence: 0, summary: "Error analyzing sentiment" };
    }
}, {
  name: "sentiment",
  description: "Analyze the sentiment of a municipal issue report using AI",
  schema: z.object({
    issueId: z.string().describe("The ID of the issue to analyze sentiment for"),
  }),
});

const safetyAlertsTool = tool(async () => {
  try {
    // Focus on infrastructure issues like potholes and flooding that could pose safety risks
    const safetyIssues = await Issue.find({
      $or: [
        { category: { $regex: /infrastructure|transportation|safety/i } },
        { title: { $regex: /pothole|flood|dangerous|unsafe|hazard/i } },
        { description: { $regex: /pothole|flood|dangerous|unsafe|hazard/i } }
      ],
      status: { $in: ["open", "in_progress"] }
    }).sort({ createdAt: -1 }).limit(10);

    const alerts = safetyIssues.map(issue => ({
      id: issue._id.toString(),
      title: issue.title,
      category: issue.category,
      status: issue.status,
      location: issue.latitude && issue.longitude ? `${issue.latitude}, ${issue.longitude}` : "Location not specified",
      createdAt: issue.createdAt,
      priority: issue.category?.toLowerCase().includes("safety") || 
               issue.title.toLowerCase().includes("dangerous") || 
               issue.description.toLowerCase().includes("hazard") ? "high" : "medium"
    }));

    const highPriorityCount = alerts.filter(alert => alert.priority === "high").length;

    return {
      alerts,
      totalAlerts: alerts.length,
      highPriorityCount,
      summary: `Found ${alerts.length} active safety-related issues (${highPriorityCount} high priority). Focus areas: potholes, flooding, and infrastructure hazards.`
    };
  } catch (error) {
    console.error("Safety alerts tool error:", error);
    return { alerts: [], totalAlerts: 0, highPriorityCount: 0, summary: "Error retrieving safety alerts" };
  }
}, {
  name: "safety_alerts",
  description: "Get active safety alerts for infrastructure issues like potholes and flooding hazards",
  schema: z.object({}),
});

const createAgent = () => {
  const llm = getModel();

  const agent = async (messages) => {
    try {
      const lastMessage = messages[messages.length - 1];
      const userQuery = lastMessage.content.toLowerCase();

      let toolResults = {};

      if (userQuery.includes("analytics") || userQuery.includes("how many") || userQuery.includes("total") || userQuery.includes("count")) {
        toolResults.analytics = await analyticsTool.invoke({});
      }

      if (userQuery.includes("search") || userQuery.includes("find")) {
        const query = userQuery.includes("search") ? lastMessage.content.split("search")[1]?.trim() || lastMessage.content : lastMessage.content;
        toolResults.search = await searchTool.invoke({ query });
      }

      if (userQuery.includes("trend") || userQuery.includes("over time") || userQuery.includes("daily")) {
        toolResults.trends = await trendsTool.invoke({});
      }

      if (userQuery.includes("classify") || userQuery.includes("category")) {
        const issues = await Issue.find().limit(1);
        if (issues.length > 0) {
          toolResults.classify = await classifyTool.invoke({ issueId: issues[0]._id.toString() });
        }
      }

      if (userQuery.includes("summarize") || userQuery.includes("summary")) {
        const issues = await Issue.find().limit(1);
        if (issues.length > 0) {
          toolResults.summarize = await summarizeTool.invoke({ issueId: issues[0]._id.toString() });
        }
      }

      if (userQuery.includes("sentiment") || userQuery.includes("feeling") || userQuery.includes("mood")) {
        const issues = await Issue.find().limit(1);
        if (issues.length > 0) {
          toolResults.sentiment = await sentimentTool.invoke({ issueId: issues[0]._id.toString() });
        }
      }

      if (userQuery.includes("safety") || userQuery.includes("alert") || userQuery.includes("danger") || userQuery.includes("hazard") || userQuery.includes("pothole") || userQuery.includes("flood")) {
        toolResults.safety_alerts = await safetyAlertsTool.invoke({});
      }

      // If no tools were triggered, run analytics as default
      if (Object.keys(toolResults).length === 0) {
        toolResults.analytics = await analyticsTool.invoke({});
      }

      if (!llm) {
        const fallbackParts = [];

        if (toolResults.analytics?.summary) {
          fallbackParts.push(toolResults.analytics.summary);
        }
        if (toolResults.search?.count !== undefined) {
          fallbackParts.push(toolResults.search.summary);
        }
        if (toolResults.trends?.summary) {
          fallbackParts.push(toolResults.trends.summary);
        }
        if (toolResults.classify?.summary) {
          fallbackParts.push(toolResults.classify.summary);
        }
        if (toolResults.summarize?.summary) {
          fallbackParts.push(`Summary: ${toolResults.summarize.summary}`);
        }
        if (toolResults.sentiment?.summary) {
          fallbackParts.push(toolResults.sentiment.summary);
        }
        if (toolResults.safety_alerts?.summary) {
          fallbackParts.push(toolResults.safety_alerts.summary);
        }

        return {
          messages: [...messages, {
            role: "assistant",
            content: fallbackParts.join(" ") || "I found some issue data, but the AI model is currently unavailable.",
            toolResults
          }]
        };
      }

      const resultsStr = JSON.stringify(toolResults, null, 2);
      const prompt = `You are CivicCase AI, a municipal issue analysis assistant.

Based on the tool results below, provide a helpful response to: "${lastMessage.content}"

Tool Results: ${resultsStr}

Provide a concise, informative response about the municipal issues.`;

      const response = await llm.invoke([{
        role: "user",
        content: prompt
      }]);

      return {
        messages: [...messages, {
          role: "assistant",
          content: String(response.content ?? ""),
          toolResults
        }]
      };

    } catch (error) {
      if (isBlockedApiKeyError(error)) {
        disableAi("Google rejected the configured Gemini API key.");
      }
      console.error("Agent execution error:", error);
      return {
        messages: [...messages, {
          role: "assistant",
          content: aiDisabledReason
            ? "The Gemini API key is unavailable, so I switched to analytics-only mode."
            : "I encountered an error while processing your request. Let me provide some basic analytics instead.",
          error: true
        }]
      };
    }
  };

  return agent;
};

let agent = null;
const getAgent = () => {
  if (!agent) {
    agent = createAgent();
  }
  return agent;
};

export const getChatbotReply = async (message) => {
  try {
    console.log("Chatbot called with message:", message);
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey || aiDisabledReason) {
      console.log(!apiKey ? "No API key available" : `AI disabled: ${aiDisabledReason}`);
      // Fallback without AI
      const issues = await Issue.find();
      const analytics = buildAnalytics(issues);
      return {
        reply: aiDisabledReason
          ? `${aiDisabledReason} Showing the latest issue analytics instead.`
          : "AI service is currently unavailable. Here are the current analytics.",
        analytics,
        aiEnabled: false
      };
    }

    console.log("API key available, initializing LangGraph agent");
    // Use LangGraph agent
    const agentInstance = getAgent();
    console.log("Agent instance created");

    const systemPrompt = `You are CivicCase AI, an intelligent municipal issue analysis assistant powered by LangGraph.

You have access to these tools:
- analytics: Get comprehensive analytics about municipal issues
- search: Search for specific issues by title or description
- trends: Analyze trends and identify clusters of similar issues
- classify: Classify issues into categories using AI
- summarize: Generate AI-powered concise summaries of issues
- sentiment: Analyze the sentiment of issue reports
- safety_alerts: Get active safety alerts for infrastructure issues like potholes and flooding hazards

Always use the appropriate tools to provide accurate, helpful responses about municipal issues.
Be concise but informative in your responses.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ];

    console.log("Invoking agent with messages:", messages.length);
    const result = await agentInstance(messages);
    console.log("Agent result received");

    // Extract the final response
    const finalMessage = result.messages[result.messages.length - 1];
    let reply = String(finalMessage?.content ?? "").trim();
    const usedAiResponse = !finalMessage?.error;

    console.log("Final reply:", reply);

    // If the response is too generic, enhance it with analytics
    const issues = await Issue.find();
    const analytics = buildAnalytics(issues);
    if (!reply) {
      reply = "I couldn't generate a detailed AI response, but I was able to gather the latest municipal issue analytics.";
    }
    if (reply.includes("I analyzed") || reply.length < 50) {
      reply += `\n\nCurrent system status: ${analytics.totalIssues} total issues (${analytics.openIssues} open, ${analytics.resolvedIssues} resolved).`;
    }

    return {
      reply,
      analytics,
      aiEnabled: usedAiResponse,
      agentUsed: true
    };
  } catch (error) {
    console.error("LangGraph agent error:", error);

    // Fallback to basic analytics
    const issues = await Issue.find();
    const analytics = buildAnalytics(issues);
    return {
      reply: "I apologize, but I'm having trouble processing your request right now. Here are the current analytics.",
      analytics,
      aiEnabled: false,
      agentUsed: false
    };
  }
};

const buildAnalytics = (issues) => {
  const statusCounts = [
    { label: "open", value: issues.filter(i => i.status === "open").length },
    { label: "in progress", value: issues.filter(i => i.status === "in_progress").length },
    { label: "resolved", value: issues.filter(i => i.status === "resolved").length }
  ];

  const categoryMap = new Map();
  issues.forEach(issue => {
    const cat = issue.category || "General";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  });

  const categoryCounts = Array.from(categoryMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const trendMap = new Map();
  issues.forEach(issue => {
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

  const trendClusters = Array.from(categoryMap.entries())
    .map(([label, value]) => ({
      label,
      count: value,
      exampleIssue: issues.find((issue) => (issue.category?.trim() || "General") === label)?.title || "Example report"
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalIssues: issues.length,
    openIssues: issues.filter(issue => issue.status === "open").length,
    inProgressIssues: issues.filter(issue => issue.status === "in_progress").length,
    resolvedIssues: issues.filter(issue => issue.status === "resolved").length,
    statusCounts,
    categoryCounts,
    dailyTrend,
    hotspots,
    trendClusters
  };
};
