import { apiSuccess, handleApiError } from "@/lib/api";
import { generateGrammarFeedback } from "@/lib/groq";
import { requireMobileSessionUser } from "@/lib/mobile-auth";
import { grammarSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    await requireMobileSessionUser(request);
    const body = grammarSchema.parse(await request.json());
    const feedback = await generateGrammarFeedback(body.text);
    return apiSuccess(feedback);
  } catch (error) {
    return handleApiError(error);
  }
}
