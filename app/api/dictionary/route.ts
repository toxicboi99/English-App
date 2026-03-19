import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { requireCurrentUser } from "@/lib/auth";
import { getDictionaryData } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import {
  dictionarySearchSchema,
  saveWordSchema,
} from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    const searchParams = new URL(request.url).searchParams;
    const query = dictionarySearchSchema.parse({
      q: searchParams.get("q") ?? "",
    });

    const data = await getDictionaryData(user.id, query.q);
    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = saveWordSchema.parse(await request.json());

    const word = await prisma.dictionaryWord.findUnique({
      where: { id: body.dictionaryWordId },
      select: { id: true },
    });

    if (!word) {
      return apiError("Dictionary word not found.", 404);
    }

    const savedWord = await prisma.userWord.upsert({
      where: {
        userId_dictionaryWordId: {
          userId: user.id,
          dictionaryWordId: body.dictionaryWordId,
        },
      },
      update: {
        notes: body.notes,
      },
      create: {
        userId: user.id,
        dictionaryWordId: body.dictionaryWordId,
        notes: body.notes,
      },
      include: {
        dictionaryWord: true,
      },
    });

    return apiSuccess({ savedWord }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
