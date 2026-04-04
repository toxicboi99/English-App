import { startTransition, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { api } from "../api";
import {
  AppButton,
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
import type {
  AppScreenKey,
  LearningLevel,
  RecordingPrompt,
  SessionUser,
  UploadResponse,
} from "../types";
import { levelLabel } from "../utils";

type CreateVideoScreenProps = {
  token: string;
  user: SessionUser;
  onNavigate?: (screen: AppScreenKey) => void;
};

const levelOptions = [
  { label: "Beginner", value: "BEGINNER" },
  { label: "Intermediate", value: "INTERMEDIATE" },
  { label: "Advanced", value: "ADVANCED" },
  { label: "Fluent", value: "FLUENT" },
];

function formatFileSize(size?: number) {
  if (!size) {
    return "Size unavailable";
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(duration?: number | null) {
  if (!duration) {
    return "Duration unavailable";
  }

  const totalSeconds = Math.round(duration / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function sanitizeFileName(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "speakup-practice";
}

export function CreateVideoScreen({
  token,
  onNavigate,
}: CreateVideoScreenProps) {
  const { data, error, loading, refreshing, reload } = useRemoteResource(
    () => api.studio(token),
    [token],
  );
  const [learningLevel, setLearningLevel] = useState<LearningLevel>("BEGINNER");
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(
    "I practiced this speaking prompt on SpeakUp mobile.",
  );
  const [script, setScript] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(
    null,
  );
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [isImproving, setIsImproving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const prompts = data?.prompts ?? [];
  const filteredPrompts = useMemo(
    () => prompts.filter((prompt) => prompt.level === learningLevel),
    [learningLevel, prompts],
  );

  useEffect(() => {
    if (!filteredPrompts.length) {
      return;
    }

    const activePrompt = filteredPrompts.find((prompt) => prompt.id === selectedPromptId);

    if (activePrompt) {
      return;
    }

    const fallbackPrompt = filteredPrompts[0];
    setSelectedPromptId(fallbackPrompt.id);
    setTitle(fallbackPrompt.title);
    setScript(fallbackPrompt.script);
  }, [filteredPrompts, selectedPromptId]);

  function applyPrompt(prompt: RecordingPrompt) {
    setSelectedPromptId(prompt.id);
    startTransition(() => {
      setTitle(prompt.title);
      setScript(prompt.script);
      setLearningLevel(prompt.level);
    });
  }

  function clearUploadState() {
    setUploadResult(null);
  }

  async function chooseFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setStatus("Allow gallery access to choose a practice video.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 0.8,
      allowsEditing: false,
      selectionLimit: 1,
    });

    if (result.canceled) {
      return;
    }

    clearUploadState();
    setSelectedAsset(result.assets[0] ?? null);
    setStatus("Video selected. Upload it to YouTube when your title and description are ready.");
  }

  async function recordVideo() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setStatus("Allow camera access to record a practice video.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["videos"],
      cameraType: ImagePicker.CameraType.front,
      quality: 0.8,
      videoMaxDuration: 600,
      allowsEditing: false,
    });

    if (result.canceled) {
      return;
    }

    clearUploadState();
    setSelectedAsset(result.assets[0] ?? null);
    setStatus("Recording captured. Review the details below, then upload it.");
  }

  async function improveDescription() {
    if (description.trim().length < 2) {
      setStatus("Write a short description before asking for AI help.");
      return;
    }

    setIsImproving(true);
    setStatus("Improving your description with AI...");

    try {
      const result = await api.improveGrammar(token, description.trim());
      setDescription(result.correctedText);
      setStatus("Description updated with AI feedback.");
    } catch (improveError) {
      setStatus(
        improveError instanceof Error
          ? improveError.message
          : "Unable to improve the description.",
      );
    } finally {
      setIsImproving(false);
    }
  }

  async function uploadVideo() {
    if (!selectedAsset?.uri) {
      setStatus("Choose or record a video before uploading.");
      return;
    }

    if (title.trim().length < 3) {
      setStatus("Title must be at least 3 characters.");
      return;
    }

    if (description.trim().length < 10) {
      setStatus("Description must be at least 10 characters.");
      return;
    }

    if (!data?.canUpload) {
      setStatus(
        "YouTube upload is not connected for this account yet. Connect YouTube on web first, then try again from mobile.",
      );
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("file", {
      uri: selectedAsset.uri,
      name:
        selectedAsset.fileName ??
        `${sanitizeFileName(title)}.${selectedAsset.mimeType?.includes("webm") ? "webm" : "mp4"}`,
      type: selectedAsset.mimeType ?? "video/mp4",
    } as never);

    setIsUploading(true);
    setStatus("Uploading your video to YouTube...");

    try {
      const result = await api.uploadVideo(token, formData);
      setUploadResult(result);
      setStatus("Upload complete. Your video is ready to publish into the feed.");
    } catch (uploadError) {
      setStatus(
        uploadError instanceof Error ? uploadError.message : "Unable to upload the video.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function publishPost() {
    if (!uploadResult) {
      setStatus("Upload the video first so the post has media.");
      return;
    }

    if (title.trim().length < 3 || description.trim().length < 10) {
      setStatus("Add a strong title and description before publishing.");
      return;
    }

    setIsPublishing(true);
    setStatus("Publishing your video into the live feed...");

    try {
      await api.createPost(token, {
        title: title.trim(),
        description: description.trim(),
        script: script.trim() || undefined,
        learningLevel,
        youtubeVideoId: uploadResult.videoId,
        youtubeUrl: uploadResult.url,
        videoStatus: "UPLOADED",
      });
      setStatus("Your video post is live. Opening the feed...");
      onNavigate?.("feed");
    } catch (publishError) {
      setStatus(
        publishError instanceof Error
          ? publishError.message
          : "Unable to publish the post.",
      );
    } finally {
      setIsPublishing(false);
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
        description="Choose a teleprompter prompt, capture a clip on your phone, upload it to YouTube, and publish it into the same feed used by the web app."
        kicker="Video Studio"
        title="Create real speaking videos from mobile."
      />

      {status ? <StatusNotice message={status} tone="info" /> : null}
      {error ? <StatusNotice message={error} tone="danger" /> : null}
      {loading && !data ? <LoadingState label="Loading studio prompts and upload status..." /> : null}

      {data ? (
        <>
          <Card style={{ gap: 14 }}>
            <SectionTitle
              subtitle="Match the same prompt levels used in the web studio."
              title="Teleprompter prompt"
            />
            <View>
              <Text style={styles.controlLabel}>Speaking level</Text>
              <SegmentedControl
                onChange={(value) => setLearningLevel(value as LearningLevel)}
                options={levelOptions}
                value={learningLevel}
              />
            </View>

            {filteredPrompts.length ? (
              <View style={styles.promptList}>
                {filteredPrompts.map((prompt) => {
                  const active = prompt.id === selectedPromptId;

                  return (
                    <Pressable
                      key={prompt.id}
                      onPress={() => applyPrompt(prompt)}
                      style={({ pressed }) => [
                        styles.promptCard,
                        active && styles.promptCardActive,
                        pressed && styles.promptCardPressed,
                      ]}
                    >
                      <View style={styles.promptHeader}>
                        <Text
                          style={[
                            styles.promptTitle,
                            active && styles.promptTitleActive,
                          ]}
                        >
                          {prompt.title}
                        </Text>
                        <Tag
                          label={levelLabel(prompt.level)}
                          tone={active ? "success" : "soft"}
                        />
                      </View>
                      {prompt.description ? (
                        <Text style={styles.promptDescription}>{prompt.description}</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <EmptyState
                description="There is no saved recording prompt for this level yet, but you can still type your own script below."
                title="No prompt for this level"
              />
            )}

            <TextField
              label="Prompt script"
              multiline
              onChangeText={setScript}
              placeholder="Write the script you want to speak on camera."
              value={script}
            />
          </Card>

          <Card style={{ gap: 14 }}>
            <SectionTitle
              subtitle="These details become the live post after upload."
              title="Post details"
            />
            <TextField
              label="Title"
              onChangeText={setTitle}
              placeholder="My confident speaking practice"
              value={title}
            />
            <TextField
              label="Description"
              multiline
              onChangeText={setDescription}
              placeholder="Share what you practiced or what the prompt is about."
              value={description}
            />
            <AppButton
              label={isImproving ? "Improving..." : "Improve description"}
              loading={isImproving}
              onPress={() => void improveDescription()}
              variant="ghost"
            />
          </Card>

          <Card style={{ gap: 14 }}>
            <SectionTitle
              subtitle="Capture a new take or pick an existing clip from your phone."
              title="Video source"
            />
            <View style={styles.captureRow}>
              <AppButton
                label="Record video"
                onPress={() => void recordVideo()}
                style={styles.flexButton}
              />
              <AppButton
                label="Choose clip"
                onPress={() => void chooseFromLibrary()}
                style={styles.flexButton}
                variant="soft"
              />
            </View>

            {selectedAsset ? (
              <View style={styles.assetCard}>
                <Text style={styles.assetTitle}>
                  {selectedAsset.fileName ?? "Selected practice clip"}
                </Text>
                <View style={styles.assetMetaRow}>
                  <Tag label={selectedAsset.type ?? "video"} tone="soft" />
                  <Tag label={formatDuration(selectedAsset.duration)} />
                  <Tag label={formatFileSize(selectedAsset.fileSize)} />
                </View>
                <Text style={styles.assetMetaText}>
                  {selectedAsset.width} x {selectedAsset.height} • {selectedAsset.mimeType ?? "video/mp4"}
                </Text>
              </View>
            ) : (
              <EmptyState
                description="No clip selected yet. Record from the camera or choose a video from the gallery."
                title="No video chosen"
              />
            )}

            {!data.canUpload ? (
              <StatusNotice
                message="YouTube is not connected for this account yet. Connect it from the web app once, then mobile uploads will start working too."
                tone="danger"
              />
            ) : null}

            {uploadResult ? (
              <View style={styles.assetCard}>
                <Text style={styles.assetTitle}>Upload complete</Text>
                <Text style={styles.assetMetaText}>Video ID: {uploadResult.videoId}</Text>
                <Text style={styles.assetMetaText}>{uploadResult.url}</Text>
              </View>
            ) : null}

            <View style={styles.captureRow}>
              <AppButton
                label={isUploading ? "Uploading..." : "Upload to YouTube"}
                loading={isUploading}
                onPress={() => void uploadVideo()}
                style={styles.flexButton}
              />
              <AppButton
                label={isPublishing ? "Publishing..." : "Publish to feed"}
                loading={isPublishing}
                onPress={() => void publishPost()}
                style={styles.flexButton}
                variant="ghost"
              />
            </View>
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  assetCard: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 22,
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  assetMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  assetMetaText: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  assetTitle: {
    color: palette.ink,
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: "700",
  },
  captureRow: {
    flexDirection: "row",
    gap: 10,
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
  promptCard: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  promptCardActive: {
    backgroundColor: "#edf5ff",
    borderColor: palette.cobalt,
    borderWidth: 1,
  },
  promptCardPressed: {
    opacity: 0.9,
  },
  promptDescription: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  promptHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  promptList: {
    gap: 12,
  },
  promptTitle: {
    color: palette.ink,
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 19,
    fontWeight: "700",
  },
  promptTitleActive: {
    color: palette.cobaltDeep,
  },
});
