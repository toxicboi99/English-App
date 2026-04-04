import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

import { requireMobileSessionUser } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { cleanupExpiredRooms } from "@/lib/rooms";

const htmlHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "text/html; charset=utf-8",
};

type RoomStagePayload = {
  room: {
    id: string;
    name: string;
    slug: string;
    topic: string | null;
    provider: string;
    status: string;
    maxParticipants: number;
    host: {
      id: string;
      name: string;
      profileImage: string | null;
    };
    participants: Array<{
      id: string;
      userId: string;
      user: {
        id: string;
        name: string;
        profileImage: string | null;
      };
    }>;
  };
  user: {
    id: string;
    name: string;
  };
  session: {
    provider: string;
    token: string | null;
    serverUrl: string | null;
    mode: "livekit" | "browser-local";
    roomName: string;
    message: string;
  };
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function serializeForScript(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function renderErrorPage(message: string, status = 400) {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
    <title>SpeakUp Room Error</title>
    <style>
      :root {
        color-scheme: dark;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at top, #1d4ed8, #0f172a 52%);
        color: #f8fafc;
        font-family: Arial, sans-serif;
        padding: 24px;
      }
      .card {
        width: min(100%, 440px);
        border-radius: 28px;
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.28);
        padding: 24px;
        box-sizing: border-box;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 26px;
      }
      p {
        margin: 0;
        line-height: 1.6;
        color: #cbd5e1;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Room unavailable</h1>
      <p>${escapeHtml(message)}</p>
    </div>
  </body>
</html>`,
    {
      headers: htmlHeaders,
      status,
    },
  );
}

async function buildSessionPayload(
  room: {
    provider: string;
    externalRoomId: string | null;
    slug: string;
  },
  user: {
    id: string;
    name: string;
    email: string;
  },
) {
  if (room.provider !== "LIVEKIT") {
    return {
      provider: room.provider,
      token: null,
      serverUrl: null,
      mode: "browser-local" as const,
      roomName: room.externalRoomId ?? room.slug,
      message:
        "This room is set to local preview mode. Switch the provider to LiveKit for shared multi-user calling.",
    };
  }

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!serverUrl || !apiKey || !apiSecret) {
    return {
      provider: room.provider,
      token: null,
      serverUrl: null,
      mode: "browser-local" as const,
      roomName: room.externalRoomId ?? room.slug,
      message:
        "LiveKit is selected, but the server keys are missing. Add NEXT_PUBLIC_LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET on the deployment.",
    };
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: user.name,
    ttl: "2h",
    metadata: JSON.stringify({
      email: user.email,
      roomId: room.externalRoomId ?? room.slug,
      userId: user.id,
    }),
  });

  token.addGrant({
    room: room.externalRoomId ?? room.slug,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  });

  return {
    provider: room.provider,
    token: await token.toJwt(),
    serverUrl,
    mode: "livekit" as const,
    roomName: room.externalRoomId ?? room.slug,
    message:
      "Tap join to start the mobile call. Camera and microphone stay inside the app screen.",
  };
}

function renderStagePage(payload: RoomStagePayload) {
  const stageData = serializeForScript(payload);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover"
    />
    <title>${escapeHtml(payload.room.name)} | SpeakUp Mobile</title>
    <script src="https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.umd.min.js"></script>
    <style>
      :root {
        color-scheme: dark;
        --bg: #081221;
        --panel: rgba(15, 23, 42, 0.94);
        --panel-soft: rgba(30, 41, 59, 0.86);
        --line: rgba(148, 163, 184, 0.2);
        --ink: #f8fafc;
        --muted: #cbd5e1;
        --brand: #38bdf8;
        --brand-strong: #2563eb;
        --success: #22c55e;
        --danger: #fb7185;
        --warning: #fbbf24;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(56, 189, 248, 0.28), transparent 36%),
          radial-gradient(circle at bottom right, rgba(251, 113, 133, 0.24), transparent 34%),
          var(--bg);
        color: var(--ink);
        font-family: Arial, sans-serif;
      }
      .shell {
        min-height: 100vh;
        padding: 18px 14px 24px;
      }
      .hero,
      .status,
      .controls,
      .participants {
        border: 1px solid var(--line);
        border-radius: 28px;
        background: var(--panel);
        box-shadow: 0 18px 48px rgba(8, 18, 33, 0.3);
      }
      .hero {
        padding: 18px;
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(37, 99, 235, 0.18);
        color: #dbeafe;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1 {
        margin: 16px 0 10px;
        font-size: 34px;
        line-height: 1.06;
      }
      .topic {
        margin: 0;
        color: var(--muted);
        font-size: 15px;
        line-height: 1.7;
      }
      .badge-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 16px;
      }
      .badge {
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid var(--line);
        color: #dbeafe;
        font-size: 12px;
        font-weight: 700;
      }
      .status {
        margin-top: 14px;
        padding: 14px 16px;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.6;
      }
      .status[data-tone="success"] {
        border-color: rgba(34, 197, 94, 0.4);
        color: #dcfce7;
      }
      .status[data-tone="warning"] {
        border-color: rgba(251, 191, 36, 0.38);
        color: #fef3c7;
      }
      .status[data-tone="danger"] {
        border-color: rgba(251, 113, 133, 0.4);
        color: #ffe4e6;
      }
      .controls {
        margin-top: 14px;
        padding: 16px;
      }
      .control-grid {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      button {
        border: 0;
        border-radius: 18px;
        padding: 14px 16px;
        min-height: 52px;
        background: var(--panel-soft);
        color: var(--ink);
        font-size: 15px;
        font-weight: 700;
      }
      button.primary {
        background: linear-gradient(135deg, var(--brand-strong), var(--brand));
      }
      button.ghost {
        border: 1px solid var(--line);
      }
      button.warning {
        background: rgba(251, 191, 36, 0.18);
        color: #fef3c7;
      }
      button[disabled] {
        opacity: 0.45;
      }
      .participants {
        margin-top: 14px;
        padding: 16px;
      }
      .participants h2 {
        margin: 0 0 14px;
        font-size: 21px;
      }
      .grid {
        display: grid;
        gap: 12px;
      }
      .tile {
        overflow: hidden;
        border-radius: 24px;
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid rgba(71, 85, 105, 0.56);
      }
      .tile-media {
        position: relative;
        display: grid;
        place-items: center;
        width: 100%;
        aspect-ratio: 4 / 5;
        background:
          radial-gradient(circle at top, rgba(37, 99, 235, 0.34), transparent 42%),
          linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(2, 6, 23, 1));
      }
      .tile-media video,
      .tile-media audio {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .placeholder {
        display: grid;
        gap: 10px;
        justify-items: center;
      }
      .avatar {
        width: 72px;
        height: 72px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: rgba(56, 189, 248, 0.16);
        color: #dbeafe;
        font-size: 22px;
        font-weight: 700;
      }
      .placeholder-copy {
        text-align: center;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.5;
        max-width: 230px;
      }
      .tile-copy {
        padding: 14px;
      }
      .tile-title {
        font-size: 16px;
        font-weight: 700;
      }
      .tile-meta {
        margin-top: 6px;
        color: var(--muted);
        font-size: 13px;
      }
      .tile.speaking {
        border-color: rgba(34, 197, 94, 0.7);
        box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.35);
      }
      .audio-host {
        display: none;
      }
      @media (min-width: 720px) {
        .grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div class="eyebrow">SpeakUp mobile room</div>
        <h1>${escapeHtml(payload.room.name)}</h1>
        <p class="topic">${escapeHtml(
          payload.room.topic || "Use this room for live English speaking practice.",
        )}</p>
        <div class="badge-row">
          <div class="badge">${escapeHtml(payload.room.provider)}</div>
          <div class="badge">${escapeHtml(payload.room.status)}</div>
          <div class="badge">${escapeHtml(
            String(payload.room.participants.length),
          )}/${escapeHtml(String(payload.room.maxParticipants))} joined</div>
        </div>
      </section>

      <section class="status" data-tone="warning" id="status">
        Preparing the room and checking your camera plus microphone access.
      </section>

      <section class="controls">
        <div class="control-grid">
          <button class="primary" id="joinButton" type="button">Join call</button>
          <button class="ghost" disabled id="micButton" type="button">Mute mic</button>
          <button class="ghost" disabled id="cameraButton" type="button">Stop camera</button>
          <button class="warning" id="refreshButton" type="button">Refresh room</button>
        </div>
      </section>

      <section class="participants">
        <h2>Live speaking stage</h2>
        <div class="grid" id="participantGrid"></div>
      </section>

      <div class="audio-host" id="audioHost"></div>
    </main>

    <script>
      const stagePayload = ${stageData};
      const statusElement = document.getElementById("status");
      const participantGrid = document.getElementById("participantGrid");
      const audioHost = document.getElementById("audioHost");
      const joinButton = document.getElementById("joinButton");
      const micButton = document.getElementById("micButton");
      const cameraButton = document.getElementById("cameraButton");
      const refreshButton = document.getElementById("refreshButton");

      let liveRoom = null;
      let localPreviewStream = null;
      let isJoined = false;
      let isMicEnabled = true;
      let isCameraEnabled = true;

      function postToApp(payload) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function setStatus(message, tone) {
        statusElement.textContent = message;
        statusElement.dataset.tone = tone || "warning";
        postToApp({ type: "status", message: message, tone: tone || "warning" });
      }

      function initialsFor(name) {
        const letters = String(name || "S")
          .trim()
          .split(/\\s+/)
          .slice(0, 2)
          .map((part) => part.charAt(0))
          .join("");
        return letters || "S";
      }

      function ensureTile(identity, name, meta) {
        let tile = document.querySelector('[data-identity="' + identity + '"]');

        if (tile) {
          tile.querySelector(".tile-title").textContent = name;
          tile.querySelector(".tile-meta").textContent = meta;
          return tile;
        }

        tile = document.createElement("article");
        tile.className = "tile";
        tile.dataset.identity = identity;
        tile.innerHTML =
          '<div class="tile-media">' +
          '<div class="placeholder">' +
          '<div class="avatar">' + initialsFor(name) + '</div>' +
          '<div class="placeholder-copy">Waiting for camera or microphone in this mobile room.</div>' +
          "</div>" +
          "</div>" +
          '<div class="tile-copy">' +
          '<div class="tile-title"></div>' +
          '<div class="tile-meta"></div>' +
          "</div>";

        tile.querySelector(".tile-title").textContent = name;
        tile.querySelector(".tile-meta").textContent = meta;
        participantGrid.appendChild(tile);
        return tile;
      }

      function setTileMeta(identity, meta) {
        const tile = document.querySelector('[data-identity="' + identity + '"]');

        if (tile) {
          tile.querySelector(".tile-meta").textContent = meta;
        }
      }

      function attachVideoToTile(identity, name, meta, element, muted) {
        const tile = ensureTile(identity, name, meta);
        const mediaWrap = tile.querySelector(".tile-media");
        const mediaElement = element;

        mediaElement.autoplay = true;
        mediaElement.playsInline = true;
        mediaElement.muted = Boolean(muted);
        mediaElement.setAttribute("playsinline", "true");

        mediaWrap.replaceChildren(mediaElement);
      }

      function attachAudioTrack(track, muted) {
        const audioElement = track.attach();
        audioElement.autoplay = true;
        audioElement.muted = Boolean(muted);
        audioHost.appendChild(audioElement);
      }

      function renderSeedParticipants() {
        const seeded = new Map();

        const hostIdentity = stagePayload.room.host.id;
        seeded.set(hostIdentity, {
          identity: hostIdentity,
          name: stagePayload.room.host.name,
          meta:
            hostIdentity === stagePayload.user.id
              ? "You • host"
              : "Host",
        });

        stagePayload.room.participants.forEach(function (participant) {
          seeded.set(participant.user.id, {
            identity: participant.user.id,
            name: participant.user.name,
            meta:
              participant.user.id === stagePayload.user.id
                ? "You • participant"
                : "Participant",
          });
        });

        Array.from(seeded.values()).forEach(function (participant) {
          ensureTile(participant.identity, participant.name, participant.meta);
        });
      }

      function updateControls() {
        const joinLabel =
          stagePayload.session.mode === "livekit" ? "Join live room" : "Start preview";

        joinButton.textContent = isJoined ? "Joined" : joinLabel;
        joinButton.disabled = isJoined;

        micButton.disabled = !isJoined;
        cameraButton.disabled = !isJoined;
        micButton.textContent = isMicEnabled ? "Mute mic" : "Unmute mic";
        cameraButton.textContent = isCameraEnabled ? "Stop camera" : "Start camera";
      }

      function markSpeaking(activeSpeakers) {
        const activeIdentities = new Set(
          (activeSpeakers || []).map(function (speaker) {
            return speaker.identity;
          }),
        );

        Array.from(participantGrid.children).forEach(function (tile) {
          if (activeIdentities.has(tile.dataset.identity)) {
            tile.classList.add("speaking");
          } else {
            tile.classList.remove("speaking");
          }
        });
      }

      function attachExistingTracks(participant, isLocal) {
        const publications = Array.from(participant.trackPublications.values());

        publications.forEach(function (publication) {
          if (publication.track) {
            handleTrack(publication.track, participant, isLocal);
          }
        });
      }

      function handleTrack(track, participant, isLocal) {
        const identity = participant.identity || stagePayload.user.id;
        const name = participant.name || participant.identity || "Speaker";
        const meta = isLocal ? "You are live" : "Participant is live";

        if (track.kind === "video") {
          attachVideoToTile(identity, name, meta, track.attach(), isLocal);
          return;
        }

        if (track.kind === "audio") {
          attachAudioTrack(track, isLocal);
          ensureTile(identity, name, meta);
          setTileMeta(identity, meta + " • audio connected");
        }
      }

      async function startLocalPreview() {
        const constraints = {
          audio: true,
          video: {
            facingMode: "user",
          },
        };

        localPreviewStream = await navigator.mediaDevices.getUserMedia(constraints);
        const localTrack = localPreviewStream.getVideoTracks()[0];
        const localVideo = document.createElement("video");
        localVideo.srcObject = localPreviewStream;
        await localVideo.play().catch(function () {
          return undefined;
        });
        attachVideoToTile(
          stagePayload.user.id,
          stagePayload.user.name,
          "You are previewing locally",
          localVideo,
          true,
        );

        if (localTrack) {
          localTrack.enabled = true;
        }

        isJoined = true;
        isMicEnabled = true;
        isCameraEnabled = true;
        updateControls();
        setStatus(stagePayload.session.message, "warning");
      }

      async function joinLiveRoom() {
        const LivekitClient = window.LivekitClient;

        if (!LivekitClient) {
          throw new Error("LiveKit failed to load in the mobile stage.");
        }

        const Room = LivekitClient.Room;
        const RoomEvent = LivekitClient.RoomEvent;
        const VideoPresets = LivekitClient.VideoPresets;

        liveRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            facingMode: "user",
            resolution: VideoPresets.h720.resolution,
          },
        });

        liveRoom
          .on(RoomEvent.TrackSubscribed, function (track, publication, participant) {
            handleTrack(track, participant, false);
          })
          .on(RoomEvent.TrackUnsubscribed, function (track, publication, participant) {
            track.detach();
            setTileMeta(
              participant.identity,
              "Participant is connected without an active media track",
            );
          })
          .on(RoomEvent.LocalTrackPublished, function (publication, participant) {
            if (publication.track) {
              handleTrack(publication.track, participant, true);
            }
          })
          .on(RoomEvent.LocalTrackUnpublished, function (publication, participant) {
            if (publication.track) {
              publication.track.detach();
            }
            setTileMeta(stagePayload.user.id, "You are connected without an active track");
          })
          .on(RoomEvent.ParticipantConnected, function (participant) {
            ensureTile(participant.identity, participant.name || "Participant", "Joined room");
          })
          .on(RoomEvent.ParticipantDisconnected, function (participant) {
            setTileMeta(participant.identity, "Left the room");
          })
          .on(RoomEvent.ActiveSpeakersChanged, function (speakers) {
            markSpeaking(speakers);
          })
          .on(RoomEvent.Disconnected, function () {
            isJoined = false;
            updateControls();
            setStatus("The room connection ended. You can refresh and join again.", "warning");
            postToApp({ type: "room-disconnected" });
          });

        setStatus("Connecting to the live room...", "warning");
        liveRoom.prepareConnection(stagePayload.session.serverUrl, stagePayload.session.token);
        await liveRoom.connect(stagePayload.session.serverUrl, stagePayload.session.token);
        await liveRoom.localParticipant.enableCameraAndMicrophone();
        await liveRoom.startAudio().catch(function () {
          return undefined;
        });
        attachExistingTracks(liveRoom.localParticipant, true);
        liveRoom.remoteParticipants.forEach(function (participant) {
          ensureTile(participant.identity, participant.name || "Participant", "Participant");
          attachExistingTracks(participant, false);
        });

        isJoined = true;
        isMicEnabled = true;
        isCameraEnabled = true;
        updateControls();
        setStatus("You are live in the room. Speak naturally and take turns.", "success");
        postToApp({ type: "room-connected" });
      }

      async function toggleMic() {
        if (!isJoined) {
          return;
        }

        const next = !isMicEnabled;

        if (liveRoom) {
          await liveRoom.localParticipant.setMicrophoneEnabled(next);
        } else if (localPreviewStream) {
          localPreviewStream.getAudioTracks().forEach(function (track) {
            track.enabled = next;
          });
        }

        isMicEnabled = next;
        updateControls();
        setTileMeta(stagePayload.user.id, next ? "You are live" : "Your microphone is muted");
      }

      async function toggleCamera() {
        if (!isJoined) {
          return;
        }

        const next = !isCameraEnabled;

        if (liveRoom) {
          await liveRoom.localParticipant.setCameraEnabled(next);
        } else if (localPreviewStream) {
          localPreviewStream.getVideoTracks().forEach(function (track) {
            track.enabled = next;
          });
        }

        isCameraEnabled = next;
        updateControls();
        setTileMeta(stagePayload.user.id, next ? "You are live" : "Your camera is paused");
      }

      async function joinStage() {
        joinButton.disabled = true;

        try {
          if (
            stagePayload.session.mode === "livekit" &&
            stagePayload.session.serverUrl &&
            stagePayload.session.token
          ) {
            await joinLiveRoom();
          } else {
            await startLocalPreview();
          }
        } catch (error) {
          joinButton.disabled = false;
          setStatus(
            error instanceof Error
              ? error.message
              : "Unable to start the mobile room right now.",
            "danger",
          );
          postToApp({ type: "room-error" });
        }
      }

      joinButton.addEventListener("click", function () {
        void joinStage();
      });

      micButton.addEventListener("click", function () {
        void toggleMic();
      });

      cameraButton.addEventListener("click", function () {
        void toggleCamera();
      });

      refreshButton.addEventListener("click", function () {
        window.location.reload();
      });

      renderSeedParticipants();
      updateControls();
      setStatus(stagePayload.session.message, stagePayload.session.mode === "livekit" ? "warning" : "warning");
    </script>
  </body>
</html>`;
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const roomId = requestUrl.searchParams.get("roomId")?.trim();

    if (!roomId) {
      return renderErrorPage("Room id is required.", 422);
    }

    const user = await requireMobileSessionUser(request);
    await cleanupExpiredRooms();

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });

    if (!room) {
      return renderErrorPage("Room not found.", 404);
    }

    const canEnterRoom =
      room.hostId === user.id ||
      room.participants.some((participant) => participant.userId === user.id);

    if (!canEnterRoom) {
      return renderErrorPage("Join the room first from the mobile room list.", 403);
    }

    const session = await buildSessionPayload(room, user);

    return new NextResponse(
      renderStagePage({
        room: {
          id: room.id,
          name: room.name,
          slug: room.slug,
          topic: room.topic,
          provider: room.provider,
          status: room.status,
          maxParticipants: room.maxParticipants,
          host: room.host,
          participants: room.participants,
        },
        user: {
          id: user.id,
          name: user.name,
        },
        session,
      }),
      {
        headers: htmlHeaders,
      },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return renderErrorPage("Please sign in again from the mobile app.", 401);
      }

      if (error.message === "Account suspended") {
        return renderErrorPage("This account is suspended.", 403);
      }

      return renderErrorPage(error.message, 400);
    }

    return renderErrorPage("Unable to prepare the mobile room.", 500);
  }
}
