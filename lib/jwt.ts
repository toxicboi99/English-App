import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";

import { authCookieName } from "@/lib/constants";

type AuthPayload = {
  userId: string;
  email: string;
  name: string;
};

function getSecret() {
  const secret = process.env.JWT_SECRET ?? "development-secret";
  return new TextEncoder().encode(secret);
}

function getCookieSettings(maxAge = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function signAuthToken(payload: AuthPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyAuthToken(token: string) {
  try {
    const result = await jwtVerify(token, getSecret());
    return result.payload as AuthPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(authCookieName, token, getCookieSettings());
  return response;
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(authCookieName, "", getCookieSettings(0));
  return response;
}
