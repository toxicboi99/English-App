import { cache } from "react";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import bcrypt from "bcrypt";

import { authCookieName } from "@/lib/constants";
import {
  clearAuthCookie,
  setAuthCookie,
  signAuthToken,
  verifyAuthToken,
} from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

const currentUserSelect = {
  id: true,
  name: true,
  email: true,
  profileImage: true,
  bio: true,
  level: true,
  createdAt: true,
  oauthAccounts: {
    select: {
      provider: true,
    },
  },
} as const;

export async function getUserFromRequest(request: NextRequest) {
  const token = request.cookies.get(authCookieName)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyAuthToken(token);

  if (!payload?.userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: payload.userId },
    select: currentUserSelect,
  });
}

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyAuthToken(token);

  if (!payload?.userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: payload.userId },
    select: currentUserSelect,
  });
});

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export { clearAuthCookie, setAuthCookie, signAuthToken, verifyAuthToken };
