export const authCookieName = "speakup_token";

export const learningLevels = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "FLUENT",
] as const;

export const roomProviders = ["WEBRTC", "HMS"] as const;

export const publicRoutes = ["/", "/login", "/register"] as const;

export const publicApiPrefixes = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/health",
  "/api/youtube/oauth/callback",
] as const;
