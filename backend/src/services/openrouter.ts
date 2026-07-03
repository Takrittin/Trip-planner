type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: OpenRouterMessageContent;
    };
  }>;
  error?: {
    message?: string;
  };
};

type OpenRouterMessageContent = string | Array<{ type?: string; text?: string }> | undefined;

function getMessageContent(content: OpenRouterMessageContent): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === "text" || !part.type ? part.text ?? "" : ""))
      .join("")
      .trim();
  }

  return "";
}

function getMaxTokens() {
  const value = Number(process.env.OPENROUTER_MAX_TOKENS);

  if (Number.isInteger(value) && value > 0) {
    return value;
  }

  return 2500;
}

export async function generateItineraryWithOpenRouter(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey || apiKey === "your_openrouter_api_key_here") {
    throw new Error("Missing OPENROUTER_API_KEY in backend environment.");
  }

  if (apiKey.toLowerCase().startsWith("bearer ")) {
    throw new Error("OPENROUTER_API_KEY should contain only the API key, without the Bearer prefix.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_NAME || "AI Trip Map Planner"
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free",
      messages: [
        {
          role: "system",
          content:
            "You are a travel planning assistant. Return only valid JSON. Do not include markdown, comments, or explanations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: getMaxTokens(),
      temperature: 0.4
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenRouter request failed with status ${response.status}. ${errorText || response.statusText}`
    );
  }

  const data = (await response.json()) as OpenRouterResponse;
  const content = getMessageContent(data.choices?.[0]?.message?.content);

  if (!content) {
    throw new Error("OpenRouter returned no itinerary content.");
  }

  return content;
}
