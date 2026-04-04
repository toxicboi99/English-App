import { notFound } from "next/navigation";

import { RoomStage } from "@/components/rooms/room-stage";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cleanupExpiredRooms } from "@/lib/rooms";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  await cleanupExpiredRooms();

  const { slug } = await params;
  const room = await prisma.room.findUnique({
    where: { slug },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });

  if (!room) {
    notFound();
  }

  return (
    <RoomStage
      currentUserId={user.id}
      currentUserName={user.name}
      room={JSON.parse(JSON.stringify(room))}
    />
  );
}
