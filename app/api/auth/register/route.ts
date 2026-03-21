import { NextResponse } from "next/server";

import { apiError, handleApiError } from "@/lib/api";
import {
  getDefaultRoleForEmail,
  hashPassword,
  isAdminUser,
  setAuthCookie,
  signAuthToken,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const email = body.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return apiError("An account with that email already exists.", 409);
    }

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email,
        password: await hashPassword(body.password),
        profileImage: body.profileImage,
        bio: body.bio,
        level: body.level,
        role: getDefaultRoleForEmail(email),
      },
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
        level: true,
        role: true,
      },
    });

    const token = await signAuthToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json(
      {
        user: {
          ...user,
          role: isAdminUser(user) ? "ADMIN" : user.role,
        },
      },
      { status: 201 },
    );
    return setAuthCookie(response, token);
  } catch (error) {
    return handleApiError(error);
  }
}
