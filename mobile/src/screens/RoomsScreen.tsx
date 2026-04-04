import { useState } from "react";
import {
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

export function RoomsScreen({ token }: RoomsScreenProps) {
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

  async function createRoom() {
    if (!name.trim()) {
      setStatus("Room name is required.");
      return;
    }

    setIsCreating(true);
    setStatus(null);

    try {
      await api.roomAction(token, {
        action: "create",
        name: name.trim(),
        topic: topic.trim() || undefined,
        maxParticipants: Number(maxParticipants),
        provider,
      });
      setStatus(
        provider === "LIVEKIT"
          ? "Room created. Join it from the list below and open the live stage."
          : "Preview room created. Join it from the list below and open the stage.",
      );
      setName("");
      setTopic("");
      setProvider("LIVEKIT");
      setMaxParticipants("4");
      await reload();
    } catch (createError) {
      setStatus(
        createError instanceof Error ? createError.message : "Unable to create room.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function roomAction(
    action: "join" | "leave",
    roomId: string,
    busyKey: string,
  ) {
    setBusyId(busyKey);
    setStatus(null);

    try {
      await api.roomAction(token, { action, roomId });
      setStatus(
        action === "join"
          ? "Room membership updated. You can open the stage now."
          : "You have left the room.",
      );
      await reload();
    } catch (actionError) {
      setStatus(
        actionError instanceof Error ? actionError.message : "Unable to update room.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function openRoomStage(room: Room) {
    setBusyId(`open-${room.id}`);
    setStatus("Opening the room stage in your browser...");

    try {
      await Linking.openURL(api.roomLaunchUrl(room.slug));
      setStatus(
        room.provider === "LIVEKIT"
          ? "The LiveKit room stage is opening in your browser."
          : "The browser-preview room stage is opening in your browser.",
      );
    } catch (openError) {
      setStatus(
        openError instanceof Error
          ? openError.message
          : "Unable to open the room stage.",
      );
    } finally {
      setBusyId(null);
    }
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
        description="Create, join, and launch the same debate rooms used by the web app. Mobile now handles the real room workflow instead of only editing records."
        kicker="Debate Rooms"
        title="Keep your speaking rooms fully in sync."
      />

      <Card>
        <SectionTitle
          subtitle="Use LiveKit for real shared rooms. Use WebRTC when you only need a lighter browser-local practice stage."
          title="Provider guide"
        />
        <Text style={styles.noteText}>
          After you join a room from mobile, tap Open stage to continue into the actual
          room experience in your phone browser.
        </Text>
      </Card>

      {status ? <StatusNotice message={status} tone="info" /> : null}
      {error ? <StatusNotice message={error} tone="danger" /> : null}
      {loading && !data ? <LoadingState label="Loading room data..." /> : null}

      <Card style={{ gap: 14 }}>
        <SectionTitle
          subtitle="Create a room with the same backend data model the web app uses."
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
            subtitle="Real room records from the database with stage launch support."
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
                      label={room.joinedByMe ? "Refresh join" : "Join room"}
                      loading={busyId === `join-${room.id}`}
                      onPress={() => void roomAction("join", room.id, `join-${room.id}`)}
                      style={styles.flexButton}
                    />
                    <AppButton
                      disabled={!room.joinedByMe}
                      label="Open stage"
                      loading={busyId === `open-${room.id}`}
                      onPress={() => void openRoomStage(room)}
                      style={styles.flexButton}
                      variant="soft"
                    />
                    {room.joinedByMe ? (
                      <AppButton
                        label="Leave"
                        loading={busyId === `leave-${room.id}`}
                        onPress={() => void roomAction("leave", room.id, `leave-${room.id}`)}
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
});
