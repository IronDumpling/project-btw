import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

export function Card({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return <View style={styles.card}>{children}</View>;
}

const makeStyles = (theme: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderColor: theme.line,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    padding: spacing.md
  }
});
