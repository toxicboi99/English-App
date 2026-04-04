import bcrypt from "bcrypt";

import { getDefaultRoleForEmail, setAuthCookie } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { createMobileAuthPayload, mobileUserSelect } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existingUser) {
      return apiError("An account already exists for this email.", 409);
    }

    const hashedPassword = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email,
        password: hashedPassword,
        profileImage: body.profileImage ?? null,
        bio: body.bio?.trim() || null,
        level: body.level,
        role: getDefaultRoleForEmail(email),
      },
      select: mobileUserSelect,
    });

    const payload = await createMobileAuthPayload(user);
    return setAuthCookie(apiSuccess(payload, 201), payload.token);
  } catch (error) {
    return handleApiError(error);
  }
}
