import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

import type {
  AuthResponse,
  DashboardData,
  DictionaryResponse,
  FeedResponse,
  FriendsResponse,
  GrammarFeedback,
  RoomsResponse,
  SessionUser,
  SpeakingFeedback,
  StudioData,
  UploadResponse,
} from "./types";

type RequestOptions = {
  method?: "GET" | "POST";
  token?: string;
  body?: FormData | unknown;
};

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "FLUENT";
};

type ClerkAuthMode = "login" | "register";

function normalizeOrigin(value: string | null | undefined) {
  return value?.trim().replace(/\/$/, "") || null;
}

function resolveMetroHost() {
  const scriptUrl = NativeModules.SourceCode?.scriptURL as string | undefined;

  if (!scriptUrl) {
    return null;
  }

  const match = scriptUrl.match(/^[a-z]+:\/\/([^/:]+)(?::\d+)?/i);
  const host = match?.[1];

  if (!host || host === "localhost" || host === "127.0.0.1") {
    return null;
  }

  return host;
}

const metroHost = resolveMetroHost();
const fallbackOrigin =
  (metroHost ? `http://${metroHost}:3000` : null) ??
  Platform.select({
    android: "http://10.0.2.2:3000",
    ios: "http://localhost:3000",
    default: "http://localhost:3000",
  }) ??
  "http://localhost:3000";

const apiOrigin =
  normalizeOrigin(Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  normalizeOrigin(process.env.EXPO_PUBLIC_API_BASE_URL) ??
  fallbackOrigin;
const mobileApiBase = `${apiOrigin}/api/mobile`;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const requestUrl = `${mobileApiBase}${path}`;
  let response: Response;
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const requestBody: BodyInit | undefined = options.body
    ? isFormData
      ? (options.body as FormData)
      : JSON.stringify(options.body)
    : undefined;

  try {
    response = await fetch(requestUrl, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: requestBody,
    });
  } catch {
    throw new ApiError(
      apiOrigin.startsWith("https://")
        ? `Could not reach ${apiOrigin}. Check the phone's internet connection and confirm the Vercel deployment is online.`
        : `Could not reach ${apiOrigin}. If you are using a real phone, make sure EXPO_PUBLIC_API_BASE_URL points to your computer's LAN IP and that the backend is running on port 3000.`,
      0,
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  if (!response.ok) {
    const fallbackError =
      response.status === 404 && requestUrl.includes("/api/mobile/")
        ? `The backend at ${apiOrigin} does not have the /api/mobile routes yet. Redeploy the latest web code to Vercel, then reopen the app.`
        : `Request failed with status ${response.status}.`;

    throw new ApiError(
      payload?.error ?? fallbackError,
      response.status,
    );
  }

  return payload as T;
}

export const api = {
  login(input: LoginInput) {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: input,
    });
  },
  register(input: RegisterInput) {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: input,
    });
  },
  clerkAuthUrl(mode: ClerkAuthMode, mobileRedirectUrl: string) {
    const authBridgeUrl = new URL("/api/mobile/auth/clerk", `${apiOrigin}/`);
    authBridgeUrl.searchParams.set("mobile_redirect_url", mobileRedirectUrl);

    const webAuthUrl = new URL(mode === "login" ? "/login" : "/register", `${apiOrigin}/`);
    webAuthUrl.searchParams.set("redirect_url", authBridgeUrl.toString());

    return webAuthUrl.toString();
  },
  me(token: string) {
    return request<{ user: SessionUser }>("/auth/me", { token });
  },
  logout(token: string) {
    return request<{ success: boolean }>("/auth/logout", {
      method: "POST",
      token,
    });
  },
  dashboard(token: string) {
    return request<DashboardData>("/dashboard", { token });
  },
  feed(token: string) {
    return request<FeedResponse>("/feed", { token });
  },
  studio(token: string) {
    return request<StudioData>("/studio", { token });
  },
  improveGrammar(token: string, text: string) {
    return request<GrammarFeedback>("/ai/grammar", {
      method: "POST",
      token,
      body: { text },
    });
  },
  speakingFeedback(token: string, targetText: string, spokenText: string) {
    return request<SpeakingFeedback>("/ai/speaking-feedback", {
      method: "POST",
      token,
      body: { targetText, spokenText },
    });
  },
  uploadVideo(token: string, formData: FormData) {
    return request<UploadResponse>("/youtube/upload", {
      method: "POST",
      token,
      body: formData,
    });
  },
  createPost(
    token: string,
    body: {
      title: string;
      description: string;
      script?: string;
      learningLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "FLUENT";
      youtubeVideoId?: string;
      youtubeUrl?: string;
      localVideoUrl?: string;
      thumbnailUrl?: string;
      videoStatus?: "DRAFT" | "PROCESSING" | "UPLOADED" | "FAILED";
    },
  ) {
    return request<{ post: unknown }>("/post", {
      method: "POST",
      token,
      body,
    });
  },
  toggleLike(token: string, postId: string) {
    return request<{ liked: boolean; likeCount: number }>("/feed/like", {
      method: "POST",
      token,
      body: { postId },
    });
  },
  addComment(token: string, postId: string, content: string) {
    return request<{ comment: unknown }>("/feed/comment", {
      method: "POST",
      token,
      body: { postId, content },
    });
  },
  friends(token: string) {
    return request<FriendsResponse>("/friends", { token });
  },
  friendAction(
    token: string,
    body: {
      action: "send" | "accept" | "decline" | "cancel";
      userId?: string;
      requestId?: string;
    },
  ) {
    return request<{ success: boolean; autoAccepted?: boolean }>("/friends", {
      method: "POST",
      token,
      body,
    });
  },
  dictionary(token: string, query: string) {
    return request<DictionaryResponse>(
      `/dictionary?q=${encodeURIComponent(query)}`,
      { token },
    );
  },
  saveWord(token: string, dictionaryWordId: string, notes: string) {
    return request<{ savedWord: unknown }>("/dictionary", {
      method: "POST",
      token,
      body: {
        action: "save",
        dictionaryWordId,
        notes,
      },
    });
  },
  createWord(
    token: string,
    body: {
      word: string;
      definition: string;
      partOfSpeech?: string;
      phonetic?: string;
      exampleSentence?: string;
      level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "FLUENT";
      notes?: string;
    },
  ) {
    return request<{
      created: boolean;
      word: { id: string; word: string };
      savedWord: unknown;
    }>("/dictionary", {
      method: "POST",
      token,
      body: {
        action: "create",
        ...body,
      },
    });
  },
  rooms(token: string) {
    return request<RoomsResponse>("/rooms", { token });
  },
  roomAction(
    token: string,
    body:
      | {
          action: "join" | "leave";
          roomId: string;
        }
      | {
          action: "create";
          name: string;
          topic?: string;
          maxParticipants: number;
          provider: "WEBRTC" | "LIVEKIT";
        },
  ) {
    return request<{ success?: boolean; room?: unknown }>("/rooms", {
      method: "POST",
      token,
      body,
    });
  },
  apiOrigin,
};
