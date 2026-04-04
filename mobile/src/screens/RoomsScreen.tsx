import { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

import { api } from "../api";
import {
  AppButton,
  AvatarBubble,
  Card,
  EmptyState,
  HeroCard,
  LoadingState,
  SectionTitle,
  SegmentedControl,
  StatusNotice,
  Tag,
  TextField,
} from "../components";
import { useRemoteResource } from "../hooks/useRemoteResource";
import { fonts, palette } from "../theme";
import type { Room, SessionUser } from "../types";

type RoomsScreenProps = {
  token: string;
  user: SessionUser;
};

const providerOptions = [
  { label: "LiveKit", value: "LIVEKIT" },
  { label: "WebRTC", value: "WEBRTC" },
];

const participantOptions = [
  { label: "2 people", value: "2" },
  { label: "3 people", value: "3" },
  { label: "4 people", value: "4" },
];

const providerLabels: Record<Room["provider"], string> = {
  HMS: "100ms-ready",
  LIVEKIT: "LiveKit production",
  WEBRTC: "Browser local preview",
};

export function RoomsScreen({ token, user }: RoomsScreenProps) {
  const { data, error, loading, refreshing, reload } = useRemoteResource(
    () => api.rooms(token),
    [token],
  );
  const [status, setStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [provider, setProvider] = useState<"LIVEKIT" | "WEBRTC">("LIVEKIT");
  const [maxParticipants, setMaxParticipants] = useState("4");
  const [isCreating, setIsCreating] = useState(false);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [stageVersion, setStageVersion] = useState(0);

  const visibleActiveRoom =
    activeRoom &&
    (data?.rooms.find((room) => room.id === activeRoom.id) ?? activeRoom);

  async function createRoom() {
    if (!name.trim()) {
      setStatus("Room name is required.");
      return;
    }

    setIsCreating(true);
    setStatus(null);

    try {
      const response = await api.roomAction(token, {
        action: "create",
        name: name.trim(),
        topic: topic.trim() || undefined,
        maxParticipants: Number(maxParticipants),
        provider,
      });

      setName("");
      setTopic("");
      setProvider("LIVEKIT");
      setMaxParticipants("4");

      if (response.room) {
        setActiveRoom(response.room);
        setStageVersion((current) => current + 1);
      }

      setStatus(
        provider === "LIVEKIT"
          ? "Room created. Opening the live mobile stage."
          : "Preview room created. Opening the mobile room stage.",
      );
      await reload();
    } catch (createError) {
      setStatus(
        createError instanceof Error ? createError.message : "Unable to create room.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function enterRoom(room: Room) {
    setBusyId(`enter-${room.id}`);
    setStatus(null);

    try {
      if (!room.joinedByMe) {
        await api.roomAction(token, { action: "join", roomId: room.id });
      }

      setActiveRoom(room);
      setStageVersion((current) => current + 1);
      setStatus("Opening the live mobile room stage.");
      await reload();
    } catch (actionError) {
      setStatus(
        actionError instanceof Error
          ? actionError.message
          : "Unable to open this room.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function leaveRoom(roomId: string, closeStage = false) {
    setBusyId(`leave-${roomId}`);
    setStatus(null);

    try {
      await api.roomAction(token, { action: "leave", roomId });
      if (closeStage || activeRoom?.id === roomId) {
        setActiveRoom(null);
      }
      setStatus("You have left the room.");
      await reload();
    } catch (actionError) {
      setStatus(
        actionError instanceof Error ? actionError.message : "Unable to leave room.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function handleStageMessage(rawEvent: { nativeEvent: { data: string } }) {
    try {
      const payload = JSON.parse(rawEvent.nativeEvent.data) as {
        type?: string;
        message?: string;
      };

      if (payload.type === "status" && payload.message) {
        setStatus(payload.message);
        return;
      }

      if (payload.type === "room-error") {
        setStatus(
          "The mobile call stage could not start. Check camera permissions and your LiveKit deployment settings.",
        );
        return;
      }

      if (payload.type === "room-disconnected") {
        setStatus("The live room disconnected. Refresh the stage or join again.");
      }
    } catch {
      setStatus("The room stage sent an unreadable update.");
    }
  }

  if (visibleActiveRoom) {
    return (
      <View style={styles.stageScreen}>
        {status ? <StatusNotice message={status} tone="info" /> : null}
        {error ? <StatusNotice message={error} tone="danger" /> : null}

        <Card style={styles.stageCard}>
          <SectionTitle
            subtitle="Camera and microphone stay inside the mobile app screen while this room is open."
            title="Live room stage"
          />
          <View style={styles.stageBadges}>
            <Tag label={providerLabels[visibleActiveRoom.provider]} />
            <Tag
              label={`${visibleActiveRoom.participants.length}/${visibleActiveRoom.maxParticipants} joined`}
              tone="soft"
            />
            <Tag label={`Host ${visibleActiveRoom.host.name}`} tone="soft" />
          </View>
          <Text style={styles.stageRoomName}>{visibleActiveRoom.name}</Text>
          <Text style={styles.stageRoomTopic}>
            {visibleActiveRoom.topic ||
              `${user.name}, this room is ready for live English practice.`}
          </Text>
          <View style={styles.stageActionRow}>
            <AppButton
              label="Exit live view"
              onPress={() => setActiveRoom(null)}
              style={styles.stageActionButton}
              variant="ghost"
            />
            <AppButton
              label="Refresh stage"
              onPress={() => setStageVersion((current) => current + 1)}
              style={styles.stageActionButton}
              variant="ghost"
            />
            <AppButton
              label="Leave room"
              loading={busyId === `leave-${visibleActiveRoom.id}`}
              onPress={() => void leaveRoom(visibleActiveRoom.id, true)}
              style={styles.stageActionButton}
            />
          </View>
        </Card>

        <View style={styles.stageFrame}>
          <WebView
            allowsInlineMediaPlayback
            domStorageEnabled
            javaScriptEnabled
            key={`${visibleActiveRoom.id}-${stageVersion}`}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="always"
            onError={(event) => {
              setStatus(
                event.nativeEvent.description ||
                  "Unable to load the mobile room stage.",
              );
            }}
            onHttpError={(event) => {
              setStatus(
                `The mobile room stage failed to load (${event.nativeEvent.statusCode}).`,
              );
            }}
            onMessage={handleStageMessage}
            originWhitelist={["*"]}
            source={{
              headers: {
                Authorization: `Bearer ${token}`,
              },
              uri: api.roomStageUrl(visibleActiveRoom.id),
            }}
            style={styles.stageWebview}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void reload()} />
      }
      showsVerticalScrollIndicator={false}
    >
      <HeroCard
        description="Create rooms, join them, and open the live video call stage inside the mobile app instead of leaving for a separate browser screen."
        kicker="Debate Rooms"
        title="Keep your speaking rooms fully in sync."
      />

      <Card>
        <SectionTitle
          subtitle="LiveKit gives you the real shared call stage. WebRTC keeps a lighter local preview mode when you do not need production multi-user media."
          title="Provider guide"
        />
        <Text style={styles.noteText}>
          Rooms older than 24 hours are cleaned up automatically, so the mobile list stays
          focused on current practice sessions.
        </Text>
      </Card>

      {status ? <StatusNotice message={status} tone="info" /> : null}
      {error ? <StatusNotice message={error} tone="danger" /> : null}
      {loading && !data ? <LoadingState label="Loading room data..." /> : null}

      <Card style={{ gap: 14 }}>
        <SectionTitle
          subtitle="Create a room with the same backend data model the web app uses, then open it directly in the mobile call stage."
          title="Create a room"
        />
        <TextField
          label="Room name"
          onChangeText={setName}
          placeholder="Evening speaking club"
          value={name}
        />
        <TextField
          label="Topic"
          multiline
          onChangeText={setTopic}
          placeholder="What topic will everyone speak about?"
          value={topic}
        />
        <View>
          <Text style={styles.controlLabel}>Provider</Text>
          <SegmentedControl
            onChange={(value) => setProvider(value as "LIVEKIT" | "WEBRTC")}
            options={providerOptions}
            value={provider}
          />
        </View>
        <View>
          <Text style={styles.controlLabel}>Participants</Text>
          <SegmentedControl
            onChange={setMaxParticipants}
            options={participantOptions}
            value={maxParticipants}
          />
        </View>
        <AppButton
          label="Create live room"
          loading={isCreating}
          onPress={() => void createRoom()}
        />
      </Card>

      {data ? (
        <Card>
          <SectionTitle
            subtitle="Real room records from the database, ready to open inside the mobile call screen."
            title="Available rooms"
          />
          {data.rooms.length ? (
            <View style={styles.roomList}>
              {data.rooms.map((room) => (
                <View key={room.id} style={styles.roomCard}>
                  <View style={styles.roomHeader}>
                    <View style={styles.roomCopy}>
                      <Text style={styles.roomName}>{room.name}</Text>
                      <Text style={styles.roomTopic}>
                        {room.topic ||
                          "Bring your own speaking topic and start the conversation."}
                      </Text>
                    </View>
                    <View style={styles.roomBadges}>
                      <Tag label={room.status} />
                      <Tag label={providerLabels[room.provider]} tone="soft" />
                    </View>
                  </View>

                  <View style={styles.hostRow}>
                    <AvatarBubble
                      image={room.host.profileImage}
                      name={room.host.name}
                      size={40}
                    />
                    <Text style={styles.hostName}>Hosted by {room.host.name}</Text>
                  </View>

                  <View style={styles.participantWrap}>
                    <Text style={styles.participantText}>
                      {room.participants.length}/{room.maxParticipants} participants joined
                    </Text>
                    <View style={styles.avatarStack}>
                      {room.participants.map((participant) => (
                        <AvatarBubble
                          key={participant.id}
                          image={participant.user.profileImage}
                          name={participant.user.name}
                          size={32}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={styles.roomActions}>
                    <AppButton
                      label={room.joinedByMe ? "Enter live room" : "Join and enter"}
                      loading={busyId === `enter-${room.id}`}
                      onPress={() => void enterRoom(room)}
                      style={styles.flexButton}
                    />
                    {room.joinedByMe ? (
                      <AppButton
                        label="Leave"
                        loading={busyId === `leave-${room.id}`}
                        onPress={() => void leaveRoom(room.id)}
                        style={styles.flexButton}
                        variant="ghost"
                      />
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              description="Create the first room from mobile and it will appear here immediately."
              title="No live rooms yet"
            />
          )}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatarStack: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  content: {
    gap: 16,
    paddingBottom: 28,
  },
  controlLabel: {
    color: palette.ink,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  flexButton: {
    flex: 1,
  },
  hostName: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  hostRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  noteText: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  participantText: {
    color: palette.ink,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: "700",
  },
  participantWrap: {
    gap: 10,
    marginTop: 14,
  },
  roomActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  roomBadges: {
    alignItems: "flex-end",
    gap: 8,
  },
  roomCard: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  roomCopy: {
    flex: 1,
  },
  roomHeader: {
    flexDirection: "row",
    gap: 12,
  },
  roomList: {
    gap: 12,
  },
  roomName: {
    color: palette.ink,
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: "700",
  },
  roomTopic: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  stageActionButton: {
    flexGrow: 1,
    minWidth: 120,
  },
  stageActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  stageBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stageCard: {
    gap: 14,
  },
  stageFrame: {
    backgroundColor: "#081221",
    borderColor: palette.line,
    borderRadius: 28,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
  },
  stageRoomName: {
    color: palette.ink,
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: "700",
  },
  stageRoomTopic: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  stageScreen: {
    flex: 1,
    gap: 12,
    paddingBottom: 12,
  },
  stageWebview: {
    backgroundColor: "#081221",
    flex: 1,
  },
});
