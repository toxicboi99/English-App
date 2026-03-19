import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("Unauthorized.", 401);
    }

    return apiSuccess({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
