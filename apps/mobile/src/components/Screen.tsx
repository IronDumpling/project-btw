import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

type Props = {
  children: ReactNode;
  kicker?: string;
  title?: string;
  subtitle?: string;
  trailing?: ReactNode;
};

export function Screen({ children, kicker, title, subtitle, trailing }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          {title || kicker || subtitle || trailing ? (
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
                {title ? <Text style={styles.title}>{title}</Text> : null}
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
            </View>
          ) : null}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.canvas
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl + spacing.md
  },
  inner: {
    gap: spacing.md
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs
  },
  kicker: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    color: theme.ink,
    fontSize: 29,
    fontWeight: "900",
    lineHeight: 35
  },
  subtitle: {
    color: theme.muted,
    fontSize: 15,
    lineHeight: 22
  },
  trailing: {
    flexShrink: 0
  }
});
