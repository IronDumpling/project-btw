import { LinearGradient } from "expo-linear-gradient";
import type { LucideIcon } from "lucide-react-native";
import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

type IconBadgeProps = {
  icon: LucideIcon;
  tone?: "accent" | "coral" | "lavender";
  size?: number;
};

export function IconBadge({ icon: Icon, tone = "accent", size = 20 }: IconBadgeProps) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const color = tone === "coral" ? colors.coral : tone === "lavender" ? colors.lavender : colors.accent;
  return (
    <View style={[styles.iconBadge, tone === "coral" && styles.coralBadge, tone === "lavender" && styles.lavenderBadge]}>
      <Icon color={color} size={size} strokeWidth={2.4} />
    </View>
  );
}

type GradientHeroProps = {
  kicker: string;
  title: string;
  body: string;
  children?: ReactNode;
};

export function GradientHero({ kicker, title, body, children }: GradientHeroProps) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  return (
    <LinearGradient colors={[colors.accent, colors.lavender]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <Text style={styles.heroKicker}>{kicker}</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroBody}>{body}</Text>
      {children}
    </LinearGradient>
  );
}

type MeterProps = {
  label: string;
  value: number;
  tone?: "accent" | "coral" | "lavender";
};

export function InfoMeter({ label, value, tone = "accent" }: MeterProps) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const width = `${Math.max(0, Math.min(100, Math.round(value * 100)))}%` as const;
  const fillColor = tone === "coral" ? colors.coral : tone === "lavender" ? colors.lavender : colors.accent;
  return (
    <View style={styles.meterBlock}>
      <View style={styles.meterHeader}>
        <Text style={styles.meterLabel}>{label}</Text>
        <Text style={styles.meterValue}>{Math.round(value * 100)}%</Text>
      </View>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { backgroundColor: fillColor, width }]} />
      </View>
    </View>
  );
}

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function ChoicePill({ label, selected = false, onPress }: ChipProps) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.pill, selected && styles.pillSelected]}>
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
    </Pressable>
  );
}

type FadeInProps = {
  children: ReactNode;
  delay?: number;
};

export function FadeIn({ children, delay = 0 }: FadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = opacity.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 420, delay, useNativeDriver: true }).start();
  }, [delay, opacity]);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  iconBadge: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: 15,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  coralBadge: {
    backgroundColor: colors.coralSoft
  },
  lavenderBadge: {
    backgroundColor: colors.lavenderSoft
  },
  hero: {
    borderRadius: 24,
    gap: spacing.xs,
    overflow: "hidden",
    padding: spacing.lg,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.13,
    shadowRadius: 28
  },
  heroKicker: {
    color: colors.buttonText,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    opacity: 0.92,
    textTransform: "uppercase"
  },
  heroTitle: {
    color: colors.buttonText,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32
  },
  heroBody: {
    color: colors.buttonText,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.94
  },
  meterBlock: {
    gap: spacing.xs
  },
  meterHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  meterLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800"
  },
  meterValue: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  meterTrack: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    height: 9,
    overflow: "hidden"
  },
  meterFill: {
    borderRadius: 999,
    height: "100%"
  },
  pill: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  pillSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  pillText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  pillTextSelected: {
    color: colors.buttonText
  }
});
