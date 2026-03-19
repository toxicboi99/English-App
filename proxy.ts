import { NextResponse, type NextRequest } from "next/server";

import {
  authCookieName,
  publicApiPrefixes,
  publicRoutes,
} from "@/lib/constants";
import { verifyAuthToken } from "@/lib/jwt";

function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) => pathname === route);
}

function isPublicApi(pathname: string) {
  return publicApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (isPublicRoute(pathname) || isPublicApi(pathname)) {
    if (
      (pathname === "/login" || pathname === "/register") &&
      request.cookies.get(authCookieName)?.value
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  const token = request.cookies.get(authCookieName)?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyAuthToken(token);

  if (!payload?.userId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
