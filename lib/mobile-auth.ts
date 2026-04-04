import type { UserRole } from "@prisma/client";

import { authCookieName } from "@/lib/constants";
import { getEffectiveUserRole, signAuthToken, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mobileUserSelect = {
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
} as const;

type MobileUser = {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
  bio: string | null;
  level: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  oauthAccounts: Array<{ provider: string }>;
};

function applyEffectiveRole(user: MobileUser): MobileUser {
  return {
    ...user,
    role: getEffectiveUserRole(user.email, user.role),
  };
}

function getTokenFromAuthorizationHeader(request: Request) {
  const authorization = request.headers.get("authorization")?.trim();

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

function getTokenFromCookies(request: Request) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = cookie.trim().split("=");

    if (rawName === authCookieName) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
}

export async function getMobileSessionUser(request: Request) {
  const token =
    getTokenFromAuthorizationHeader(request) ?? getTokenFromCookies(request);

  if (!token) {
    return null;
  }

  const payload = await verifyAuthToken(token);

  if (!payload?.userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: mobileUserSelect,
  });

  if (!user?.isActive) {
    return null;
  }

  return applyEffectiveRole(user);
}

export async function requireMobileSessionUser(request: Request) {
  const token =
    getTokenFromAuthorizationHeader(request) ?? getTokenFromCookies(request);

  if (!token) {
    throw new Error("Unauthorized");
  }

  const payload = await verifyAuthToken(token);

  if (!payload?.userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: mobileUserSelect,
  });

  if (!user) {
    throw new Error("Unauthorized");
  }

  if (!user.isActive) {
    throw new Error("Account suspended");
  }

  return applyEffectiveRole(user);
}

export async function createMobileAuthPayload(
  user: Pick<MobileUser, "id" | "name" | "email"> & MobileUser,
) {
  const normalizedUser = applyEffectiveRole(user);
  const token = await signAuthToken({
    userId: normalizedUser.id,
    email: normalizedUser.email,
    name: normalizedUser.name,
  });

  return {
    token,
    user: normalizedUser,
  };
}

export { mobileUserSelect };
