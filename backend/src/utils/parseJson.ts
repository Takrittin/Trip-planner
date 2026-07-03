export function parseAIJsonResponse<T>(content: string): T {
  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence) as T;
  } catch {
    throw new Error("AI returned invalid JSON. Please try generating the trip again.");
  }
}
