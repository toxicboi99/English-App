import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getRoomsData } from "@/lib/data";
import { requireMobileSessionUser } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { safeSlug } from "@/lib/utils";
import { roomSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const user = await requireMobileSessionUser(request);
    const rooms = await getRoomsData(user.id);
    return apiSuccess({ rooms });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireMobileSessionUser(request);
    const body = roomSchema.parse(await request.json());

    if (body.action === "create") {
      if (!body.name) {
        return apiError("Room name is required.", 422);
      }

      const baseSlug = safeSlug(body.name) || "debate-room";
      const slug = `${baseSlug}-${Date.now().toString(36)}`;
      const room = await prisma.room.create({
        data: {
          name: body.name,
          topic: body.topic,
          slug,
          hostId: user.id,
          maxParticipants: body.maxParticipants ?? 4,
          provider: body.provider ?? "LIVEKIT",
          externalRoomId: body.provider === "LIVEKIT" || !body.provider ? slug : null,
          participants: {
            create: {
              userId: user.id,
            },
          },
        },
        include: {
          host: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
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

      return apiSuccess({ room }, 201);
    }

    if (!body.roomId) {
      return apiError("Room id is required.", 422);
    }

    const room = await prisma.room.findUnique({
      where: { id: body.roomId },
      include: {
        participants: true,
      },
    });

    if (!room) {
      return apiError("Room not found.", 404);
    }

    if (body.action === "join") {
      const alreadyJoined = room.participants.some(
        (participant) => participant.userId === user.id,
      );

      if (!alreadyJoined && room.participants.length >= room.maxParticipants) {
        return apiError("This room is already full.", 409);
      }

      await prisma.roomParticipant.upsert({
        where: {
          roomId_userId: {
            roomId: room.id,
            userId: user.id,
          },
        },
        update: {},
        create: {
          roomId: room.id,
          userId: user.id,
        },
      });

      await prisma.room.update({
        where: { id: room.id },
        data: {
          status: room.status === "WAITING" ? "LIVE" : room.status,
        },
      });

      return apiSuccess({ success: true });
    }

    if (body.action === "leave") {
      await prisma.roomParticipant.deleteMany({
        where: {
          roomId: room.id,
          userId: user.id,
        },
      });

      const remaining = await prisma.roomParticipant.count({
        where: { roomId: room.id },
      });

      if (remaining === 0) {
        await prisma.room.update({
          where: { id: room.id },
          data: { status: "ENDED" },
        });
      }

      return apiSuccess({ success: true });
    }

    return apiError("Unsupported room action.", 422);
  } catch (error) {
    return handleApiError(error);
  }
}
