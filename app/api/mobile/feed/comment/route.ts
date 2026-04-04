import { apiSuccess, handleApiError } from "@/lib/api";
import { requireMobileSessionUser } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { commentSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const user = await requireMobileSessionUser(request);
    const body = commentSchema.parse(await request.json());

    const comment = await prisma.comment.create({
      data: {
        postId: body.postId,
        userId: user.id,
        content: body.content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
      },
    });

    return apiSuccess({ comment }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
