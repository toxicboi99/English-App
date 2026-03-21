import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { requireAdminUser } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { adminMutationSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requireAdminUser();
    const data = await getAdminDashboardData();
    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    const body = adminMutationSchema.parse(await request.json());

    if (body.action === "createPrompt") {
      const duplicate = await prisma.recordingPrompt.findFirst({
        where: {
          title: {
            equals: body.title,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (duplicate) {
        return apiError("A recording prompt with that title already exists.", 409);
      }

      const prompt = await prisma.recordingPrompt.create({
        data: {
          title: body.title,
          description: body.description || null,
          script: body.script,
          level: body.level,
          isActive: body.isActive,
          sortOrder: body.sortOrder,
          createdById: admin.id,
        },
      });

      return apiSuccess({ prompt }, 201);
    }

    if (body.action === "updatePrompt") {
      const duplicate = await prisma.recordingPrompt.findFirst({
        where: {
          id: { not: body.promptId },
          title: {
            equals: body.title,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (duplicate) {
        return apiError("Another recording prompt already uses that title.", 409);
      }

      const prompt = await prisma.recordingPrompt.update({
        where: { id: body.promptId },
        data: {
          title: body.title,
          description: body.description || null,
          script: body.script,
          level: body.level,
          isActive: body.isActive,
          sortOrder: body.sortOrder,
        },
      });

      return apiSuccess({ prompt });
    }

    if (body.action === "updateUser") {
      if (body.userId === admin.id && (!body.isActive || body.role !== "ADMIN")) {
        return apiError("You cannot suspend yourself or remove your own admin access.", 422);
      }

      const user = await prisma.user.update({
        where: { id: body.userId },
        data: {
          level: body.level,
          role: body.role,
          isActive: body.isActive,
        },
        select: {
          id: true,
          name: true,
          email: true,
          level: true,
          role: true,
          isActive: true,
        },
      });

      return apiSuccess({ user });
    }

    const post = await prisma.post.update({
      where: { id: body.postId },
      data: {
        isVerified: body.isVerified,
        visibility: body.visibility,
        moderationNotes: body.moderationNotes || null,
      },
      select: {
        id: true,
        title: true,
        isVerified: true,
        visibility: true,
        moderationNotes: true,
      },
    });

    return apiSuccess({ post });
  } catch (error) {
    return handleApiError(error);
  }
}
