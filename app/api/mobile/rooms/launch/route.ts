import { NextResponse } from "next/server";

import { apiError, handleApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const slug = requestUrl.searchParams.get("slug")?.trim();

    if (!slug) {
      return apiError("Room slug is required.", 422);
    }

    const room = await prisma.room.findUnique({
      where: { slug },
      select: { slug: true },
    });

    if (!room) {
      return apiError("Room not found.", 404);
    }

    const roomUrl = new URL(`/debate-rooms/${room.slug}`, requestUrl);
    const currentUser = await getCurrentUser();

    if (currentUser) {
      return NextResponse.redirect(roomUrl);
    }

    const loginUrl = new URL("/login", requestUrl);
    loginUrl.searchParams.set("redirect_url", roomUrl.toString());
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    return handleApiError(error);
  }
}
