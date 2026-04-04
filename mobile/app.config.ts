import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "SpeakUp Mobile",
  slug: "speakup-mobile",
  scheme: "speakup",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/speakup-logo.png",
  assetBundlePatterns: ["**/*"],
  plugins: [
    "expo-audio",
    "expo-video",
    [
      "expo-splash-screen",
      {
        image: "./assets/speakup-logo.png",
        imageWidth: 220,
        resizeMode: "contain",
        backgroundColor: "#f7f1ea",
      },
    ],
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.speakup.mobile",
  },
  android: {
    package: "com.speakup.mobile",
    adaptiveIcon: {
      foregroundImage: "./assets/speakup-logo.png",
      backgroundColor: "#f7f1ea",
    },
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  },
};

export default config;
