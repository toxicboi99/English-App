import { NextResponse } from "next/server";

import { apiError, handleApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createMobileAuthPayload } from "@/lib/mobile-auth";

const allowedMobileProtocols = new Set(["exp:", "exps:", "speakup:"]);

function getValidatedMobileRedirectUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);

    if (!allowedMobileProtocols.has(parsed.protocol)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const mobileRedirectUrl = getValidatedMobileRedirectUrl(
      requestUrl.searchParams.get("mobile_redirect_url"),
    );

    if (!mobileRedirectUrl) {
      return apiError("Invalid mobile redirect URL.", 400);
    }

    const user = await getCurrentUser();

    if (!user) {
      const loginUrl = new URL("/login", requestUrl);
      loginUrl.searchParams.set("redirect_url", requestUrl.toString());
      return NextResponse.redirect(loginUrl);
    }

    const payload = await createMobileAuthPayload(user);
    mobileRedirectUrl.searchParams.set("clerk_mobile", "1");
    mobileRedirectUrl.searchParams.set("token", payload.token);
    mobileRedirectUrl.searchParams.set("user", JSON.stringify(payload.user));

    return NextResponse.redirect(mobileRedirectUrl);
  } catch (error) {
    return handleApiError(error);
  }
}
