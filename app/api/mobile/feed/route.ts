import { apiSuccess, handleApiError } from "@/lib/api";
import { getFeedPosts } from "@/lib/data";
import { requireMobileSessionUser } from "@/lib/mobile-auth";

export async function GET(request: Request) {
  try {
    const user = await requireMobileSessionUser(request);
    const posts = await getFeedPosts(user.id);
    return apiSuccess({ posts });
  } catch (error) {
    return handleApiError(error);
  }
}
