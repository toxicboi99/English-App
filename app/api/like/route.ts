import { apiSuccess, handleApiError } from "@/lib/api";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { likeSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = likeSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const existingLike = await tx.like.findUnique({
        where: {
          userId_postId: {
            userId: user.id,
            postId: body.postId,
          },
        },
      });

      if (existingLike) {
        await tx.like.delete({
          where: { id: existingLike.id },
        });
      } else {
        await tx.like.create({
          data: {
            userId: user.id,
            postId: body.postId,
          },
        });
      }

      const likeCount = await tx.like.count({
        where: { postId: body.postId },
      });

      return {
        liked: !existingLike,
        likeCount,
      };
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
