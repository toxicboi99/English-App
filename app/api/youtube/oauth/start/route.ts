import { NextResponse } from "next/server";

import { requireCurrentUser, signAuthToken } from "@/lib/auth";
import { getYouTubeOAuthUrl } from "@/lib/youtube";

export async function GET() {
  const user = await requireCurrentUser();
  const state = await signAuthToken({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  return NextResponse.redirect(getYouTubeOAuthUrl(state));
}
