import { useState } from "react";
import {
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  StatusNotice,
  Tag,
} from "../components";
import { useRemoteResource } from "../hooks/useRemoteResource";
import { fonts, palette } from "../theme";
import type { FeedPost, SessionUser } from "../types";
import { formatRelativeDate, levelLabel } from "../utils";

type FeedScreenProps = {
  token: string;
  user: SessionUser;
};

function previewImage(post: FeedPost) {
  if (post.thumbnailUrl) {
    return post.thumbnailUrl;
  }

  if (post.youtubeVideoId) {
    return `https://img.youtube.com/vi/${post.youtubeVideoId}/hqdefault.jpg`;
  }

  return null;
}

export function FeedScreen({ token }: FeedScreenProps) {
  const { data, error, loading, refreshing, reload } = useRemoteResource(
    () => api.feed(token),
    [token],
  );
  const [status, setStatus] = useState<string | null>(null);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  async function handleLike(postId: string) {
    setBusyPostId(postId);
    setStatus(null);

    try {
      await api.toggleLike(token, postId);
      await reload();
    } catch (toggleError) {
      setStatus(
        toggleError instanceof Error ? toggleError.message : "Unable to update like.",
      );
    } finally {
      setBusyPostId(null);
    }
  }

  async function handleComment(postId: string) {
    const content = commentDrafts[postId]?.trim();

    if (!content) {
      setStatus("Write a comment before sending it.");
      return;
    }

    setBusyPostId(postId);
    setStatus(null);

    try {
      await api.addComment(token, postId, content);
      setCommentDrafts((previous) => ({ ...previous, [postId]: "" }));
      await reload();
    } catch (commentError) {
      setStatus(
        commentError instanceof Error
          ? commentError.message
          : "Unable to send comment.",
      );
    } finally {
      setBusyPostId(null);
    }
  }

  async function openVideo(post: FeedPost) {
    const url = post.youtubeUrl ?? post.localVideoUrl;

    if (!url) {
      setStatus("This post does not have a playable video URL yet.");
      return;
    }

    await Linking.openURL(url);
  }

  const posts = data?.posts ?? [];

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void reload()} />
      }
      showsVerticalScrollIndicator={false}
    >
      <HeroCard
        description="Every card, like, and comment here comes from the live SpeakUp social feed."
        kicker="Community Feed"
        title="Practice together, straight from your phone."
      />

      {status ? <StatusNotice message={status} tone="info" /> : null}
      {error ? <StatusNotice message={error} tone="danger" /> : null}
      {loading && !data ? <LoadingState label="Loading real feed posts..." /> : null}

      {data ? (
        posts.length ? (
          <View style={styles.list}>
            {posts.map((post) => {
              const preview = previewImage(post);

              return (
                <Card key={post.id}>
                  <View style={styles.authorRow}>
                    <View style={styles.authorInfo}>
                      <AvatarBubble
                        image={post.author.profileImage}
                        name={post.author.name}
                        size={48}
                      />
                      <View style={styles.authorTextWrap}>
                        <Text style={styles.authorName}>{post.author.name}</Text>
                        <Text style={styles.authorMeta}>
                          {levelLabel(post.author.level)} • {formatRelativeDate(post.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.tagWrap}>
                      <Tag label={levelLabel(post.learningLevel)} />
                      {post.isVerified ? <Tag label="Verified" tone="success" /> : null}
                    </View>
                  </View>

                  <SectionTitle
                    subtitle="Live post record"
                    title={post.title}
                  />
                  <Text style={styles.description}>{post.description}</Text>

                  {preview ? (
                    <Image source={{ uri: preview }} style={styles.previewImage} />
                  ) : null}

                  {post.script ? (
                    <View style={styles.scriptBox}>
                      <Text style={styles.scriptLabel}>Practice script</Text>
                      <Text style={styles.scriptText}>{post.script}</Text>
                    </View>
                  ) : null}

                  <View style={styles.actionsRow}>
                    <AppButton
                      label={
                        post.likedByMe
                          ? `Liked • ${post.likes.length}`
                          : `Like • ${post.likes.length}`
                      }
                      loading={busyPostId === post.id}
                      onPress={() => void handleLike(post.id)}
                      style={styles.actionButton}
                      variant={post.likedByMe ? "soft" : "ghost"}
                    />
                    <AppButton
                      label="Open video"
                      onPress={() => void openVideo(post)}
                      style={styles.actionButton}
                      variant="primary"
                    />
                  </View>

                  <Text style={styles.commentCount}>
                    {post.comments.length} comment{post.comments.length === 1 ? "" : "s"}
                  </Text>

                  <TextInput
                    multiline
                    onChangeText={(value) =>
                      setCommentDrafts((previous) => ({
                        ...previous,
                        [post.id]: value,
                      }))
                    }
                    placeholder="Add a supportive reply..."
                    placeholderTextColor="#7a8ba0"
                    style={styles.commentInput}
                    value={commentDrafts[post.id] ?? ""}
                  />

                  <AppButton
                    label="Send comment"
                    loading={busyPostId === post.id}
                    onPress={() => void handleComment(post.id)}
                    style={{ marginTop: 12 }}
                    variant="ghost"
                  />

                  <View style={styles.commentList}>
                    {post.comments.length ? (
                      post.comments.map((comment) => (
                        <View key={comment.id} style={styles.commentCard}>
                          <View style={styles.commentHeader}>
                            <AvatarBubble
                              image={comment.user.profileImage}
                              name={comment.user.name}
                              size={36}
                            />
                            <View style={styles.commentTextWrap}>
                              <Text style={styles.commentAuthor}>{comment.user.name}</Text>
                              <Text style={styles.commentTime}>
                                {formatRelativeDate(comment.createdAt)}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.commentBody}>{comment.content}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyCommentCopy}>
                        No comments yet. Start the conversation from mobile.
                      </Text>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        ) : (
          <EmptyState
            description="The mobile feed is connected, but there are no visible posts in the database yet."
            title="No live feed posts"
          />
        )
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  authorInfo: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: 12,
  },
  authorMeta: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  authorName: {
    color: palette.ink,
    fontFamily: fonts.display,
    fontSize: 19,
    fontWeight: "700",
  },
  authorRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  authorTextWrap: {
    flex: 1,
    gap: 4,
  },
  commentAuthor: {
    color: palette.ink,
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: "700",
  },
  commentBody: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  commentCard: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  commentCount: {
    color: palette.ink,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 16,
  },
  commentHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  commentInput: {
    backgroundColor: palette.white,
    borderColor: palette.line,
    borderRadius: 20,
    borderWidth: 1,
    color: palette.ink,
    fontFamily: fonts.body,
    fontSize: 15,
    marginTop: 10,
    minHeight: 92,
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlignVertical: "top",
  },
  commentList: {
    gap: 10,
    marginTop: 14,
  },
  commentTextWrap: {
    flex: 1,
    gap: 2,
  },
  commentTime: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  content: {
    gap: 16,
    paddingBottom: 28,
  },
  description: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
  },
  emptyCommentCopy: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    gap: 16,
  },
  previewImage: {
    borderRadius: 22,
    height: 190,
    marginTop: 16,
    width: "100%",
  },
  scriptBox: {
    backgroundColor: "#f0f7ff",
    borderRadius: 22,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  scriptLabel: {
    color: palette.cobaltDeep,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  scriptText: {
    color: palette.ink,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  tagWrap: {
    alignItems: "flex-end",
    gap: 8,
  },
});
