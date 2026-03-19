import { apiSuccess } from "@/lib/api";

export function GET() {
  return apiSuccess({
    status: "ok",
    app: "SpeakUp",
    timestamp: new Date().toISOString(),
  });
}
