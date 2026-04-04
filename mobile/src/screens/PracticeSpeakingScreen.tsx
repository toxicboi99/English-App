import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
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
} from "../types";
import { levelLabel } from "../utils";

type PracticeSpeakingScreenProps = {
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

const liveTranscriptChunkMs = 4000;

function formatRecordingDuration(durationMillis: number) {
  const totalSeconds = Math.max(0, Math.round(durationMillis / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function inferAudioUploadMeta(uri: string) {
  const lowerUri = uri.toLowerCase();

  if (lowerUri.endsWith(".webm")) {
    return { mimeType: "audio/webm", extension: "webm" };
  }

  if (lowerUri.endsWith(".3gp")) {
    return { mimeType: "audio/3gpp", extension: "3gp" };
  }

  if (lowerUri.endsWith(".caf")) {
    return { mimeType: "audio/x-caf", extension: "caf" };
  }

  return { mimeType: "audio/mp4", extension: "m4a" };
}

export function PracticeSpeakingScreen({ token }: PracticeSpeakingScreenProps) {
  const { data, error, loading, refreshing, reload } = useRemoteResource(
    () => api.studio(token),
    [token],
  );
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (nextStatus) => {
    if (nextStatus.hasError && nextStatus.error) {
      setStatus(nextStatus.error);
    }
  });
  const recorderState = useAudioRecorderState(recorder, 250);
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveListeningRef = useRef(false);
  const chunkBusyRef = useRef(false);
  const spokenTextRef = useRef("");
  const [learningLevel, setLearningLevel] = useState<LearningLevel>("BEGINNER");
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [targetText, setTargetText] = useState("");
  const [spokenText, setSpokenText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isListeningLive, setIsListeningLive] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [feedback, setFeedback] = useState<Awaited<
    ReturnType<typeof api.speakingFeedback>
  > | null>(null);
  const [improvedText, setImprovedText] = useState<Awaited<
    ReturnType<typeof api.improveGrammar>
  > | null>(null);

  const prompts = data?.prompts ?? [];
  const filteredPrompts = useMemo(
    () => prompts.filter((prompt) => prompt.level === learningLevel),
    [learningLevel, prompts],
  );
  const selectedPrompt = filteredPrompts.find((prompt) => prompt.id === selectedPromptId) ?? null;

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
    setTargetText(fallbackPrompt.script);
  }, [filteredPrompts, selectedPromptId]);

  useEffect(() => {
    spokenTextRef.current = spokenText;
  }, [spokenText]);

  useEffect(() => {
    return () => {
      liveListeningRef.current = false;

      if (chunkTimerRef.current) {
        clearTimeout(chunkTimerRef.current);
      }

      void setAudioModeAsync({
        allowsRecording: false,
        interruptionMode: "duckOthers",
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      }).catch(() => null);
    };
  }, []);

  function applyPrompt(prompt: RecordingPrompt) {
    setSelectedPromptId(prompt.id);
    startTransition(() => {
      setLearningLevel(prompt.level);
      setTargetText(prompt.script);
    });
  }

  function clearChunkTimer() {
    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
  }

  async function disableRecordingAudioMode() {
    await setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: "duckOthers",
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    }).catch(() => null);
  }

  async function scoreTranscript(transcript: string, mode: "live" | "manual" = "manual") {
    if (targetText.trim().length < 2 || transcript.trim().length < 1) {
      return;
    }

    setIsScoring(true);
    setStatus(
      mode === "live"
        ? "Transcript updated. Refreshing your score..."
        : "Transcript ready. Generating your score...",
    );

    try {
      const result = await api.speakingFeedback(token, targetText.trim(), transcript.trim());
      setFeedback(result);
      setStatus(
        liveListeningRef.current
          ? "Listening live... transcript and score are updating."
          : "Transcript and score are ready.",
      );
    } catch (scoreError) {
      setStatus(
        scoreError instanceof Error
          ? scoreError.message
          : "Unable to generate speaking feedback.",
      );
    } finally {
      setIsScoring(false);
    }
  }

  async function transcribeRecording(recordingUri: string) {
    setIsTranscribing(true);
    setStatus(
      liveListeningRef.current
        ? "Transcribing the latest live chunk..."
        : "Transcribing your voice...",
    );

    const fileMeta = inferAudioUploadMeta(recordingUri);
    const formData = new FormData();
    formData.append("language", "en");
    formData.append("file", {
      uri: recordingUri,
      name: `speakup-${Date.now()}.${fileMeta.extension}`,
      type: fileMeta.mimeType,
    } as never);

    try {
      const result = await api.transcribeSpeech(token, formData);
      const incomingTranscript = result.transcript.trim();

      if (!incomingTranscript) {
        return;
      }

      const nextTranscript = [spokenTextRef.current, incomingTranscript]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (!nextTranscript || nextTranscript === spokenTextRef.current) {
        return;
      }

      spokenTextRef.current = nextTranscript;
      setSpokenText(nextTranscript);
      await scoreTranscript(nextTranscript, liveListeningRef.current ? "live" : "manual");
    } catch (transcribeError) {
      setStatus(
        transcribeError instanceof Error
          ? transcribeError.message
          : "Unable to transcribe your recording right now.",
      );
    } finally {
      setIsTranscribing(false);
    }
  }

  async function getRecordingUri() {
    let recordingUri = recorder.uri ?? recorder.getStatus().url ?? recorderState.url;

    if (!recordingUri) {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        recordingUri = recorder.uri ?? recorder.getStatus().url ?? recorderState.url;

        if (recordingUri) {
          break;
        }
      }
    }

    return recordingUri;
  }

  async function startNextLiveChunk() {
    if (!liveListeningRef.current) {
      return;
    }

    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      clearChunkTimer();
      chunkTimerRef.current = setTimeout(() => {
        void finishLiveChunk(true);
      }, liveTranscriptChunkMs);
      setStatus("Listening live... transcript will keep filling while you speak.");
    } catch (recordingError) {
      liveListeningRef.current = false;
      setIsListeningLive(false);
      await disableRecordingAudioMode();
      setStatus(
        recordingError instanceof Error
          ? recordingError.message
          : "Unable to continue live microphone recording.",
      );
    }
  }

  async function finishLiveChunk(continueListening: boolean) {
    if (chunkBusyRef.current) {
      return;
    }

    chunkBusyRef.current = true;
    clearChunkTimer();

    try {
      const recorderStatus = recorder.getStatus();
      const isRecordingNow = recorderState.isRecording || recorderStatus.isRecording;

      if (isRecordingNow) {
        await recorder.stop();
        const recordingUri = await getRecordingUri();

        if (!recordingUri) {
          setStatus("Recording finished, but no audio file was saved. Please try again.");
        } else {
          await transcribeRecording(recordingUri);
        }
      }
    } catch (stopError) {
      setStatus(
        stopError instanceof Error
          ? stopError.message
          : "Unable to finish the current live chunk.",
      );
    } finally {
      chunkBusyRef.current = false;

      if (continueListening && liveListeningRef.current) {
        await startNextLiveChunk();
      } else {
        liveListeningRef.current = false;
        setIsListeningLive(false);
        await disableRecordingAudioMode();
        setStatus(
          spokenTextRef.current.trim()
            ? "Listening stopped. Transcript and score are ready."
            : "Listening stopped.",
        );
      }
    }
  }

  async function startListening() {
    liveListeningRef.current = false;
    setIsListeningLive(false);
    clearChunkTimer();
    setFeedback(null);
    setImprovedText(null);
    spokenTextRef.current = "";
    setSpokenText("");

    const permission = await requestRecordingPermissionsAsync();

    if (!permission.granted) {
      setStatus("Allow microphone access so SpeakUp can listen and transcribe what you say.");
      return;
    }

    try {
      await setAudioModeAsync({
        allowsRecording: true,
        interruptionMode: "duckOthers",
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });
      liveListeningRef.current = true;
      setIsListeningLive(true);
      await startNextLiveChunk();
    } catch (recordingError) {
      setStatus(
        recordingError instanceof Error
          ? recordingError.message
          : "Unable to start microphone recording.",
      );
    }
  }

  async function stopListening() {
    if (!isListeningLive && !recorderState.isRecording && !chunkBusyRef.current) {
      return;
    }

    liveListeningRef.current = false;
    setIsListeningLive(false);
    clearChunkTimer();

    if (chunkBusyRef.current) {
      setStatus("Finishing the current live transcript chunk...");
      return;
    }

    await finishLiveChunk(false);
  }

  async function generateScore() {
    if (targetText.trim().length < 2) {
      setStatus("Add the target sentence or speaking prompt first.");
      return;
    }

    if (spokenText.trim().length < 1) {
      setStatus("Record yourself or type the transcript before generating a score.");
      return;
    }

    await scoreTranscript(spokenText.trim());
  }

  async function improveSentence() {
    const text = spokenText.trim() || targetText.trim();

    if (text.length < 2) {
      setStatus("Record or type a sentence before requesting AI feedback.");
      return;
    }

    setIsImproving(true);
    setStatus("Improving your sentence with AI...");

    try {
      const result = await api.improveGrammar(token, text);
      setImprovedText(result);
      setStatus("AI improvement generated.");
    } catch (improveError) {
      setStatus(
        improveError instanceof Error
          ? improveError.message
          : "Unable to improve the sentence.",
      );
    } finally {
      setIsImproving(false);
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
        description="Use the same speaking prompts as the web app, let SpeakUp fill the transcript while you talk, and keep the score updating against the target sentence."
        kicker="Speaking Practice"
        title="Train your speaking with live voice capture."
      />

      {status ? <StatusNotice message={status} tone="info" /> : null}
      {error ? <StatusNotice message={error} tone="danger" /> : null}
      {loading && !data ? <LoadingState label="Loading speaking prompts..." /> : null}

      {data ? (
        <>
          <Card style={{ gap: 14 }}>
            <SectionTitle
              subtitle="Choose a prompt level and load a real script from the shared prompt library."
              title="Prompt selection"
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
                description="No saved speaking prompt matches this level yet. You can still type your own sentence below."
                title="No prompt for this level"
              />
            )}
          </Card>

          <Card style={{ gap: 14 }}>
            <SectionTitle
              subtitle="Speak naturally and let the transcript plus score update in live chunks while you practice."
              title="Voice capture"
            />
            <View style={styles.recordingSummary}>
              <Tag
                label={
                  isListeningLive || recorderState.isRecording
                    ? "Listening live"
                    : "Microphone idle"
                }
                tone={
                  isListeningLive || recorderState.isRecording ? "success" : "soft"
                }
              />
              <Tag label={`Duration ${formatRecordingDuration(recorderState.durationMillis)}`} />
              {selectedPrompt ? (
                <Tag label={selectedPrompt.title} tone="soft" />
              ) : null}
            </View>
            <TextField
              label="Target text"
              multiline
              onChangeText={setTargetText}
              placeholder="Write the sentence or paragraph you want to practice."
              value={targetText}
            />
            <View style={styles.actionRow}>
              <AppButton
                disabled={isListeningLive || recorderState.isRecording || isTranscribing}
                label="Start listening"
                onPress={() => void startListening()}
                style={styles.flexButton}
              />
              <AppButton
                disabled={!isListeningLive && !recorderState.isRecording && !isTranscribing}
                label="Stop"
                onPress={() => void stopListening()}
                style={styles.flexButton}
                variant="ghost"
              />
            </View>
            <Text style={styles.helperText}>
              Speak clearly into your phone. SpeakUp records in short live chunks so the
              transcript and score keep filling while you are still talking.
            </Text>
          </Card>

          <Card style={{ gap: 14 }}>
            <SectionTitle
              subtitle="This transcript is filled from your recording and stays editable."
              title="What SpeakUp heard"
            />
            <TextField
              label="Transcript"
              multiline
              onChangeText={setSpokenText}
              placeholder="Your spoken transcript will keep appearing here while you speak."
              value={spokenText}
            />
            <View style={styles.actionRow}>
              <AppButton
                disabled={isScoring || isTranscribing}
                label={isScoring ? "Scoring..." : "Generate score"}
                loading={isScoring}
                onPress={() => void generateScore()}
                style={styles.flexButton}
              />
              <AppButton
                disabled={isImproving || isTranscribing}
                label={isImproving ? "Improving..." : "Improve sentence"}
                loading={isImproving}
                onPress={() => void improveSentence()}
                style={styles.flexButton}
                variant="ghost"
              />
            </View>
          </Card>

          {feedback ? (
            <Card style={{ gap: 14 }}>
              <SectionTitle
                subtitle="Live accuracy feedback from the shared scoring logic."
                title="Score breakdown"
              />
              <View style={styles.scoreHero}>
                <Text style={styles.scoreValue}>{feedback.score}%</Text>
                <Text style={styles.scoreCopy}>{feedback.feedback}</Text>
              </View>
              <View style={styles.metricRow}>
                <Tag label={`Matched ${feedback.matchedWords}`} tone="success" />
                <Tag label={`Total ${feedback.totalWords}`} tone="soft" />
              </View>
              <View style={styles.feedbackGrid}>
                <View style={styles.feedbackCard}>
                  <Text style={styles.feedbackTitle}>Missing words</Text>
                  <Text style={styles.feedbackBody}>
                    {feedback.missingWords.length
                      ? feedback.missingWords.join(", ")
                      : "None"}
                  </Text>
                </View>
                <View style={styles.feedbackCard}>
                  <Text style={styles.feedbackTitle}>Extra words</Text>
                  <Text style={styles.feedbackBody}>
                    {feedback.extraWords.length
                      ? feedback.extraWords.join(", ")
                      : "None"}
                  </Text>
                </View>
              </View>
            </Card>
          ) : null}

          {improvedText ? (
            <Card style={styles.improvedCard}>
              <SectionTitle subtitle="AI writing feedback" title="Improved sentence" />
              <Text style={styles.improvedSentence}>{improvedText.correctedText}</Text>
              {improvedText.explanation ? (
                <Text style={styles.improvedExplanation}>{improvedText.explanation}</Text>
              ) : null}
            </Card>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionRow: {
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
  feedbackBody: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  feedbackCard: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  feedbackGrid: {
    gap: 12,
  },
  feedbackTitle: {
    color: palette.ink,
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: "700",
  },
  flexButton: {
    flex: 1,
  },
  helperText: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
  improvedCard: {
    backgroundColor: "#fff6df",
    borderColor: "#f0d999",
    gap: 12,
  },
  improvedExplanation: {
    color: "#8a6518",
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  improvedSentence: {
    color: "#6b4f12",
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  recordingSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scoreCopy: {
    color: palette.cobaltDeep,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    textAlign: "center",
  },
  scoreHero: {
    alignItems: "center",
    backgroundColor: "#edf7ff",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  scoreValue: {
    color: palette.cobaltDeep,
    fontFamily: fonts.display,
    fontSize: 44,
    fontWeight: "700",
  },
});
