import { cache } from "react";
import type { User as ClerkUser } from "@clerk/backend";
import { currentUser } from "@clerk/nextjs/server";
import type { LearningLevel, UserRole } from "@prisma/client";
import type { NextRequest } from "next/server";

import { learningLevels } from "@/lib/constants";
import { clearAuthCookie, setAuthCookie, signAuthToken, verifyAuthToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

const currentUserSelect = {
  id: true,
  clerkId: true,
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

function parseLearningLevel(value: unknown): LearningLevel | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return learningLevels.includes(value as (typeof learningLevels)[number])
    ? (value as LearningLevel)
    : undefined;
}

function parseOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, maxLength);
}

function parseOptionalUrl(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  try {
    const parsed = new URL(value);

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function getPrimaryEmail(clerkUser: ClerkUser) {
  return (
    clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase() ??
    clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase() ??
    null
  );
}

function toDisplayName(clerkUser: ClerkUser, email: string) {
  const fullName = clerkUser.fullName?.trim();

  if (fullName) {
    return fullName;
  }

  const username = clerkUser.username?.trim();

  if (username) {
    return username;
  }

  const emailPrefix = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();

  if (!emailPrefix) {
    return "SpeakUp Learner";
  }

  return emailPrefix.replace(/\b\w/g, (character) => character.toUpperCase());
}

function isMissingClerkIdColumnError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("User.clerkId") &&
    error.message.includes("does not exist")
  );
}

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

async function syncClerkUserRecord(clerkUser: ClerkUser) {
  const email = getPrimaryEmail(clerkUser);

  if (!email) {
    return null;
  }

  const legacyUserSelect = {
    id: true,
    name: true,
    email: true,
    password: true,
    profileImage: true,
    bio: true,
    level: true,
    role: true,
    isActive: true,
  } as const;

  let supportsClerkId = true;
  let existingUser;

  try {
    existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ clerkId: clerkUser.id }, { email }],
      },
      select: legacyUserSelect,
    });
  } catch (error) {
    if (!isMissingClerkIdColumnError(error)) {
      throw error;
    }

    supportsClerkId = false;
    existingUser = await prisma.user.findUnique({
      where: { email },
      select: legacyUserSelect,
    });
  }

  const requestedLevel = parseLearningLevel(clerkUser.unsafeMetadata?.level);
  const requestedBio = parseOptionalText(clerkUser.unsafeMetadata?.bio, 280);
  const requestedProfileImage = parseOptionalUrl(clerkUser.unsafeMetadata?.profileImage);

  const baseData = {
    name: existingUser?.name?.trim() || toDisplayName(clerkUser, email),
    email,
    password: existingUser?.password ?? "__clerk_managed_account__",
    profileImage:
      existingUser?.profileImage ??
      requestedProfileImage ??
      (clerkUser.hasImage ? clerkUser.imageUrl : null),
    bio: existingUser?.bio ?? requestedBio,
    level: existingUser?.level ?? requestedLevel ?? "BEGINNER",
    role: existingUser?.role ?? getDefaultRoleForEmail(email),
    isActive: Boolean(existingUser?.isActive ?? true) && !clerkUser.banned && !clerkUser.locked,
  } as const;
  const data = supportsClerkId ? { clerkId: clerkUser.id, ...baseData } : baseData;

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data,
        select: currentUserSelect,
      })
    : await prisma.user.create({
        data,
        select: currentUserSelect,
      });

  return applyEffectiveRole(user);
}

const getSyncedCurrentUser = cache(async () => {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  return syncClerkUserRecord(clerkUser);
});

export async function getUserFromRequest(_request: NextRequest) {
  const user = await getSyncedCurrentUser();

  if (!user?.isActive) {
    return null;
  }

  return applyEffectiveRole(user);
}

export const getCurrentUser = cache(async () => {
  const user = await getSyncedCurrentUser();

  if (!user?.isActive) {
    return null;
  }

  return user;
});

export async function requireCurrentUser() {
  const user = await getSyncedCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  if (!user.isActive) {
    throw new Error("Account suspended");
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
