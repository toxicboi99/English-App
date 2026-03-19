import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { requireCurrentUser } from "@/lib/auth";
import { getFeedPosts } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { postSchema } from "@/lib/validators";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const posts = await getFeedPosts(user.id);
    return apiSuccess({ posts });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = postSchema.parse(await request.json());

    if (!body.youtubeVideoId && !body.localVideoUrl) {
      return apiError(
        "Create a video upload first so the post has a media source.",
        422,
      );
    }

    const post = await prisma.post.create({
      data: {
        title: body.title,
        description: body.description,
        script: body.script,
        learningLevel: body.learningLevel,
        youtubeVideoId: body.youtubeVideoId,
        youtubeUrl: body.youtubeUrl,
        localVideoUrl: body.localVideoUrl,
        thumbnailUrl: body.thumbnailUrl,
        videoStatus: body.videoStatus ?? "UPLOADED",
        authorId: user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            level: true,
          },
        },
        likes: true,
        comments: {
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

    return apiSuccess({ post }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
