import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "../api";
import {
  Card,
  EmptyState,
  HeroCard,
  LoadingState,
  SectionTitle,
  StatTile,
  StatusNotice,
  Tag,
} from "../components";
import { useRemoteResource } from "../hooks/useRemoteResource";
import { fonts, palette } from "../theme";
import type { SessionUser } from "../types";
import { formatDate, formatRelativeDate, levelLabel } from "../utils";

type DashboardScreenProps = {
  token: string;
  user: SessionUser;
};

export function DashboardScreen({ token, user }: DashboardScreenProps) {
  const { data, error, loading, refreshing, reload } = useRemoteResource(
    () => api.dashboard(token),
    [token],
  );

  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void reload()} />
      }
      showsVerticalScrollIndicator={false}
    >
      <HeroCard
        description="This dashboard pulls from the same live SpeakUp API routes and database records as your web app."
        kicker="Live Dashboard"
        title={`Welcome back, ${firstName}.`}
      />

      {error ? <StatusNotice message={error} tone="danger" /> : null}
      {loading && !data ? (
        <LoadingState label="Loading your real progress snapshot..." />
      ) : null}

      {data ? (
        <>
          <View style={styles.statsGrid}>
            <StatTile accent="blue" label="Posts shared" value={String(data.postsCount)} />
            <StatTile accent="coral" label="Words saved" value={String(data.wordsCount)} />
            <StatTile
              accent="mint"
              label="Pending requests"
              value={String(data.pendingFriends)}
            />
            <StatTile accent="ink" label="Active rooms" value={String(data.activeRooms)} />
          </View>

          <Card>
            <SectionTitle
              subtitle={`Signed in as ${user.email}`}
              title="Your mobile account summary"
            />
            <View style={styles.accountRow}>
              <Tag label={levelLabel(user.level)} />
              <Tag
                label={user.role === "ADMIN" ? "Admin access" : "Learner mode"}
                tone={user.role === "ADMIN" ? "success" : "soft"}
              />
              <Tag label={`Joined ${formatDate(user.createdAt)}`} />
            </View>
            <Text style={styles.bioText}>
              {user.bio?.trim() ||
                "Add a short bio on web or extend the mobile profile flow next."}
            </Text>
          </Card>

          <Card>
            <SectionTitle
              subtitle="The latest posts you created in your real account."
              title="Recent activity"
            />

            {data.latestPosts.length ? (
              <View style={styles.list}>
                {data.latestPosts.map((post) => (
                  <View key={post.id} style={styles.postRow}>
                    <View style={styles.postMeta}>
                      <Text style={styles.postTitle}>{post.title}</Text>
                      <Text style={styles.postSubtitle}>
                        {levelLabel(post.learningLevel)} • {formatRelativeDate(post.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.postStats}>
                      <Tag label={`${post.likes.length} likes`} tone="soft" />
                      <Tag label={`${post.comments.length} comments`} />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                description="Your dashboard is connected, but this account has not created any posts yet."
                title="No recent posts"
              />
            )}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  accountRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  bioText: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  content: {
    gap: 16,
    paddingBottom: 28,
  },
  list: {
    gap: 12,
  },
  postMeta: {
    flex: 1,
    gap: 4,
  },
  postRow: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 22,
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  postStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  postSubtitle: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  postTitle: {
    color: palette.ink,
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: "700",
  },
  statsGrid: {
    gap: 12,
  },
});
