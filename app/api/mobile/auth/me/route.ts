import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getMobileSessionUser } from "@/lib/mobile-auth";

export async function GET(request: Request) {
  try {
    const user = await getMobileSessionUser(request);

    if (!user) {
      return apiError("Unauthorized.", 401);
    }

    return apiSuccess({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
