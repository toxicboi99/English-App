import { FriendsClient } from "@/components/friends/friends-client";
import { getCurrentUser } from "@/lib/auth";
import { getFriendsData } from "@/lib/data";

export default async function FriendsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const data = await getFriendsData(user.id);

  return <FriendsClient initialData={JSON.parse(JSON.stringify(data))} />;
}
