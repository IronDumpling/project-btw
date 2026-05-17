import { useFocusEffect } from "expo-router";
import { History, ShieldAlert } from "lucide-react-native";
import { useCallback, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { mobileApi } from "@/api/client";
import type { MemoryPatch } from "@/api/types";
import { Card } from "@/components/Card";
import { IconBadge } from "@/components/DesignSystem";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RequireAuth } from "@/components/RequireAuth";
import { Screen } from "@/components/Screen";
import { useT } from "@/i18n/i18n";
import { useAppStore } from "@/state/useAppStore";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

export default function MemoryReviewScreen() {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useT();
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  const [patches, setPatches] = useState<MemoryPatch[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await mobileApi.listMemoryPatches("pending");
      setPatches(result.patches);
      setDrafts(Object.fromEntries(result.patches.map((patch) => [patch.id, patch.proposedAdditions.join("\n")])));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("commonError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  async function approve(patch: MemoryPatch) {
    setLoading(true);
    setError("");
    try {
      const edited = (drafts[patch.id] ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
      const result = await mobileApi.commitMemoryPatch({ ...patch, proposedAdditions: edited, status: "edited" });
      setCurrentUser(result.user);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("commonError"));
      setLoading(false);
    }
  }

  async function reject(patch: MemoryPatch) {
    setLoading(true);
    setError("");
    try {
      await mobileApi.updateMemoryPatch(patch.id, "rejected");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("commonError"));
      setLoading(false);
    }
  }

  return (
    <RequireAuth>
      <Screen kicker={t("analysisMemory")} title={t("memoryReviewTitle")} subtitle={t("memoryReviewBody")} trailing={<IconBadge icon={History} />}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading && !patches.length ? <Text style={styles.body}>{t("commonLoading")}</Text> : null}
        {!loading && patches.length === 0 ? (
          <Card>
            <Text style={styles.cardTitle}>{t("memoryReviewEmpty")}</Text>
          </Card>
        ) : null}
        {patches.map((patch) => (
          <Card key={patch.id}>
            <View style={styles.cardHeader}>
              <IconBadge icon={History} />
              <Text style={styles.cardTitle}>{t("analysisMemory")}</Text>
            </View>
            <TextInput
              multiline
              onChangeText={(value) => setDrafts((current) => ({ ...current, [patch.id]: value }))}
              placeholderTextColor={colors.muted}
              style={styles.textArea}
              value={drafts[patch.id] ?? ""}
            />
            {patch.evidence.length ? (
              <View style={styles.evidence}>
                <ShieldAlert color={colors.coral} size={18} />
                <View style={styles.infoBlock}>
                  <Text style={styles.label}>{t("memoryReviewEvidence")}</Text>
                  <Text style={styles.body}>{patch.evidence.join("\n")}</Text>
                </View>
              </View>
            ) : null}
            <View style={styles.actions}>
              <PrimaryButton disabled={loading} label={t("analysisReject")} variant="secondary" onPress={() => reject(patch)} />
              <PrimaryButton disabled={loading} label={loading ? t("commonLoading") : t("analysisApprove")} onPress={() => approve(patch)} />
            </View>
          </Card>
        ))}
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
  infoBlock: {
    flex: 1,
    gap: spacing.xs
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  textArea: {
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    minHeight: 120,
    padding: spacing.sm,
    textAlignVertical: "top"
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  evidence: {
    alignItems: "flex-start",
    backgroundColor: colors.coralSoft,
    borderRadius: 14,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20
  }
});
