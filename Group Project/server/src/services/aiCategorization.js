import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// ✅ ПРАВИЛЬНАЯ инициализация с параметром model
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash-exp", // ← ЭТО ОБЯЗАТЕЛЬНО!
  apiKey: "AIzaSyC6NMYT8G5VS17443obezVlJqBzndw-Ius", // твой ключ
  temperature: 0.1,
});

const CATEGORIES = [
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

export const suggestCategory = async (title, description) => {
  const prompt = `
You are an AI classifier for municipal issues.
Given the following issue report, choose the MOST appropriate category from this list:
${CATEGORIES.join(", ")}

Title: ${title}
Description: ${description}

Respond with ONLY ONE category name from the list above. No explanations.
`;

  try {
    const response = await model.invoke([{ role: "user", content: prompt }]);
    const suggestedCategory = response.content.trim().toLowerCase();

    // Валидация
    if (CATEGORIES.includes(suggestedCategory)) {
      return suggestedCategory;
    }

    // Фоллбэк
    return "other";
  } catch (error) {
    console.error("AI categorization error:", error);
    return "other";
  }
};
