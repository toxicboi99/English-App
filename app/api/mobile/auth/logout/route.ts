import { apiSuccess, handleApiError } from "@/lib/api";
import { clearAuthCookie } from "@/lib/auth";

export async function POST() {
  try {
    return clearAuthCookie(apiSuccess({ success: true }));
  } catch (error) {
    return handleApiError(error);
  }
}
