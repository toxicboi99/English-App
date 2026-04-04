import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import type { AppScreenKey, SessionUser } from "./types";
import { fonts, palette } from "./theme";
import { initials } from "./utils";

const logoSource = require("../assets/speakup-logo.png");

type DrawerMenuItem = {
  key: AppScreenKey;
  label: string;
  caption: string;
};

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "soft" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

type StatusNoticeProps = {
  tone?: "info" | "success" | "danger";
  message: string;
};

type HeroCardProps = {
  kicker: string;
  title: string;
  description: string;
};

type SegmentedControlProps = {
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
};

type DrawerMenuProps = {
  open: boolean;
  user: SessionUser;
  activeKey: AppScreenKey;
  items: DrawerMenuItem[];
  onSelect: (key: AppScreenKey) => void;
  onClose: () => void;
  onSignOut: () => void;
  apiOrigin: string;
};

type BottomTabBarProps = {
  activeKey: AppScreenKey;
  items: Array<{
    key: AppScreenKey;
    label: string;
    icon: ReactNode;
  }>;
  onSelect: (key: AppScreenKey) => void;
};

type AvatarBubbleProps = {
  name: string;
  image?: string | null;
  size?: number;
};

type FieldProps = TextInputProps & {
  label: string;
  helper?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function BackgroundGlow() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.glowOrb, styles.glowLeft]} />
      <View style={[styles.glowOrb, styles.glowRight]} />
      <View style={[styles.glowOrb, styles.glowBottom]} />
    </View>
  );
}

export function LogoMark({ size = 148 }: { size?: number }) {
  return (
    <Image
      resizeMode="contain"
      source={logoSource}
      style={{ height: size, width: size }}
    />
  );
}

export function BootScreen({ message }: { message: string }) {
  return (
    <View style={styles.bootRoot}>
      <BackgroundGlow />
      <LinearGradient
        colors={[palette.ink, palette.cobalt, palette.coral]}
        end={{ x: 1, y: 0.1 }}
        start={{ x: 0, y: 1 }}
        style={styles.bootCard}
      >
        <LogoMark size={168} />
        <Text style={styles.bootTitle}>SpeakUp</Text>
        <Text style={styles.bootMessage}>{message}</Text>
        <ActivityIndicator color={palette.white} size="large" />
      </LinearGradient>
    </View>
  );
}

export function MenuButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuButton,
        pressed && styles.buttonPressed,
      ]}
    >
      <View style={styles.menuBar} />
      <View style={[styles.menuBar, styles.menuBarShort]} />
      <View style={styles.menuBar} />
    </Pressable>
  );
}

export function DrawerMenu({
  open,
  user,
  activeKey,
  items,
  onSelect,
  onClose,
  onSignOut,
  apiOrigin,
}: DrawerMenuProps) {
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 220,
      mass: 0.9,
    }).start();
  }, [open, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-320, 0],
  });

  return (
    <View
      pointerEvents={open ? "auto" : "none"}
      style={StyleSheet.absoluteFill}
    >
      <Animated.View style={[styles.drawerOverlay, { opacity: progress }]}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View
        style={[styles.drawerPanel, { transform: [{ translateX }] }]}
      >
        <LinearGradient
          colors={[palette.ink, palette.cobalt, palette.coral]}
          end={{ x: 1, y: 0 }}
          start={{ x: 0, y: 1 }}
          style={styles.drawerHeader}
        >
          <LogoMark size={104} />
          <Text style={styles.drawerTitle}>SpeakUp Mobile</Text>
          <Text style={styles.drawerSubtitle}>
            Live database-backed learning, designed for handheld practice.
          </Text>
        </LinearGradient>

        <View style={styles.drawerUserRow}>
          <AvatarBubble image={user.profileImage} name={user.name} size={58} />
          <View style={styles.drawerUserMeta}>
            <Text style={styles.drawerUserName}>{user.name}</Text>
            <Text style={styles.drawerUserEmail}>{user.email}</Text>
            <Tag label={user.level} tone="soft" />
          </View>
        </View>

        <View style={styles.drawerItems}>
          {items.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              style={({ pressed }) => [
                styles.drawerItem,
                activeKey === item.key && styles.drawerItemActive,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.drawerItemLabel,
                  activeKey === item.key && styles.drawerItemLabelActive,
                ]}
              >
                {item.label}
              </Text>
              <Text style={styles.drawerItemCaption}>{item.caption}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.drawerFooter}>
          <Text style={styles.drawerFootnote}>Connected to {apiOrigin}</Text>
          <AppButton
            label="Sign out"
            onPress={onSignOut}
            style={{ marginTop: 16 }}
            variant="soft"
          />
        </View>
      </Animated.View>
    </View>
  );
}

