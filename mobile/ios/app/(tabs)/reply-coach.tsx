import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { mobileApi } from "@/api/client";
import type { ReplyStyle } from "@/api/types";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RequireAuth } from "@/components/RequireAuth";
import { Screen } from "@/components/Screen";
import { replyStyleOptions, useLocale, useT } from "@/i18n/i18n";
import { useAppStore } from "@/state/useAppStore";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

export default function ReplyCoachScreen() {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useT();
  const locale = useLocale();
  const analysis = useAppStore((state) => state.currentAnalysis);
  const drafts = useAppStore((state) => state.replyDrafts);
  const setReplyDrafts = useAppStore((state) => state.setReplyDrafts);
  const [selectedStyle, setSelectedStyle] = useState<ReplyStyle>("warm");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (!analysis) {
      setError(t("coachEmpty"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await mobileApi.generateReplies(selectedStyle);
      setReplyDrafts(result.drafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("commonError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireAuth>
      <Screen>
      <Text style={styles.title}>{t("coachTitle")}</Text>
      <Card>
        <Text style={styles.cardTitle}>{t("coachStyles")}</Text>
        <Text style={styles.body}>{analysis ? analysis.reasoningSummary : t("coachEmpty")}</Text>
        <View style={styles.grid}>
          {replyStyleOptions(locale).map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setSelectedStyle(item.value)}
              style={[styles.chip, selectedStyle === item.value && styles.chipSelected]}
            >
              <Text style={styles.chipText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton disabled={loading || !analysis} label={loading ? t("commonLoading") : t("coachGenerate")} onPress={generate} />
      </Card>
      {drafts.length ? (
        <Card>
          <Text style={styles.cardTitle}>{t("coachDrafts")}</Text>
          {drafts.map((draft) => (
            <View key={draft.id} style={styles.draft}>
              <Text style={styles.draftText}>{draft.text}</Text>
              <Text style={styles.body}>{draft.rationale}</Text>
            </View>
          ))}
        </Card>
      ) : null}
      </Screen>
    </RequireAuth>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "800"
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800"
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  chip: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  chipSelected: {
    borderColor: colors.accent
  },
  chipText: {
    color: colors.accent,
    fontWeight: "700"
  },
  draft: {
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm
  },
  draftText: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 23
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20
  }
});
