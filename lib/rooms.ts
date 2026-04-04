import { prisma } from "@/lib/prisma";

const roomLifetimeMs = 24 * 60 * 60 * 1000;

export function getRoomExpiryCutoff(now = Date.now()) {
  return new Date(now - roomLifetimeMs);
}

export async function cleanupExpiredRooms() {
  return prisma.room.deleteMany({
    where: {
      createdAt: {
        lt: getRoomExpiryCutoff(),
      },
    },
  });
}
