import bcrypt from "bcrypt";

import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { setAuthCookie } from "@/lib/auth";
import { createMobileAuthPayload, mobileUserSelect } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";

const clerkManagedPassword = "__clerk_managed_account__";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const account = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      select: {
        password: true,
        id: true,
        name: true,
        email: true,
        profileImage: true,
        bio: true,
        level: true,
        role: true,
        isActive: true,
        createdAt: true,
        oauthAccounts: {
          select: {
            provider: true,
          },
        },
      },
    });

    if (!account?.password || account.password === clerkManagedPassword) {
      return apiError("Invalid email or password.", 401);
    }

    const isValid = await bcrypt.compare(body.password, account.password);

    if (!isValid) {
      return apiError("Invalid email or password.", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: account.id },
      select: mobileUserSelect,
    });

    if (!user) {
      return apiError("Invalid email or password.", 401);
    }

    if (!user.isActive) {
      return apiError("Your account has been suspended.", 403);
    }

    const payload = await createMobileAuthPayload(user);
    return setAuthCookie(apiSuccess(payload), payload.token);
  } catch (error) {
    return handleApiError(error);
  }
}
