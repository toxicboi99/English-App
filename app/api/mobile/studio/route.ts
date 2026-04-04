import { apiSuccess, handleApiError } from "@/lib/api";
import { getRecordingPrompts } from "@/lib/data";
import { requireMobileSessionUser } from "@/lib/mobile-auth";

export async function GET(request: Request) {
  try {
    const user = await requireMobileSessionUser(request);
    const prompts = await getRecordingPrompts();
    const canUpload =
      user.oauthAccounts.some((account) => account.provider === "YOUTUBE") ||
      Boolean(process.env.YOUTUBE_REFRESH_TOKEN);
    const baseUrl = new URL(request.url);
    const youtubeConnectUrl = new URL("/api/youtube/oauth/start", baseUrl).toString();

    return apiSuccess({
      canUpload,
      prompts,
      youtubeConnectUrl,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
