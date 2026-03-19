import { Readable } from "stream";
import { google } from "googleapis";

import { decryptText } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";

function getOAuthClient() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("YouTube OAuth credentials are not configured.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getYouTubeOAuthUrl(state: string) {
  const oauth2Client = getOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/youtube.upload"],
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getYoutubeClientForUser(userId: string) {
  const account = await prisma.oAuthAccount.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: "YOUTUBE",
      },
    },
  });

  const oauth2Client = getOAuthClient();

  if (account?.encryptedRefreshToken) {
    oauth2Client.setCredentials({
      access_token: account.encryptedAccessToken
        ? decryptText(account.encryptedAccessToken)
        : undefined,
      refresh_token: decryptText(account.encryptedRefreshToken),
      expiry_date: account.expiresAt?.getTime(),
    });

    return oauth2Client;
  }

  if (process.env.YOUTUBE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
      access_token: process.env.YOUTUBE_ACCESS_TOKEN || undefined,
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
      expiry_date: process.env.YOUTUBE_TOKEN_EXPIRY
        ? Number(process.env.YOUTUBE_TOKEN_EXPIRY)
        : undefined,
    });

    return oauth2Client;
  }

  throw new Error("YouTube is not connected. Authorize an account before uploading.");
}

export async function uploadVideoToYoutube({
  userId,
  title,
  description,
  fileBuffer,
  mimeType,
}: {
  userId: string;
  title: string;
  description: string;
  fileBuffer: Buffer;
  mimeType: string;
}) {
  const auth = await getYoutubeClientForUser(userId);
  const youtube = google.youtube({ version: "v3", auth });
  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title,
        description,
      },
      status: {
        privacyStatus: "unlisted",
      },
    },
    media: {
      mimeType,
      body: Readable.from(fileBuffer),
    },
  });

  const videoId = response.data.id;

  if (!videoId) {
    throw new Error("YouTube upload did not return a video id.");
  }

  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
  };
}