export function BottomTabBar({
  activeKey,
  items,
  onSelect,
}: BottomTabBarProps) {
  return (
    <View style={styles.bottomTabShell}>
      <ScrollView
        contentContainerStyle={styles.bottomTabContent}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {items.map((item) => {
          const active = item.key === activeKey;

          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              style={({ pressed }) => [
                styles.bottomTabItem,
                active && styles.bottomTabItemActive,
                pressed && styles.buttonPressed,
              ]}
            >
              <View
                style={[
                  styles.bottomTabIconWrap,
                  active && styles.bottomTabIconWrapActive,
                ]}
              >
                {item.icon}
              </View>
              <Text
                style={[
                  styles.bottomTabLabel,
                  active && styles.bottomTabLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function HeroCard({ kicker, title, description }: HeroCardProps) {
  return (
    <LinearGradient
      colors={[palette.ink, palette.cobalt, palette.coral]}
      end={{ x: 1, y: 0 }}
      start={{ x: 0, y: 1 }}
      style={styles.heroCard}
    >
      <Text style={styles.heroKicker}>{kicker}</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroDescription}>{description}</Text>
    </LinearGradient>
  );
}

export function AppButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: ButtonProps) {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonBase,
        variant === "primary" && styles.buttonPrimary,
        variant === "soft" && styles.buttonSoft,
        variant === "ghost" && styles.buttonGhost,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.buttonPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "ghost" ? palette.cobaltDeep : palette.white}
        />
      ) : null}
      <Text
        style={[
          styles.buttonLabel,
          variant === "soft" && styles.buttonLabelSoft,
          variant === "ghost" && styles.buttonLabelGhost,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function TextField({ label, helper, containerStyle, ...props }: FieldProps) {
  return (
    <View style={containerStyle}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor="#7a8ba0"
        style={[styles.input, props.multiline && styles.textarea]}
        {...props}
      />
      {helper ? <Text style={styles.fieldHelper}>{helper}</Text> : null}
    </View>
  );
}

export function SegmentedControl({
  value,
  options,
  onChange,
}: SegmentedControlProps) {
  return (
    <View style={styles.segmentedRoot}>
      {options.map((option) => {
        const active = value === option.value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segmentedOption,
              active && styles.segmentedOptionActive,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text
              style={[
                styles.segmentedLabel,
                active && styles.segmentedLabelActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StatusNotice({
  tone = "info",
  message,
}: StatusNoticeProps) {
  return (
    <View
      style={[
        styles.notice,
        tone === "success" && styles.noticeSuccess,
        tone === "danger" && styles.noticeDanger,
      ]}
    >
      <Text
        style={[
          styles.noticeText,
          tone === "success" && styles.noticeTextSuccess,
          tone === "danger" && styles.noticeTextDanger,
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <Card style={styles.centeredState}>
      <ActivityIndicator color={palette.cobalt} size="large" />
      <Text style={styles.stateText}>{label}</Text>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card style={styles.centeredState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </Card>
  );
}

export function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "blue" | "coral" | "mint" | "ink";
}) {
  return (
    <Card
      style={[
        styles.statTile,
        accent === "blue" && styles.statTileBlue,
        accent === "coral" && styles.statTileCoral,
        accent === "mint" && styles.statTileMint,
        accent === "ink" && styles.statTileInk,
      ]}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

export function Tag({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "soft" | "success";
}) {
  return (
    <View
      style={[
        styles.tag,
        tone === "soft" && styles.tagSoft,
        tone === "success" && styles.tagSuccess,
      ]}
    >
      <Text
        style={[
          styles.tagLabel,
          tone === "soft" && styles.tagLabelSoft,
          tone === "success" && styles.tagLabelSuccess,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function AvatarBubble({
  name,
  image,
  size = 46,
}: AvatarBubbleProps) {
  if (image) {
    return (
      <Image
        source={{ uri: image }}
        style={{
          backgroundColor: palette.coralSoft,
          borderRadius: size / 2,
          height: size,
          width: size,
        }}
      />
    );
  }

  return (
    <LinearGradient
      colors={[palette.cobalt, palette.coral]}
      style={[
        styles.avatarFallback,
        { borderRadius: size / 2, height: size, width: size },
      ]}
    >
      <Text style={styles.avatarFallbackText}>{initials(name)}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: palette.white,
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  bottomTabContent: {
    gap: 10,
    paddingHorizontal: 6,
  },
  bottomTabIconWrap: {
    alignItems: "center",
    borderRadius: 14,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  bottomTabIconWrapActive: {
    backgroundColor: "#edf5ff",
  },
  bottomTabItem: {
    alignItems: "center",
    gap: 6,
    minWidth: 72,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  bottomTabItemActive: {
    backgroundColor: palette.white,
    borderRadius: 20,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
  },
  bottomTabLabel: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: "700",
  },
  bottomTabLabelActive: {
    color: palette.cobaltDeep,
  },
  bottomTabShell: {
    backgroundColor: "rgba(255, 253, 250, 0.96)",
    borderColor: palette.line,
    borderRadius: 26,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
  },
  bootCard: {
    alignItems: "center",
    borderRadius: 36,
    gap: 18,
    marginHorizontal: 24,
    paddingHorizontal: 24,
    paddingVertical: 34,
  },
  bootMessage: {
    color: "rgba(255,255,255,0.86)",
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  bootRoot: {
    alignItems: "center",
    backgroundColor: palette.cream,
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  bootTitle: {
    color: palette.white,
    fontFamily: fonts.display,
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  buttonBase: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonGhost: {
    backgroundColor: palette.white,
    borderColor: palette.line,
    borderWidth: 1,
  },
  buttonLabel: {
    color: palette.white,
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: "700",
  },
  buttonLabelGhost: {
    color: palette.cobaltDeep,
  },
  buttonLabelSoft: {
    color: palette.cobaltDeep,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  buttonPrimary: {
    backgroundColor: palette.cobaltDeep,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  buttonSoft: {
    backgroundColor: palette.coralSoft,
  },
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
  },
  centeredState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 30,
  },
  drawerFooter: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
    marginTop: "auto",
    paddingTop: 22,
  },
  drawerFootnote: {
    color: palette.inkSoft,
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
  },
  drawerHeader: {
    borderRadius: 28,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  drawerItem: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  drawerItemActive: {
    backgroundColor: palette.coralSoft,
  },
  drawerItemCaption: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  drawerItemLabel: {
    color: palette.ink,
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: "700",
  },
  drawerItemLabelActive: {
    color: palette.cobaltDeep,
  },
  drawerItems: {
    gap: 12,
    marginTop: 22,
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.overlay,
  },
  drawerPanel: {
    backgroundColor: palette.surface,
    borderBottomRightRadius: 32,
    borderTopRightRadius: 32,
    bottom: 0,
    left: 0,
    paddingHorizontal: 18,
    paddingVertical: 20,
    position: "absolute",
    top: 0,
    width: "84%",
  },
  drawerSubtitle: {
    color: "rgba(255,255,255,0.82)",
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  drawerTitle: {
    color: palette.white,
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: "700",
    marginTop: 12,
  },
  drawerUserEmail: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  drawerUserMeta: {
    flex: 1,
    gap: 6,
  },
  drawerUserName: {
    color: palette.ink,
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: "700",
  },
  drawerUserRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  emptyDescription: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  emptyTitle: {
    color: palette.ink,
    fontFamily: fonts.display,
    fontSize: 21,
    fontWeight: "700",
    textAlign: "center",
  },
  fieldHelper: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
  fieldLabel: {
    color: palette.ink,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  glowBottom: {
    backgroundColor: "rgba(255, 110, 63, 0.10)",
    bottom: -44,
    right: 32,
  },
  glowLeft: {
    backgroundColor: "rgba(11, 132, 216, 0.12)",
    left: -40,
    top: -50,
  },
  glowOrb: {
    borderRadius: 999,
    height: 220,
    position: "absolute",
    width: 220,
  },
  glowRight: {
    backgroundColor: "rgba(255, 194, 172, 0.32)",
    height: 180,
    right: -20,
    top: 140,
    width: 180,
  },
  heroCard: {
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  heroDescription: {
    color: "rgba(255,255,255,0.84)",
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
  },
  heroKicker: {
    color: "#ffd7c6",
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: palette.white,
    fontFamily: fonts.display,
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 38,
    marginTop: 10,
  },
  input: {
    backgroundColor: palette.white,
    borderColor: palette.line,
    borderRadius: 20,
    borderWidth: 1,
    color: palette.ink,
    fontFamily: fonts.body,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuBar: {
    backgroundColor: palette.ink,
    borderRadius: 999,
    height: 3,
    width: 22,
  },
  menuBarShort: {
    width: 16,
  },
  menuButton: {
    alignItems: "flex-start",
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14,
    width: 52,
  },
  notice: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.line,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  noticeDanger: {
    backgroundColor: "#ffe7e3",
    borderColor: "#f7b1a8",
  },
  noticeSuccess: {
    backgroundColor: palette.mint,
    borderColor: "#acd8c5",
  },
  noticeText: {
    color: palette.cobaltDeep,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  noticeTextDanger: {
    color: palette.danger,
  },
  noticeTextSuccess: {
    color: palette.success,
  },
  sectionSubtitle: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  sectionTitle: {
    color: palette.ink,
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: "700",
  },
  sectionTitleWrap: {
    marginBottom: 6,
  },
  segmentedLabel: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: "700",
  },
  segmentedLabelActive: {
    color: palette.cobaltDeep,
  },
  segmentedOption: {
    alignItems: "center",
    borderRadius: 16,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  segmentedOptionActive: {
    backgroundColor: palette.white,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  segmentedRoot: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.line,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 6,
  },
  stateText: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  statLabel: {
    color: palette.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  statTile: {
    minHeight: 116,
  },
  statTileBlue: {
    backgroundColor: "#edf7ff",
  },
  statTileCoral: {
    backgroundColor: "#fff1ea",
  },
  statTileInk: {
    backgroundColor: "#eef0f6",
  },
  statTileMint: {
    backgroundColor: palette.mint,
  },
  statValue: {
    color: palette.ink,
    fontFamily: fonts.display,
    fontSize: 30,
    fontWeight: "700",
  },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: palette.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tagLabel: {
    color: palette.ink,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  tagLabelSoft: {
    color: palette.cobaltDeep,
  },
  tagLabelSuccess: {
    color: palette.success,
  },
  tagSoft: {
    backgroundColor: "#edf5ff",
  },
  tagSuccess: {
    backgroundColor: palette.mint,
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
});
