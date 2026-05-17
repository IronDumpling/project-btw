import * as Clipboard from "expo-clipboard";
import { Copy, Edit3, MessageCircleHeart, RefreshCw, Sparkles } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { mobileApi } from "@/api/client";
import type { ReplyDraft, ReplyStyle } from "@/api/types";
import { Card } from "@/components/Card";
import { ChoicePill, IconBadge } from "@/components/DesignSystem";
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
  const [editedDrafts, setEditedDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function generate() {
    if (!analysis) {
      setError(t("coachEmpty"));
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const result = await mobileApi.generateReplies(selectedStyle);
      setReplyDrafts(result.drafts);
      setEditedDrafts(Object.fromEntries(result.drafts.map((draft) => [draft.id, draft.text])));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("commonError"));
    } finally {
      setLoading(false);
    }
  }

  async function copyDraft(draft: ReplyDraft) {
    await Clipboard.setStringAsync(editedDrafts[draft.id] ?? draft.text);
    setNotice(t("coachCopied"));
  }

  return (
    <RequireAuth>
      <Screen kicker={t("analysisDraft")} title={t("coachTitle")} trailing={<IconBadge icon={MessageCircleHeart} tone="lavender" />}>
      <Card>
        <View style={styles.cardHeader}>
          <IconBadge icon={Sparkles} tone="lavender" />
          <Text style={styles.cardTitle}>{t("coachStyles")}</Text>
        </View>
        <Text style={styles.body}>{analysis ? analysis.reasoningSummary : t("coachEmpty")}</Text>
        <View style={styles.grid}>
          {replyStyleOptions(locale).map((item) => (
            <ChoicePill
              key={item.value}
              label={item.label}
              onPress={() => setSelectedStyle(item.value)}
              selected={selectedStyle === item.value}
            />
          ))}
        </View>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton disabled={loading || !analysis} label={loading ? t("commonLoading") : t("coachGenerate")} onPress={generate} />
      </Card>
      {drafts.length ? (
        <Card>
          <Text style={styles.cardTitle}>{t("coachDrafts")}</Text>
          {drafts.map((draft) => (
            <View key={draft.id} style={styles.draft}>
              <TextInput
                multiline
                onChangeText={(value) => setEditedDrafts((current) => ({ ...current, [draft.id]: value }))}
                placeholderTextColor={colors.muted}
                style={styles.draftInput}
                value={editedDrafts[draft.id] ?? draft.text}
              />
              <Text style={styles.body}>{draft.rationale}</Text>
              <View style={styles.actions}>
                <Pressable style={styles.iconAction} onPress={() => copyDraft(draft)}>
                  <Copy color={colors.accent} size={18} />
                  <Text style={styles.iconActionText}>{t("coachCopy")}</Text>
                </Pressable>
                <Pressable style={styles.iconAction}>
                  <Edit3 color={colors.accent} size={18} />
                  <Text style={styles.iconActionText}>{t("coachEdit")}</Text>
                </Pressable>
                <Pressable disabled={loading} style={styles.iconAction} onPress={generate}>
                  <RefreshCw color={colors.accent} size={18} />
                  <Text style={styles.iconActionText}>{t("coachRegenerate")}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
      ) : null}
      </Screen>
    </RequireAuth>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
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
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  draft: {
    backgroundColor: colors.canvas,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  draftInput: {
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 23,
    minHeight: 92,
    padding: spacing.sm,
    textAlignVertical: "top"
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  iconAction: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  iconActionText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "900"
  },
  notice: {
    color: colors.accent,
    fontSize: 14,
    lineHeight: 20
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20
  }
});
