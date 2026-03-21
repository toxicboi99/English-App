import { cache } from "react";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import type { UserRole } from "@prisma/client";

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
  role: true,
  isActive: true,
  createdAt: true,
  oauthAccounts: {
    select: {
      provider: true,
    },
  },
} as const;

function getConfiguredAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function getDefaultRoleForEmail(email: string): UserRole {
  return getConfiguredAdminEmails().has(email.toLowerCase()) ? "ADMIN" : "USER";
}

export function getEffectiveUserRole(email: string, role: UserRole): UserRole {
  return getConfiguredAdminEmails().has(email.toLowerCase()) ? "ADMIN" : role;
}

function applyEffectiveRole<T extends { email: string; role: UserRole }>(user: T): T {
  return {
    ...user,
    role: getEffectiveUserRole(user.email, user.role),
  };
}

export function isAdminUser(user: { email: string; role: UserRole }) {
  return applyEffectiveRole(user).role === "ADMIN";
}

export async function canAccessAdminPanel(user: { email: string; role: UserRole }) {
  if (isAdminUser(user)) {
    return true;
  }

  if (getConfiguredAdminEmails().size > 0) {
    return false;
  }

  const adminCount = await prisma.user.count({
    where: { role: "ADMIN" },
  });

  return adminCount === 0;
}

export async function getUserFromRequest(request: NextRequest) {
  const token = request.cookies.get(authCookieName)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyAuthToken(token);

  if (!payload?.userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: currentUserSelect,
  });

  if (!user?.isActive) {
    return null;
  }

  return applyEffectiveRole(user);
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

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: currentUserSelect,
  });

  if (!user?.isActive) {
    return null;
  }

  return applyEffectiveRole(user);
});

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requireCurrentUser();

  if (await canAccessAdminPanel(user)) {
    if (!isAdminUser(user)) {
      const promotedUser = await prisma.user.update({
        where: { id: user.id },
        data: { role: "ADMIN" },
        select: currentUserSelect,
      });

      return applyEffectiveRole(promotedUser);
    }

    return user;
  }

  throw new Error("Forbidden");
}

export { clearAuthCookie, setAuthCookie, signAuthToken, verifyAuthToken };
