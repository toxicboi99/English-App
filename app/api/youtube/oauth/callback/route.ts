import { NextResponse } from "next/server";

import { verifyAuthToken } from "@/lib/auth";
import { encryptText } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForTokens } from "@/lib/youtube";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/create-video?youtube=error&reason=${encodeURIComponent(error)}`, url),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/create-video?youtube=missing", url));
  }

  const payload = await verifyAuthToken(state);

  if (!payload?.userId) {
    return NextResponse.redirect(new URL("/login?reason=youtube_state", url));
  }

  const tokens = await exchangeCodeForTokens(code);

  await prisma.oAuthAccount.upsert({
    where: {
      userId_provider: {
        userId: payload.userId,
        provider: "YOUTUBE",
      },
    },
    update: {
      encryptedAccessToken: tokens.access_token
        ? encryptText(tokens.access_token)
        : undefined,
      encryptedRefreshToken: tokens.refresh_token
        ? encryptText(tokens.refresh_token)
        : undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      scope: tokens.scope,
    },
    create: {
      userId: payload.userId,
      provider: "YOUTUBE",
      encryptedAccessToken: tokens.access_token
        ? encryptText(tokens.access_token)
        : undefined,
      encryptedRefreshToken: tokens.refresh_token
        ? encryptText(tokens.refresh_token)
        : undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      scope: tokens.scope,
    },
  });

  return NextResponse.redirect(new URL("/create-video?youtube=connected", url));
}
