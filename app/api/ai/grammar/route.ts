import { apiSuccess, handleApiError } from "@/lib/api";
import { requireCurrentUser } from "@/lib/auth";
import { generateGrammarFeedback } from "@/lib/groq";
import { grammarSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    await requireCurrentUser();
    const body = grammarSchema.parse(await request.json());
    const feedback = await generateGrammarFeedback(body.text);
    return apiSuccess(feedback);
  } catch (error) {
    return handleApiError(error);
  }
}
