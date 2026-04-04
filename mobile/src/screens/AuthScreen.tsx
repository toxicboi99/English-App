import Constants from "expo-constants";
import { useEffect, useEffectEvent, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { api } from "../api";
import {
  AppButton,
  BackgroundGlow,
  Card,
  HeroCard,
  LogoMark,
  SegmentedControl,
  StatusNotice,
  Tag,
  TextField,
} from "../components";
import { fonts, palette } from "../theme";
import type { AuthResponse, LearningLevel, SessionUser } from "../types";

const levelOptions = [
  { label: "Beginner", value: "BEGINNER" },
  { label: "Intermediate", value: "INTERMEDIATE" },
  { label: "Advanced", value: "ADVANCED" },
  { label: "Fluent", value: "FLUENT" },
];

type AuthScreenProps = {
  onAuthenticated: (payload: AuthResponse) => Promise<void>;
};

function buildClerkMobileRedirectUrl() {
  const runtimeLinkingUri = Constants.linkingUri?.trim();

  if (!runtimeLinkingUri) {
    return "speakup:///auth/clerk?clerk_mobile=1";
  }

  return `${runtimeLinkingUri.replace(/\/$/, "")}/auth/clerk?clerk_mobile=1`;
}

function readClerkAuthPayload(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.searchParams.get("clerk_mobile") !== "1") {
      return null;
    }

    const token = parsed.searchParams.get("token");
    const serializedUser = parsed.searchParams.get("user");
    const error = parsed.searchParams.get("error");

    if (!token) {
      return {
        error: error ?? "Clerk login did not return a mobile session token.",
      };
    }

    const user = serializedUser
      ? (JSON.parse(serializedUser) as SessionUser)
      : null;

    return {
      token,
      user,
    };
  } catch {
    return null;
  }
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState<LearningLevel>("BEGINNER");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpeningClerk, setIsOpeningClerk] = useState(false);

  const handleClerkRedirect = useEffectEvent(async (url: string) => {
    const payload = readClerkAuthPayload(url);

    if (!payload) {
      return;
    }

    if ("error" in payload) {
      setError(payload.error ?? "Unable to finish Clerk login right now.");
      setIsOpeningClerk(false);
      return;
    }

    setError(null);
    setIsOpeningClerk(false);

    try {
      if (payload.user) {
        await onAuthenticated({
          token: payload.token,
          user: payload.user,
        });
        return;
      }

      const mePayload = await api.me(payload.token);
      await onAuthenticated({
        token: payload.token,
        user: mePayload.user,
      });
    } catch (callbackError) {
      setError(
        callbackError instanceof Error
          ? callbackError.message
          : "Unable to finish Clerk login right now.",
      );
    }
  });

  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleClerkRedirect(url);
    });

    void Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        void handleClerkRedirect(initialUrl);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  async function submit() {
    setError(null);
    setIsSubmitting(true);

    try {
      const payload =
        mode === "login"
          ? await api.login({
              email: email.trim(),
              password,
            })
          : await api.register({
              name: name.trim(),
              email: email.trim(),
              password,
              level,
            });

      await onAuthenticated(payload);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to sign in right now.",
      );
    } finally {
      setIsSubmitting(false);
      }
  }

  async function continueWithClerk() {
    setError(null);
    setIsOpeningClerk(true);

    try {
      const mobileRedirectUrl = buildClerkMobileRedirectUrl();
      const authUrl = api.clerkAuthUrl(mode, mobileRedirectUrl);
      await Linking.openURL(authUrl);
      setIsOpeningClerk(false);
    } catch (clerkError) {
      setError(
        clerkError instanceof Error
          ? clerkError.message
          : "Unable to open Clerk sign in right now.",
      );
      setIsOpeningClerk(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
    >
      <BackgroundGlow />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandWrap}>
          <LogoMark size={150} />
          <Text style={styles.brandName}>SpeakUp</Text>
          <Text style={styles.brandCopy}>
            Practice English from your phone with live data coming from your real
            SpeakUp backend.
          </Text>
          <Tag label={`Backend ${api.apiOrigin}`} tone="soft" />
        </View>

        <HeroCard
          description="No demo cards here. Once you sign in, every module reads from the same live API and PostgreSQL data as your web app."
          kicker="React Native"
          title="A mobile-first SpeakUp experience."
        />

        <Card style={styles.formCard}>
          <SegmentedControl
            onChange={(value) => {
              setMode(value as "login" | "register");
              setError(null);
            }}
            options={[
              { label: "Login", value: "login" },
              { label: "Register", value: "register" },
            ]}
            value={mode}
          />

          {error ? <StatusNotice message={error} tone="danger" /> : null}

          <View style={styles.clerkWrap}>
            <AppButton
              label={
                mode === "login"
                  ? "Continue with Clerk"
                  : "Create account with Clerk"
              }
              loading={isOpeningClerk}
              onPress={() => void continueWithClerk()}
              variant="soft"
            />
            <Text style={styles.clerkCopy}>
              Use the same secure Clerk flow as your web app. It opens in the
              browser, then comes back to mobile automatically.
            </Text>
          </View>

          {mode === "register" ? (
            <TextField
              autoCapitalize="words"
              label="Your name"
              onChangeText={setName}
              placeholder="SpeakUp learner"
              value={name}
            />
          ) : null}

          <TextField
            autoCapitalize="none"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="name@example.com"
            value={email}
          />

          <TextField
            autoCapitalize="none"
            label="Password"
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            value={password}
          />

          {mode === "register" ? (
            <View style={styles.levelWrap}>
              <Text style={styles.levelLabel}>Learning level</Text>
              <SegmentedControl
                onChange={(value) => setLevel(value as LearningLevel)}
                options={levelOptions}
                value={level}
              />
            </View>
          ) : null}

          <AppButton
            label={mode === "login" ? "Login to SpeakUp" : "Create live account"}
            loading={isSubmitting}
            onPress={() => void submit()}
          />

          <Text style={styles.switchCopy}>
            {mode === "login"
              ? "Need an account? Switch to register and it will create a real user record."
              : "Already have an account? Switch back to login and continue on mobile."}
          </Text>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brandCopy: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
    textAlign: "center",
  },
  brandName: {
    color: palette.ink,
    fontFamily: fonts.display,
    fontSize: 38,
    fontWeight: "700",
    marginTop: 10,
  },
  brandWrap: {
    alignItems: "center",
    gap: 8,
  },
  clerkCopy: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  clerkWrap: {
    gap: 10,
  },
  formCard: {
    gap: 16,
  },
  levelLabel: {
    color: palette.ink,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  levelWrap: {
    marginTop: -2,
  },
  root: {
    backgroundColor: palette.cream,
    flex: 1,
  },
  scrollContent: {
    gap: 18,
    paddingBottom: 36,
    paddingHorizontal: 18,
    paddingTop: 64,
  },
  switchCopy: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
});
