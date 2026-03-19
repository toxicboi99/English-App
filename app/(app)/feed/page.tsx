import { FeedClient } from "@/components/feed/feed-client";
import { getCurrentUser } from "@/lib/auth";
import { getFeedPosts } from "@/lib/data";

export default async function FeedPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const posts = await getFeedPosts(user.id);

  return <FeedClient initialPosts={JSON.parse(JSON.stringify(posts))} />;
}
