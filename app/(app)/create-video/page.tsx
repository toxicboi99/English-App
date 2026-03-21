import { VideoStudio } from "@/components/create-video/video-studio";
import { getCurrentUser } from "@/lib/auth";
import { getRecordingPrompts } from "@/lib/data";

export default async function CreateVideoPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const youtubeConnected =
    user.oauthAccounts.some((account) => account.provider === "YOUTUBE") ||
    Boolean(process.env.YOUTUBE_REFRESH_TOKEN);
  const prompts = await getRecordingPrompts();

  return (
    <VideoStudio
      prompts={JSON.parse(JSON.stringify(prompts))}
      youtubeConnected={youtubeConnected}
    />
  );
}
