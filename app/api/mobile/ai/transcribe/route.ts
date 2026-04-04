import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { requireMobileSessionUser } from "@/lib/mobile-auth";

const defaultTranscriptionModel =
  process.env.GROQ_TRANSCRIPTION_MODEL ?? "whisper-large-v3-turbo";

export async function POST(request: Request) {
  try {
    await requireMobileSessionUser(request);

    const formData = await request.formData();
    const file = formData.get("file");
    const language = formData.get("language");

    if (!(file instanceof File)) {
      return apiError("Attach an audio recording before requesting a transcript.", 422);
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return apiError(
        "Speech transcription is not configured on the backend yet. Add GROQ_API_KEY to enable voice transcription.",
        503,
      );
    }

    const upstreamBody = new FormData();
    upstreamBody.append("model", defaultTranscriptionModel);
    upstreamBody.append("file", file, file.name || "mobile-recording.m4a");

    if (typeof language === "string" && language.trim()) {
      upstreamBody.append("language", language.trim());
    }

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: upstreamBody,
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          text?: string;
          error?: {
            message?: string;
          };
        }
      | null;

    if (!response.ok) {
      return apiError(
        payload?.error?.message ??
          `Transcription failed with status ${response.status}.`,
        response.status,
      );
    }

    const transcript = payload?.text?.trim();

    if (!transcript) {
      return apiError("The recording was uploaded, but no transcript was returned.", 502);
    }

    return apiSuccess({ transcript });
  } catch (error) {
    return handleApiError(error);
  }
}
