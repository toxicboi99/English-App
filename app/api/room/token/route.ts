import { AccessToken } from "livekit-server-sdk";
import { z } from "zod";

import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const roomTokenSchema = z.object({
  roomId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = roomTokenSchema.parse(await request.json());
    const room = await prisma.room.findUnique({
      where: { id: body.roomId },
      include: {
        participants: true,
      },
    });

    if (!room) {
      return apiError("Room not found.", 404);
    }

    const canEnterRoom =
      room.hostId === user.id ||
      room.participants.some((participant) => participant.userId === user.id);

    if (!canEnterRoom) {
      return apiError("Join the room before requesting a live token.", 403);
    }

    if (room.provider !== "LIVEKIT") {
      return apiSuccess({
        provider: room.provider,
        token: null,
        serverUrl: null,
        mode: "browser-local",
        roomName: room.externalRoomId ?? room.slug,
        message:
          "This room is using browser-local media preview. Switch the room provider to LiveKit for multi-user production sessions.",
      });
    }

    const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!serverUrl || !apiKey || !apiSecret) {
      return apiSuccess({
        provider: room.provider,
        token: null,
        serverUrl: null,
        mode: "browser-local",
        roomName: room.externalRoomId ?? room.slug,
        message:
          "LiveKit is selected for this room, but the server keys are missing. Add NEXT_PUBLIC_LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET to enable real multi-user video.",
      });
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: user.name,
      ttl: "2h",
      metadata: JSON.stringify({
        userId: user.id,
        email: user.email,
        roomId: room.id,
      }),
    });

    token.addGrant({
      room: room.externalRoomId ?? room.slug,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return apiSuccess({
      provider: room.provider,
      token: await token.toJwt(),
      serverUrl,
      mode: "livekit",
      roomName: room.externalRoomId ?? room.slug,
      message:
        "LiveKit production mode is active. Use the pre-join check below, then enter the shared room with camera and microphone.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
