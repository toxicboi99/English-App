import { RoomsClient } from "@/components/rooms/rooms-client";
import { getCurrentUser } from "@/lib/auth";
import { getRoomsData } from "@/lib/data";

export default async function DebateRoomsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const rooms = await getRoomsData(user.id);

  return <RoomsClient initialRooms={JSON.parse(JSON.stringify(rooms))} />;
}
