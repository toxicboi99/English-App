import { Platform } from "react-native";

export const palette = {
  ink: "#16304f",
  inkSoft: "#5a6b7d",
  cream: "#f7f1ea",
  surface: "#fffdfa",
  surfaceMuted: "#eef4fb",
  cobalt: "#0b84d8",
  cobaltDeep: "#0854a6",
  coral: "#ff6e3f",
  coralSoft: "#ffd8c8",
  mint: "#dff7ef",
  line: "#d9e3ef",
  success: "#1f8b5b",
  danger: "#c9473b",
  white: "#ffffff",
  shadow: "rgba(21, 46, 77, 0.12)",
  overlay: "rgba(10, 23, 38, 0.28)",
};

export const fonts = {
  display: Platform.select({
    ios: "AvenirNext-DemiBold",
    android: "sans-serif-condensed",
    default: "System",
  }),
  body: Platform.select({
    ios: "Avenir Next",
    android: "sans-serif-medium",
    default: "System",
  }),
  mono: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  }),
};
