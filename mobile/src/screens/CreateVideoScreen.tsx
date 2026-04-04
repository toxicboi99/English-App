import * as ImagePicker from "expo-image-picker";
import { setAudioModeAsync } from "expo-audio";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

type StudioVideoAsset = {
  uri: string;
  fileName: string;
  mimeType: string;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  sourceLabel: string;
};

const levelOptions = [
  { label: "Beginner", value: "BEGINNER" },
  { label: "Intermediate", value: "INTERMEDIATE" },
  { label: "Advanced", value: "ADVANCED" },
  { label: "Fluent", value: "FLUENT" },
];

const CAMERA_FRAME_HEIGHT = 420;

function formatFileSize(size?: number | null) {
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

function inferMimeType(uri: string, fallback?: string | null) {
  if (fallback) {
    return fallback;
  }

  const normalized = uri.toLowerCase();

  if (normalized.endsWith(".mov")) {
    return "video/quicktime";
  }

  if (normalized.endsWith(".webm")) {
    return "video/webm";
  }

  return "video/mp4";
}

function inferFileName(uri: string, fallback: string) {
  const lastSegment = uri.split("/").pop();

  if (lastSegment && lastSegment.includes(".")) {
    return lastSegment;
  }

  return fallback;
}

function getTeleprompterDurationMs(script: string) {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(Math.max(words * 500, 10_000), 120_000);
}

function SelectedVideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri }, (instance) => {
    instance.loop = false;
    instance.muted = false;
  });

  return (
    <VideoView
      contentFit="cover"
      nativeControls
      player={player}
      style={styles.videoPreview}
    />
  );
}

