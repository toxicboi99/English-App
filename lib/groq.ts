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
      "Groq is not available right now, so SpeakUp used a lightweight local fallback instead of model-based grammar coaching.",
  };
}

export async function generateGrammarFeedback(text: string): Promise<GrammarFeedback> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

  try {
    if (!apiKey) {
      throw new Error("Missing GROQ_API_KEY.");
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content:
              'You are an English coach for learners. Make the smallest possible correction needed for grammar, punctuation, or natural phrasing. If the text is already correct and natural, keep correctedText the same apart from trimming extra spaces. Do not change verb tense, aspect, meaning, or tone unless the original is clearly wrong. Prefer correcting over rewriting. Keep explanation short and learner-friendly. Respond with JSON only using this exact shape: {"correctedText":"...","explanation":"..."}.',
          },
          {
            role: "user",
            content: `Improve this English sentence or paragraph for grammar and natural phrasing while keeping it simple:\n\n${text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
        };
      }>;
      error?: {
        message?: string;
      };
    };

    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(payload.error?.message ?? "Groq returned an empty response.");
    }

    const parsed = JSON.parse(content) as Partial<GrammarFeedback>;

    if (
      typeof parsed.correctedText !== "string" ||
      typeof parsed.explanation !== "string" ||
      !parsed.correctedText ||
      !parsed.explanation
    ) {
      throw new Error("Groq response did not match the expected structure.");
    }

    return {
      correctedText: parsed.correctedText,
      explanation: parsed.explanation,
    };
  } catch {
    return buildFallbackFeedback(text);
  }
}
