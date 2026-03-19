type GrammarFeedback = {
  correctedText: string;
  explanation: string;
};

function buildFallbackFeedback(text: string): GrammarFeedback {
  const normalized = text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\bi\b/g, "I");

  const correctedText = normalized
    ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
    : text;

  return {
    correctedText,
    explanation:
      "Ollama is not available right now, so SpeakUp used a lightweight local fallback instead of model-based grammar coaching.",
  };
}

export async function generateGrammarFeedback(text: string): Promise<GrammarFeedback> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL ?? "qwen3:4b";

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: false,
        format: {
          type: "object",
          properties: {
            correctedText: { type: "string" },
            explanation: { type: "string" },
          },
          required: ["correctedText", "explanation"],
          additionalProperties: false,
        },
        options: {
          temperature: 0,
        },
        messages: [
          {
            role: "system",
            content:
              "You are an English coach. Rewrite the learner's text with better grammar and clarity. Keep the original meaning. Return only JSON that matches the requested schema.",
          },
          {
            role: "user",
            content: `Improve this English sentence or paragraph for grammar and natural phrasing while keeping it simple:\n\n${text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      message?: {
        content?: string;
      };
      error?: string;
    };

    if (!payload.message?.content) {
      throw new Error(payload.error ?? "Ollama returned an empty response.");
    }

    const parsed = JSON.parse(payload.message.content) as GrammarFeedback;

    if (!parsed.correctedText || !parsed.explanation) {
      throw new Error("Ollama response did not match the expected structure.");
    }

    return parsed;
  } catch {
    return buildFallbackFeedback(text);
  }
}
