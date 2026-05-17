import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

type Props = {
  children: ReactNode;
  variant?: "default" | "soft" | "flat";
};

export function Card({ children, variant = "default" }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return <View style={[styles.card, variant === "soft" && styles.soft, variant === "flat" && styles.flat]}>{children}</View>;
}

const makeStyles = (theme: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: `${theme.surface}f2`,
    borderColor: theme.line,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
    shadowColor: theme.ink,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 26
  },
  soft: {
    backgroundColor: theme.accentSoft,
    shadowOpacity: 0.04
  },
  flat: {
    backgroundColor: theme.surface,
    shadowOpacity: 0
  }
});
