import { VideoStudio } from "@/components/create-video/video-studio";
import { getCurrentUser } from "@/lib/auth";

export default async function CreateVideoPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const youtubeConnected =
    user.oauthAccounts.some((account) => account.provider === "YOUTUBE") ||
    Boolean(process.env.YOUTUBE_REFRESH_TOKEN);

  return <VideoStudio youtubeConnected={youtubeConnected} />;
}
