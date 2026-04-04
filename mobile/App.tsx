import { startTransition, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Feather } from "@expo/vector-icons";
import {
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";

import { api } from "./src/api";
import {
  AvatarBubble,
  BackgroundGlow,
  BottomTabBar,
  BootScreen,
} from "./src/components";
import { AuthScreen } from "./src/screens/AuthScreen";
import { CreateVideoScreen } from "./src/screens/CreateVideoScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { DictionaryScreen } from "./src/screens/DictionaryScreen";
import { FeedScreen } from "./src/screens/FeedScreen";
import { FriendsScreen } from "./src/screens/FriendsScreen";
import { PracticeSpeakingScreen } from "./src/screens/PracticeSpeakingScreen";
import { RoomsScreen } from "./src/screens/RoomsScreen";
import { fonts, palette } from "./src/theme";
import type { AppScreenKey, AuthResponse } from "./src/types";

void SplashScreen.preventAutoHideAsync().catch(() => null);

const sessionTokenKey = "speakup.mobile.session-token";

const menuItems = [
  {
    key: "dashboard" as const,
    icon: "home" as const,
    navLabel: "Home",
    label: "Dashboard",
    caption: "Progress, recent activity, and account status",
  },
  {
    key: "feed" as const,
    icon: "play-circle" as const,
    navLabel: "Feed",
    label: "Feed",
    caption: "Live posts, likes, and community comments",
  },
  {
    key: "practice" as const,
    icon: "mic" as const,
    navLabel: "Speak",
    label: "Practice Speaking",
    caption: "Score your speaking accuracy and improve with AI",
  },
  {
    key: "studio" as const,
    icon: "video" as const,
    navLabel: "Studio",
    label: "Create Video",
    caption: "Record, upload, and publish speaking videos",
  },
  {
    key: "friends" as const,
    icon: "users" as const,
    navLabel: "Friends",
    label: "Friends",
    caption: "Requests, suggestions, and accepted connections",
  },
  {
    key: "dictionary" as const,
    icon: "book-open" as const,
    navLabel: "Words",
    label: "Dictionary",
    caption: "Search and save real vocabulary entries",
  },
  {
    key: "rooms" as const,
    icon: "message-square" as const,
    navLabel: "Rooms",
    label: "Rooms",
    caption: "Create and manage debate room records",
  },
];

const screenMap = {
  dashboard: DashboardScreen,
  feed: FeedScreen,
  practice: PracticeSpeakingScreen,
  studio: CreateVideoScreen,
  friends: FriendsScreen,
  dictionary: DictionaryScreen,
  rooms: RoomsScreen,
} satisfies Record<
  AppScreenKey,
  (props: {
    token: string;
    user: AuthResponse["user"];
    onNavigate?: (screen: AppScreenKey) => void;
  }) => ReactElement
>;

export default function App() {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [activeScreen, setActiveScreen] = useState<AppScreenKey>("dashboard");

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const token = await SecureStore.getItemAsync(sessionTokenKey);

        if (!token) {
          return;
        }

        const payload = await api.me(token);

        if (!mounted) {
          return;
        }

        setSession({
          token,
          user: payload.user,
        });
      } catch {
        await SecureStore.deleteItemAsync(sessionTokenKey).catch(() => null);
      } finally {
        if (mounted) {
          setBooting(false);
          await SplashScreen.hideAsync().catch(() => null);
        }
      }
    }

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleAuthenticated(payload: AuthResponse) {
    await SecureStore.setItemAsync(sessionTokenKey, payload.token);
    setSession(payload);
    startTransition(() => {
      setActiveScreen("dashboard");
    });
  }

  async function handleSignOut() {
    const currentToken = session?.token;

    if (currentToken) {
      await api.logout(currentToken).catch(() => null);
    }

    await SecureStore.deleteItemAsync(sessionTokenKey).catch(() => null);
    setSession(null);
  }

  function selectScreen(screen: AppScreenKey) {
    startTransition(() => {
      setActiveScreen(screen);
    });
  }

  if (booting) {
    return <BootScreen message="Loading your mobile workspace..." />;
  }

  if (!session) {
    return (
      <>
        <StatusBar style="dark" />
        <AuthScreen onAuthenticated={handleAuthenticated} />
      </>
    );
  }

  const currentMenuItem = menuItems.find((item) => item.key === activeScreen) ?? menuItems[0];
  const ActiveScreen = screenMap[activeScreen];

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <BackgroundGlow />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{currentMenuItem.label}</Text>
            <Text style={styles.headerSubtitle}>{currentMenuItem.caption}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => void handleSignOut()}
              style={({ pressed }) => [
                styles.signOutButton,
                pressed && styles.signOutButtonPressed,
              ]}
            >
              <Feather color={palette.cobaltDeep} name="log-out" size={16} />
              <Text style={styles.signOutLabel}>Sign out</Text>
            </Pressable>
            <AvatarBubble
              image={session.user.profileImage}
              name={session.user.name}
              size={46}
            />
          </View>
        </View>

        <View style={styles.screenWrap}>
          <ActiveScreen
            onNavigate={selectScreen}
            token={session.token}
            user={session.user}
          />
        </View>

        <BottomTabBar
          activeKey={activeScreen}
          items={menuItems.map((item) => ({
            key: item.key,
            label: item.navLabel,
            icon: (
              <Feather
                color={
                  item.key === activeScreen ? palette.cobaltDeep : palette.inkSoft
                }
                name={item.icon}
                size={18}
              />
            ),
          }))}
          onSelect={selectScreen}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    paddingBottom: 14,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  headerCopy: {
    flex: 1,
  },
  headerSubtitle: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  headerTitle: {
    color: palette.ink,
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: "700",
  },
  root: {
    backgroundColor: palette.cream,
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 18 : 6,
  },
  screenWrap: {
    flex: 1,
  },
  signOutButton: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  signOutButtonPressed: {
    opacity: 0.88,
  },
  signOutLabel: {
    color: palette.cobaltDeep,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: "700",
  },
});
