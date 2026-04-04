import { apiSuccess, handleApiError } from "@/lib/api";
import { requireMobileSessionUser } from "@/lib/mobile-auth";
import { uploadVideoToYoutube } from "@/lib/youtube";

export async function POST(request: Request) {
  try {
    const user = await requireMobileSessionUser(request);
    const formData = await request.formData();
    const file = formData.get("file");
    const title = String(formData.get("title") || "SpeakUp Practice Video");
    const description = String(
      formData.get("description") || "Uploaded from SpeakUp mobile.",
    );

    if (!(file instanceof File)) {
      throw new Error("A video file is required.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await uploadVideoToYoutube({
      userId: user.id,
      title,
      description,
      fileBuffer: Buffer.from(arrayBuffer),
      mimeType: file.type || "video/mp4",
    });

    return apiSuccess(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