export function CreateVideoScreen({
  token,
  onNavigate,
}: CreateVideoScreenProps) {
  const { data, error, loading, refreshing, reload } = useRemoteResource(
    () => api.studio(token),
    [token],
  );
  const cameraRef = useRef<CameraView | null>(null);
  const permissionPromptedRef = useRef(false);
  const teleprompterProgress = useRef(new Animated.Value(0)).current;
  const recordingStartedAtRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] =
    useMicrophonePermissions();
  const [learningLevel, setLearningLevel] = useState<LearningLevel>("BEGINNER");
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(
    "I practiced this speaking prompt on SpeakUp mobile.",
  );
  const [script, setScript] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<StudioVideoAsset | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [isImproving, setIsImproving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isOpeningYouTube, setIsOpeningYouTube] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [teleprompterTextHeight, setTeleprompterTextHeight] = useState(220);

  const prompts = data?.prompts ?? [];
  const filteredPrompts = useMemo(
    () => prompts.filter((prompt) => prompt.level === learningLevel),
    [learningLevel, prompts],
  );
  const selectedPrompt =
    filteredPrompts.find((prompt) => prompt.id === selectedPromptId) ?? null;
  const hasStudioPermissions = Boolean(
    cameraPermission?.granted && microphonePermission?.granted,
  );
  const teleprompterDuration = useMemo(
    () => getTeleprompterDurationMs(script),
    [script],
  );
  const teleprompterTranslateY = teleprompterProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [CAMERA_FRAME_HEIGHT * 0.52, -(teleprompterTextHeight + 48)],
  });

  useEffect(() => {
    if (permissionPromptedRef.current) {
      return;
    }

    if (cameraPermission === null || microphonePermission === null) {
      return;
    }

    permissionPromptedRef.current = true;
    void ensureStudioPermissions(false);
  }, [cameraPermission, microphonePermission]);

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

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const intervalId = setInterval(() => {
      if (recordingStartedAtRef.current) {
        setRecordingDurationMs(Date.now() - recordingStartedAtRef.current);
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      teleprompterProgress.stopAnimation();
      cameraRef.current?.stopRecording();
    };
  }, [teleprompterProgress]);

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

  function stopTeleprompter() {
    teleprompterProgress.stopAnimation();
    teleprompterProgress.setValue(0);
  }

  function mapPickerAsset(asset: ImagePicker.ImagePickerAsset): StudioVideoAsset {
    const fallbackName = `${sanitizeFileName(title)}.${asset.mimeType?.includes("webm") ? "webm" : "mp4"}`;

    return {
      uri: asset.uri,
      fileName: asset.fileName ?? inferFileName(asset.uri, fallbackName),
      mimeType: inferMimeType(asset.uri, asset.mimeType),
      durationMs: asset.duration,
      width: asset.width,
      height: asset.height,
      fileSize: asset.fileSize,
      sourceLabel: "Chosen from library",
    };
  }

  async function ensureStudioPermissions(showReadyStatus = true) {
    try {
      const nextCameraPermission = cameraPermission?.granted
        ? cameraPermission
        : await requestCameraPermission();
      const nextMicrophonePermission = microphonePermission?.granted
        ? microphonePermission
        : await requestMicrophonePermission();
      const granted = Boolean(
        nextCameraPermission?.granted && nextMicrophonePermission?.granted,
      );

      if (!granted) {
        setStatus("Allow camera and microphone access to use the in-app mobile studio.");
        return false;
      }

      if (showReadyStatus) {
        setStatus(
          "Studio camera is ready. Use the front camera, read the teleprompter, and record inside the app.",
        );
      }

      return true;
    } catch (permissionError) {
      setStatus(
        permissionError instanceof Error
          ? permissionError.message
          : "Unable to request camera permissions.",
      );
      return false;
    }
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
    setSelectedVideo(mapPickerAsset(result.assets[0]));
    setStatus("Video selected. Review it, improve the post details, then upload.");
  }

  async function startStudioRecording() {
    if (isRecordingRef.current) {
      return;
    }

    if (!script.trim()) {
      setStatus("Choose a prompt or write a short script before recording.");
      return;
    }

    const hasPermissions = await ensureStudioPermissions(true);

    if (!hasPermissions) {
      return;
    }

    if (!cameraRef.current || !cameraReady) {
      setStatus("The front camera is still preparing. Try again in a second.");
      return;
    }

    clearUploadState();
    setSelectedVideo(null);
    setRecordingDurationMs(0);
    recordingStartedAtRef.current = Date.now();
    isRecordingRef.current = true;
    setIsRecording(true);
    setStatus("Recording started. Read the teleprompter and speak into the front camera.");

    await setAudioModeAsync({
      allowsRecording: true,
      interruptionMode: "duckOthers",
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    }).catch(() => null);

    teleprompterProgress.stopAnimation();
    teleprompterProgress.setValue(0);
    Animated.timing(teleprompterProgress, {
      toValue: 1,
      duration: teleprompterDuration,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && isRecordingRef.current) {
        stopStudioRecording("Teleprompter finished. Saving your take...");
      }
    });

    try {
      const recording = await cameraRef.current.recordAsync({
        maxDuration: Math.ceil(teleprompterDuration / 1000) + 2,
      });

      if (!recording?.uri) {
        setStatus("Recording finished, but no video file was captured. Please try again.");
        return;
      }

      const elapsedDuration = recordingStartedAtRef.current
        ? Date.now() - recordingStartedAtRef.current
        : recordingDurationMs;
      const fallbackName = `${sanitizeFileName(title)}.mp4`;

      setSelectedVideo({
        uri: recording.uri,
        fileName: inferFileName(recording.uri, fallbackName),
        mimeType: inferMimeType(recording.uri),
        durationMs: elapsedDuration || null,
        sourceLabel: "Recorded in mobile studio",
      });
      setStatus(
        "Recording captured. Preview your take below, then upload it to YouTube and publish it.",
      );
    } catch (recordError) {
      setStatus(
        recordError instanceof Error
          ? recordError.message
          : "Unable to save the recording.",
      );
    } finally {
      isRecordingRef.current = false;
      setIsRecording(false);
      recordingStartedAtRef.current = null;
      stopTeleprompter();
      await setAudioModeAsync({
        allowsRecording: false,
        interruptionMode: "duckOthers",
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      }).catch(() => null);
    }
  }

  function stopStudioRecording(nextStatus = "Recording stopped. Saving your take...") {
    if (!isRecordingRef.current) {
      return;
    }

    isRecordingRef.current = false;
    setIsRecording(false);
    setStatus(nextStatus);

    if (recordingStartedAtRef.current) {
      setRecordingDurationMs(Date.now() - recordingStartedAtRef.current);
    }

    stopTeleprompter();
    cameraRef.current?.stopRecording();
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

  async function openYouTubeConnect() {
    if (!data?.youtubeConnectUrl) {
      setStatus("The backend did not return a YouTube connection URL.");
      return;
    }

    setIsOpeningYouTube(true);

    try {
      await Linking.openURL(data.youtubeConnectUrl);
      setStatus(
        "The YouTube connection flow is opening in your browser. Return here after the account is connected.",
      );
    } catch (openError) {
      setStatus(
        openError instanceof Error
          ? openError.message
          : "Unable to open the YouTube connection flow.",
      );
    } finally {
      setIsOpeningYouTube(false);
    }
  }

  async function uploadVideo() {
    if (!selectedVideo?.uri) {
      setStatus("Record or choose a video before uploading.");
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
        "YouTube is not connected for this account yet. Connect it first, then try uploading again.",
      );
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("file", {
      uri: selectedVideo.uri,
      name: selectedVideo.fileName,
      type: selectedVideo.mimeType,
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
        description="Use the front camera inside the app, follow the moving teleprompter, preview your take, upload it to YouTube, and publish it into the same live feed as web."
        kicker="Video Studio"
        title="Record mobile speaking videos without leaving the app."
      />

      {status ? <StatusNotice message={status} tone="info" /> : null}
      {error ? <StatusNotice message={error} tone="danger" /> : null}
      {loading && !data ? (
        <LoadingState label="Loading studio prompts and upload status..." />
      ) : null}

      {data ? (
        <>
          <Card style={{ gap: 14 }}>
            <SectionTitle
              subtitle="Match the same prompt levels and teleprompter scripts used in the web studio."
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
                      disabled={isRecording}
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

            {selectedPrompt?.description ? (
              <Text style={styles.helperText}>{selectedPrompt.description}</Text>
            ) : null}

            <TextField
              editable={!isRecording}
              label="Prompt script"
              multiline
              onChangeText={setScript}
              placeholder="Write the script you want to speak on camera."
              value={script}
            />
          </Card>

          <Card style={{ gap: 14 }}>
            <SectionTitle
              subtitle="The front camera stays inside the mobile app, and the teleprompter scrolls while you record."
              title="Mobile studio camera"
            />

            {hasStudioPermissions ? (
              <View style={styles.studioShell}>
                <View style={styles.cameraStage}>
                  <CameraView
                    active={hasStudioPermissions}
                    facing="front"
                    mirror
                    mode="video"
                    mute={false}
                    onCameraReady={() => {
                      setCameraReady(true);
                    }}
                    onMountError={(mountError) => {
                      setCameraReady(false);
                      setStatus(mountError.message);
                    }}
                    ref={cameraRef}
                    style={styles.cameraView}
                    videoQuality="720p"
                  />

                  <LinearGradient
                    colors={[
                      "rgba(4, 9, 18, 0.72)",
                      "rgba(4, 9, 18, 0.14)",
                      "rgba(4, 9, 18, 0.78)",
                    ]}
                    pointerEvents="none"
                    style={styles.cameraShade}
                  />

                  <View pointerEvents="none" style={styles.cameraTopRow}>
                    <Tag label="Front camera" tone="soft" />
                    <Tag
                      label={isRecording ? "Recording" : cameraReady ? "Ready" : "Loading"}
                      tone={isRecording ? "success" : "soft"}
                    />
                  </View>

                  <View pointerEvents="none" style={styles.teleprompterViewport}>
                    <Animated.View
                      style={[
                        styles.teleprompterTicker,
                        { transform: [{ translateY: teleprompterTranslateY }] },
                      ]}
                    >
                      <View
                        onLayout={(event) => {
                          setTeleprompterTextHeight(event.nativeEvent.layout.height);
                        }}
                      >
                        <Text style={styles.teleprompterOverlayText}>
                          {script.trim() ||
                            "Choose a prompt or write your own script before you record."}
                        </Text>
                      </View>
                    </Animated.View>
                  </View>

                  {!cameraReady ? (
                    <View style={styles.cameraLoadingOverlay}>
                      <ActivityIndicator color={palette.white} size="large" />
                      <Text style={styles.cameraLoadingText}>
                        Preparing the front camera...
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.recordingMetaRow}>
                  <Tag
                    label={isRecording ? "Live take" : "Practice mode"}
                    tone={isRecording ? "success" : "soft"}
                  />
                  <Tag
                    label={formatDuration(
                      isRecording ? recordingDurationMs : selectedVideo?.durationMs,
                    )}
                  />
                  <Tag label={`${Math.round(teleprompterDuration / 1000)}s script`} tone="soft" />
                </View>
              </View>
            ) : (
              <View style={styles.permissionCard}>
                <Text style={styles.connectCopy}>
                  Camera and microphone access are required so the studio can keep the front
                  camera and teleprompter inside the mobile screen while you record.
                </Text>
                <AppButton
                  label="Enable camera and mic"
                  onPress={() => void ensureStudioPermissions(true)}
                  variant="soft"
                />
              </View>
            )}

            <View style={styles.captureRow}>
              {!isRecording ? (
                <AppButton
                  disabled={!hasStudioPermissions || !cameraReady}
                  label={selectedVideo ? "Record again" : "Start recording"}
                  onPress={() => void startStudioRecording()}
                  style={styles.flexButton}
                />
              ) : (
                <AppButton
                  label="Stop recording"
                  onPress={() => stopStudioRecording()}
                  style={styles.flexButton}
                  variant="ghost"
                />
              )}
              <AppButton
                disabled={isRecording}
                label="Choose clip"
                onPress={() => void chooseFromLibrary()}
                style={styles.flexButton}
                variant="soft"
              />
            </View>
          </Card>

          <Card style={{ gap: 14 }}>
            <SectionTitle
              subtitle="Preview the take you just recorded in the mobile studio or a clip chosen from the library."
              title="Recorded take"
            />

            {selectedVideo?.uri ? (
              <View style={styles.previewCard}>
                <SelectedVideoPreview uri={selectedVideo.uri} />
                <View style={styles.assetMetaWrap}>
                  <Text style={styles.assetTitle}>{selectedVideo.fileName}</Text>
                  <View style={styles.assetMetaRow}>
                    <Tag label={selectedVideo.sourceLabel} tone="soft" />
                    <Tag label={formatDuration(selectedVideo.durationMs)} />
                    <Tag label={formatFileSize(selectedVideo.fileSize)} />
                  </View>
                  <Text style={styles.assetMetaText}>
                    {selectedVideo.width && selectedVideo.height
                      ? `${selectedVideo.width} x ${selectedVideo.height}`
                      : "Resolution unavailable"}{" "}
                    | {selectedVideo.mimeType}
                  </Text>
                </View>
              </View>
            ) : (
              <EmptyState
                description="Record a take with the front camera or choose a saved clip to continue."
                title="No video chosen"
              />
            )}
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
              subtitle="Connect YouTube once, then your uploads and publishing will work from mobile too."
              title="Upload and publish"
            />

            {data.canUpload ? (
              <StatusNotice
                message="YouTube is connected for this account. You can upload and publish from mobile."
                tone="success"
              />
            ) : (
              <View style={styles.connectCard}>
                <Text style={styles.connectCopy}>
                  YouTube is not connected for this account yet. Open the browser flow once,
                  finish the connection, then come back here and refresh.
                </Text>
                <AppButton
                  label={isOpeningYouTube ? "Opening..." : "Connect YouTube"}
                  loading={isOpeningYouTube}
                  onPress={() => void openYouTubeConnect()}
                  variant="soft"
                />
              </View>
            )}

            {uploadResult ? (
              <View style={styles.assetCard}>
                <Text style={styles.assetTitle}>Upload complete</Text>
                <Text style={styles.assetMetaText}>Video ID: {uploadResult.videoId}</Text>
                <Text style={styles.assetMetaText}>{uploadResult.url}</Text>
              </View>
            ) : null}

            <View style={styles.captureRow}>
              <AppButton
                disabled={!selectedVideo || isUploading || !data.canUpload}
                label={isUploading ? "Uploading..." : "Upload to YouTube"}
                loading={isUploading}
                onPress={() => void uploadVideo()}
                style={styles.flexButton}
              />
              <AppButton
                disabled={!uploadResult || isPublishing}
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
  assetMetaWrap: {
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  assetTitle: {
    color: palette.ink,
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: "700",
  },
  cameraLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(7, 15, 26, 0.32)",
    gap: 12,
    justifyContent: "center",
  },
  cameraLoadingText: {
    color: palette.white,
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: "700",
  },
  cameraShade: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraStage: {
    backgroundColor: palette.ink,
    borderRadius: 28,
    height: CAMERA_FRAME_HEIGHT,
    overflow: "hidden",
    position: "relative",
  },
  cameraTopRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    left: 16,
    position: "absolute",
    right: 16,
    top: 16,
  },
  cameraView: {
    ...StyleSheet.absoluteFillObject,
  },
  captureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  connectCard: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 22,
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  connectCopy: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
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
  helperText: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  permissionCard: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 24,
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  previewCard: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 22,
    overflow: "hidden",
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
  recordingMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  studioShell: {
    gap: 14,
  },
  teleprompterOverlayText: {
    color: palette.white,
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 34,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.48)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  teleprompterTicker: {
    width: "100%",
  },
  teleprompterViewport: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  videoPreview: {
    backgroundColor: palette.ink,
    height: 220,
    width: "100%",
  },
});
