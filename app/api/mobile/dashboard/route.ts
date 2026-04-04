import { apiSuccess, handleApiError } from "@/lib/api";
import { getDashboardData } from "@/lib/data";
import { requireMobileSessionUser } from "@/lib/mobile-auth";

export async function GET(request: Request) {
  try {
    const user = await requireMobileSessionUser(request);
    const dashboard = await getDashboardData(user.id);
    return apiSuccess(dashboard);
  } catch (error) {
    return handleApiError(error);
  }
}
