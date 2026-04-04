import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "../api";
import {
  AppButton,
  AvatarBubble,
  Card,
  EmptyState,
  HeroCard,
  LoadingState,
  SectionTitle,
  StatusNotice,
  Tag,
} from "../components";
import { useRemoteResource } from "../hooks/useRemoteResource";
import { fonts, palette } from "../theme";
import type { SessionUser } from "../types";
import { levelLabel } from "../utils";

type FriendsScreenProps = {
  token: string;
  user: SessionUser;
};

export function FriendsScreen({ token }: FriendsScreenProps) {
  const { data, error, loading, refreshing, reload } = useRemoteResource(
    () => api.friends(token),
    [token],
  );
  const [status, setStatus] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function performAction(
    key: string,
    payload: {
      action: "send" | "accept" | "decline" | "cancel";
      userId?: string;
      requestId?: string;
    },
  ) {
    setBusyKey(key);
    setStatus(null);

    try {
      const result = await api.friendAction(token, payload);
      setStatus(
        result.autoAccepted
          ? "The connection was auto-accepted because the other learner already invited you."
          : "Friend data updated successfully.",
      );
      await reload();
    } catch (actionError) {
      setStatus(
        actionError instanceof Error
          ? actionError.message
          : "Unable to update friendship right now.",
      );
    } finally {
      setBusyKey(null);
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
        description="These lists are powered by the real friendship tables, pending requests, and user graph in your database."
        kicker="Friends"
        title="Build a strong practice circle."
      />

      {status ? <StatusNotice message={status} tone="info" /> : null}
      {error ? <StatusNotice message={error} tone="danger" /> : null}
      {loading && !data ? <LoadingState label="Loading your real friend graph..." /> : null}

      {data ? (
        <>
          <Card>
            <SectionTitle
              subtitle="Accepted connections for this live account."
              title="Your connections"
            />
            {data.friends.length ? (
              <View style={styles.sectionList}>
                {data.friends.map((friend) => (
                  <View key={friend.id} style={styles.personCard}>
                    <View style={styles.personRow}>
                      <AvatarBubble
                        image={friend.profileImage}
                        name={friend.name}
                        size={46}
                      />
                      <View style={styles.personText}>
                        <Text style={styles.personName}>{friend.name}</Text>
                        <Text style={styles.personMeta}>{friend.email}</Text>
                      </View>
                    </View>
                    <Tag label={levelLabel(friend.level)} tone="soft" />
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                description="No accepted friendships yet. Use the suggestions below to send real requests."
                title="No connections yet"
              />
            )}
          </Card>

          <Card>
            <SectionTitle
              subtitle="Incoming requests waiting on you."
              title="Incoming invitations"
            />
            {data.incoming.length ? (
              <View style={styles.sectionList}>
                {data.incoming.map((request) =>
                  request.sender ? (
                    <View key={request.id} style={styles.actionCard}>
                      <View style={styles.personRow}>
                        <AvatarBubble
                          image={request.sender.profileImage}
                          name={request.sender.name}
                          size={46}
                        />
                        <View style={styles.personText}>
                          <Text style={styles.personName}>{request.sender.name}</Text>
                          <Text style={styles.personMeta}>
                            {levelLabel(request.sender.level)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.actions}>
                        <AppButton
                          label="Accept"
                          loading={busyKey === `accept-${request.id}`}
                          onPress={() =>
                            void performAction(`accept-${request.id}`, {
                              action: "accept",
                              requestId: request.id,
                            })
                          }
                          style={styles.flexButton}
                        />
                        <AppButton
                          label="Decline"
                          onPress={() =>
                            void performAction(`decline-${request.id}`, {
                              action: "decline",
                              requestId: request.id,
                            })
                          }
                          style={styles.flexButton}
                          variant="ghost"
                        />
                      </View>
                    </View>
                  ) : null,
                )}
              </View>
            ) : (
              <EmptyState
                description="No one is waiting for a response right now."
                title="Inbox is clear"
              />
            )}
          </Card>

          <Card>
            <SectionTitle
              subtitle="People you can invite right now from the live user table."
              title="Suggestions"
            />
            {data.suggestions.length ? (
              <View style={styles.sectionList}>
                {data.suggestions.map((candidate) => (
                  <View key={candidate.id} style={styles.actionCard}>
                    <View style={styles.personRow}>
                      <AvatarBubble
                        image={candidate.profileImage}
                        name={candidate.name}
                        size={46}
                      />
                      <View style={styles.personText}>
                        <Text style={styles.personName}>{candidate.name}</Text>
                        <Text style={styles.personMeta}>{candidate.email}</Text>
                      </View>
                    </View>
                    <View style={styles.actions}>
                      <Tag label={levelLabel(candidate.level)} />
                      <AppButton
                        label="Send request"
                        loading={busyKey === `send-${candidate.id}`}
                        onPress={() =>
                          void performAction(`send-${candidate.id}`, {
                            action: "send",
                            userId: candidate.id,
                          })
                        }
                        style={styles.requestButton}
                        variant="soft"
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                description="Suggestions will appear automatically as more real learners join the app."
                title="No suggestions right now"
              />
            )}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 22,
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  content: {
    gap: 16,
    paddingBottom: 28,
  },
  flexButton: {
    flex: 1,
  },
  personCard: {
    alignItems: "center",
    backgroundColor: palette.surfaceMuted,
    borderRadius: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  personMeta: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  personName: {
    color: palette.ink,
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: "700",
  },
  personRow: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: 12,
  },
  personText: {
    flex: 1,
    gap: 4,
  },
  requestButton: {
    flex: 1,
  },
  sectionList: {
    gap: 12,
  },
});
