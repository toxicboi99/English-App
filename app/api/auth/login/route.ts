import { NextResponse } from "next/server";

import { apiError, handleApiError } from "@/lib/api";
import { setAuthCookie, signAuthToken, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const email = body.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        profileImage: true,
        level: true,
      },
    });

    if (!user) {
      return apiError("Invalid email or password.", 401);
    }

    const isPasswordValid = await verifyPassword(body.password, user.password);

    if (!isPasswordValid) {
      return apiError("Invalid email or password.", 401);
    }

    const token = await signAuthToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          profileImage: user.profileImage,
          level: user.level,
        },
      },
      { status: 200 },
    );

    return setAuthCookie(response, token);
  } catch (error) {
    return handleApiError(error);
  }
}
