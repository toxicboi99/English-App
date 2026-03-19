import { apiSuccess, handleApiError } from "@/lib/api";
import { requireCurrentUser } from "@/lib/auth";

export async function POST() {
  try {
    await requireCurrentUser();

    return apiSuccess({
      provider: process.env.NEXT_PUBLIC_ROOM_PROVIDER ?? "webrtc",
      token: null,
      mode: "browser-local",
      message:
        "SpeakUp is using the browser-native practice room mode. Add your managed room provider credentials to issue live provider tokens here.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
