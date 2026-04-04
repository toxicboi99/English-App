import { startTransition, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

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
import type { AppScreenKey, LearningLevel, RecordingPrompt, SessionUser } from "../types";
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

export function PracticeSpeakingScreen({ token }: PracticeSpeakingScreenProps) {
  const { data, error, loading, refreshing, reload } = useRemoteResource(
    () => api.studio(token),
    [token],
  );
  const [learningLevel, setLearningLevel] = useState<LearningLevel>("BEGINNER");
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [targetText, setTargetText] = useState("");
  const [spokenText, setSpokenText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
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

  function applyPrompt(prompt: RecordingPrompt) {
    setSelectedPromptId(prompt.id);
    startTransition(() => {
      setLearningLevel(prompt.level);
      setTargetText(prompt.script);
    });
  }

  async function generateScore() {
    if (targetText.trim().length < 2) {
      setStatus("Add the target sentence or speaking prompt first.");
      return;
    }

    if (spokenText.trim().length < 1) {
      setStatus("Type what you actually said before generating a score.");
      return;
    }

    setIsScoring(true);
    setStatus("Scoring your response...");

    try {
      const result = await api.speakingFeedback(token, targetText.trim(), spokenText.trim());
      setFeedback(result);
      setStatus("Feedback ready.");
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

  async function improveSentence() {
    const text = spokenText.trim() || targetText.trim();

    if (text.length < 2) {
      setStatus("Type or choose a sentence before requesting AI feedback.");
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
        description="Use the same speaking prompts as the web app, compare what you said against the target text, and review score-based feedback from the live backend."
        kicker="Speaking Practice"
        title="Train your speaking with score feedback."
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
              subtitle="Write the sentence you wanted to say and the sentence you actually spoke."
              title="Practice input"
            />
            <TextField
              label="Target text"
              multiline
              onChangeText={setTargetText}
              placeholder="Write the sentence or paragraph you want to practice."
              value={targetText}
            />
            <TextField
              label="What you said"
              multiline
              onChangeText={setSpokenText}
              placeholder="Type the transcript of what you actually said."
              value={spokenText}
            />
            <View style={styles.actionRow}>
              <AppButton
                label={isScoring ? "Scoring..." : "Generate score"}
                loading={isScoring}
                onPress={() => void generateScore()}
                style={styles.flexButton}
              />
              <AppButton
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
              <SectionTitle
                subtitle="AI writing feedback"
                title="Improved sentence"
              />
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
