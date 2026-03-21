import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiError(message: string, status = 400, issues?: unknown) {
  return NextResponse.json(
    {
      error: message,
      issues,
    },
    { status },
  );
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return apiError("Validation failed.", 422, error.flatten());
  }

  if (error instanceof Error) {
    if (error.message === "Unauthorized") {
      return apiError("Unauthorized.", 401);
    }

    if (error.message === "Forbidden") {
      return apiError("Forbidden.", 403);
    }

    if (error.message === "Account suspended") {
      return apiError("Your account has been suspended.", 403);
    }

    return apiError(error.message, 400);
  }

  return apiError("Something went wrong.", 500);
}
