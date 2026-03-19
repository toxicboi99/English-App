import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { requireCurrentUser } from "@/lib/auth";
import { getFriendsData } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { friendActionSchema } from "@/lib/validators";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const data = await getFriendsData(user.id);
    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = friendActionSchema.parse(await request.json());

    if (body.action === "send") {
      if (!body.userId) {
        return apiError("Select a user to send a friend request.", 422);
      }

      if (body.userId === user.id) {
        return apiError("You cannot send a friend request to yourself.", 422);
      }

      const existingFriendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            {
              userId: user.id,
              friendId: body.userId,
            },
            {
              userId: body.userId,
              friendId: user.id,
            },
          ],
        },
      });

      if (existingFriendship) {
        return apiError("You are already connected with this learner.", 409);
      }

      const inverseRequest = await prisma.friendRequest.findUnique({
        where: {
          senderId_receiverId: {
            senderId: body.userId,
            receiverId: user.id,
          },
        },
      });

      if (inverseRequest?.status === "PENDING") {
        await prisma.$transaction([
          prisma.friendRequest.update({
            where: { id: inverseRequest.id },
            data: { status: "ACCEPTED" },
          }),
          prisma.friendship.create({
            data: {
              userId: inverseRequest.senderId,
              friendId: inverseRequest.receiverId,
            },
          }),
        ]);

        return apiSuccess({ success: true, autoAccepted: true });
      }

      const existingRequest = await prisma.friendRequest.findUnique({
        where: {
          senderId_receiverId: {
            senderId: user.id,
            receiverId: body.userId,
          },
        },
      });

      if (existingRequest?.status === "PENDING") {
        return apiError("Friend request already sent.", 409);
      }

      await prisma.friendRequest.upsert({
        where: {
          senderId_receiverId: {
            senderId: user.id,
            receiverId: body.userId,
          },
        },
        update: {
          status: "PENDING",
        },
        create: {
          senderId: user.id,
          receiverId: body.userId,
          status: "PENDING",
        },
      });

      return apiSuccess({ success: true }, 201);
    }

    if (!body.requestId) {
      return apiError("A friend request id is required.", 422);
    }

    const existingRequest = await prisma.friendRequest.findUnique({
      where: { id: body.requestId },
    });

    if (!existingRequest) {
      return apiError("Friend request not found.", 404);
    }

    if (body.action === "accept") {
      if (existingRequest.receiverId !== user.id) {
        return apiError("Only the receiver can accept this request.", 403);
      }

      await prisma.$transaction([
        prisma.friendRequest.update({
          where: { id: existingRequest.id },
          data: { status: "ACCEPTED" },
        }),
        prisma.friendship.upsert({
          where: {
            userId_friendId: {
              userId: existingRequest.senderId,
              friendId: existingRequest.receiverId,
            },
          },
          update: {},
          create: {
            userId: existingRequest.senderId,
            friendId: existingRequest.receiverId,
          },
        }),
      ]);

      return apiSuccess({ success: true });
    }

    if (body.action === "decline") {
      if (existingRequest.receiverId !== user.id) {
        return apiError("Only the receiver can decline this request.", 403);
      }

      await prisma.friendRequest.update({
        where: { id: existingRequest.id },
        data: { status: "DECLINED" },
      });

      return apiSuccess({ success: true });
    }

    if (body.action === "cancel") {
      if (existingRequest.senderId !== user.id) {
        return apiError("Only the sender can cancel this request.", 403);
      }

      await prisma.friendRequest.update({
        where: { id: existingRequest.id },
        data: { status: "CANCELED" },
      });

      return apiSuccess({ success: true });
    }

    return apiError("Unsupported friend action.", 422);
  } catch (error) {
    return handleApiError(error);
  }
}
