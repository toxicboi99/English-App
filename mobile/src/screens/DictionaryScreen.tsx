import { startTransition, useDeferredValue, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

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
import type { LearningLevel, SessionUser } from "../types";
import { levelLabel } from "../utils";

type DictionaryScreenProps = {
  token: string;
  user: SessionUser;
};

const levelOptions = [
  { label: "Beginner", value: "BEGINNER" },
  { label: "Intermediate", value: "INTERMEDIATE" },
  { label: "Advanced", value: "ADVANCED" },
  { label: "Fluent", value: "FLUENT" },
];

export function DictionaryScreen({ token }: DictionaryScreenProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [savingWordId, setSavingWordId] = useState<string | null>(null);
  const [word, setWord] = useState("");
  const [definition, setDefinition] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("");
  const [phonetic, setPhonetic] = useState("");
  const [exampleSentence, setExampleSentence] = useState("");
  const [level, setLevel] = useState<LearningLevel>("BEGINNER");
  const [isCreating, setIsCreating] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const { data, error, loading, refreshing, reload } = useRemoteResource(
    () => api.dictionary(token, deferredQuery.trim()),
    [token, deferredQuery],
  );

  async function saveWord(wordId: string) {
    setSavingWordId(wordId);
    setStatus(null);

    try {
      await api.saveWord(token, wordId, "Saved from SpeakUp mobile.");
      setStatus("Word saved to your live personal vocabulary.");
      await reload();
    } catch (saveError) {
      setStatus(
        saveError instanceof Error ? saveError.message : "Unable to save word.",
      );
    } finally {
      setSavingWordId(null);
    }
  }

  async function createWord() {
    if (!word.trim()) {
      setStatus("Enter a word before adding it.");
      return;
    }

    if (definition.trim().length < 3) {
      setStatus("Add a short definition first.");
      return;
    }

    setIsCreating(true);
    setStatus(null);

    try {
      const result = await api.createWord(token, {
        word: word.trim(),
        definition: definition.trim(),
        partOfSpeech: partOfSpeech.trim() || undefined,
        phonetic: phonetic.trim() || undefined,
        exampleSentence: exampleSentence.trim() || undefined,
        level,
        notes: "Created from SpeakUp mobile.",
      });

      setStatus(
        result.created
          ? `${result.word.word} was added to the shared dictionary and saved for you.`
          : `${result.word.word} already existed and is now saved for you.`,
      );

      startTransition(() => {
        setQuery(result.word.word);
      });
      setWord("");
      setDefinition("");
      setPartOfSpeech("");
      setPhonetic("");
      setExampleSentence("");
      setLevel("BEGINNER");
      await reload();
    } catch (createError) {
      setStatus(
        createError instanceof Error
          ? createError.message
          : "Unable to create dictionary entry.",
      );
    } finally {
      setIsCreating(false);
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
        description="Search global dictionary entries, save them to your account, or create missing words directly from mobile."
        kicker="Dictionary"
        title="Vocabulary that stays in sync."
      />

      <Card style={{ gap: 14 }}>
        <TextField
          autoCapitalize="none"
          helper="Search by word or meaning. Results are live from the shared dictionary table."
          label="Search"
          onChangeText={setQuery}
          placeholder="Try confident, routine, debate..."
          value={query}
        />
        {status ? <StatusNotice message={status} tone="info" /> : null}
        {error ? <StatusNotice message={error} tone="danger" /> : null}
      </Card>

      {loading && !data ? <LoadingState label="Searching live dictionary data..." /> : null}

      {data ? (
        <>
          <Card>
            <SectionTitle
              subtitle="Shared searchable words from the live database."
              title="Search results"
            />
            {data.words.length ? (
              <View style={styles.list}>
                {data.words.map((entry) => (
                  <View key={entry.id} style={styles.wordCard}>
                    <View style={styles.wordHeader}>
                      <View style={styles.wordHeaderText}>
                        <Text style={styles.wordName}>{entry.word}</Text>
                        <Text style={styles.wordMeta}>
                          {[entry.partOfSpeech, entry.phonetic]
                            .filter(Boolean)
                            .join(" • ") || "Meaning and practice details"}
                        </Text>
                      </View>
                      <Tag label={levelLabel(entry.level)} />
                    </View>
                    <Text style={styles.wordDefinition}>{entry.definition}</Text>
                    {entry.exampleSentence ? (
                      <Text style={styles.exampleText}>{entry.exampleSentence}</Text>
                    ) : null}
                    <AppButton
                      disabled={Boolean(entry.userWords.length)}
                      label={
                        entry.userWords.length
                          ? "Saved already"
                          : savingWordId === entry.id
                            ? "Saving..."
                            : "Save word"
                      }
                      loading={savingWordId === entry.id}
                      onPress={() => void saveWord(entry.id)}
                      style={{ marginTop: 14 }}
                      variant={entry.userWords.length ? "ghost" : "soft"}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                description={
                  query.trim()
                    ? `Nothing matched "${query.trim()}". Add it below and it becomes real data for everyone.`
                    : "Type in the search box to pull live dictionary results."
                }
                title="No matching words"
              />
            )}
          </Card>

          <Card>
            <SectionTitle
              subtitle="Your most recently saved words."
              title="Saved vocabulary"
            />
            {data.savedWords.length ? (
              <View style={styles.list}>
                {data.savedWords.map((saved) => (
                  <View key={saved.id} style={styles.savedCard}>
                    <View style={styles.wordHeader}>
                      <Text style={styles.wordName}>{saved.dictionaryWord.word}</Text>
                      <Tag label={levelLabel(saved.dictionaryWord.level)} tone="soft" />
                    </View>
                    <Text style={styles.wordDefinition}>
                      {saved.dictionaryWord.definition}
                    </Text>
                    {saved.dictionaryWord.exampleSentence ? (
                      <Text style={styles.exampleText}>
                        {saved.dictionaryWord.exampleSentence}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                description="Saved words will appear here as soon as you bookmark them."
                title="No saved vocabulary yet"
              />
            )}
          </Card>

          <Card style={{ gap: 14 }}>
            <SectionTitle
              subtitle="Create a new dictionary entry and save it to your account in one step."
              title="Add a new word"
            />
            <TextField
              autoCapitalize="none"
              label="Word"
              onChangeText={setWord}
              placeholder="Articulate"
              value={word}
            />
            <TextField
              label="Definition"
              multiline
              onChangeText={setDefinition}
              placeholder="A short explanation that will help future learners."
              value={definition}
            />
            <TextField
              autoCapitalize="none"
              label="Part of speech"
              onChangeText={setPartOfSpeech}
              placeholder="verb, adjective..."
              value={partOfSpeech}
            />
            <TextField
              autoCapitalize="none"
              label="Phonetic"
              onChangeText={setPhonetic}
              placeholder="/ar-ti-cu-late/"
              value={phonetic}
            />
            <TextField
              label="Example sentence"
              multiline
              onChangeText={setExampleSentence}
              placeholder="Use the word in a sentence learners can copy."
              value={exampleSentence}
            />
            <View>
              <Text style={styles.levelTitle}>Word level</Text>
              <SegmentedControl
                onChange={(value) => setLevel(value as LearningLevel)}
                options={levelOptions}
                value={level}
              />
            </View>
            <AppButton
              label="Create live word"
              loading={isCreating}
              onPress={() => void createWord()}
            />
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 28,
  },
  exampleText: {
    backgroundColor: palette.white,
    borderRadius: 18,
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 21,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  levelTitle: {
    color: palette.ink,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  list: {
    gap: 12,
  },
  savedCard: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  wordCard: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  wordDefinition: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  wordHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  wordHeaderText: {
    flex: 1,
  },
  wordMeta: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  wordName: {
    color: palette.ink,
    fontFamily: fonts.display,
    fontSize: 21,
    fontWeight: "700",
  },
});
