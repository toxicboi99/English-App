import { apiSuccess, handleApiError } from "@/lib/api";
import { requireMobileSessionUser } from "@/lib/mobile-auth";
import { scoreSpeakingAccuracy } from "@/lib/speaking";
import { speakingFeedbackSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    await requireMobileSessionUser(request);
    const body = speakingFeedbackSchema.parse(await request.json());
    const result = scoreSpeakingAccuracy(body.targetText, body.spokenText);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
