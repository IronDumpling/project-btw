import { useRouter } from "expo-router";
import { Brain, MessageCircle, Save, ShieldAlert } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { mobileApi } from "@/api/client";
import { Card } from "@/components/Card";
import { IconBadge, InfoMeter } from "@/components/DesignSystem";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RequireAuth } from "@/components/RequireAuth";
import { Screen } from "@/components/Screen";
import { useT } from "@/i18n/i18n";
import { useAppStore } from "@/state/useAppStore";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

export default function AnalysisScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useT();
  const analysis = useAppStore((state) => state.currentAnalysis);
  const memoryPatch = useAppStore((state) => state.pendingMemoryPatch);
  const clearPendingMemoryPatch = useAppStore((state) => state.clearPendingMemoryPatch);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  const addContact = useAppStore((state) => state.addContact);
  const [editedMemory, setEditedMemory] = useState((memoryPatch?.proposedAdditions ?? []).join("\n"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function approveMemory() {
    if (!memoryPatch) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const patch = {
        ...memoryPatch,
        proposedAdditions: editedMemory.split("\n").map((item) => item.trim()).filter(Boolean),
        status: "edited" as const
      };
      const result = await mobileApi.commitMemoryPatch(patch);
      setCurrentUser(result.user);
      addContact({
        id: patch.contactId,
        displayName: patch.contactId === "default" ? t("relationshipDefaultName") : patch.contactId,
        aliases: [],
        relationshipType: "",
        notes: "",
        localMemorySummary: result.memorySummary,
        lastAnalysisAt: "",
        syncStatus: "local"
      });
      clearPendingMemoryPatch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("commonError"));
    } finally {
      setSaving(false);
    }
  }

  async function rejectMemory() {
    if (memoryPatch?.id) {
      try {
        await mobileApi.updateMemoryPatch(memoryPatch.id, "rejected");
      } catch {
        // Local dismissal should still work if the patch was not persisted.
      }
    }
    clearPendingMemoryPatch();
  }

  return (
    <RequireAuth>
      <Screen kicker={t("analysisSignal")} title={t("analysisTitle")} trailing={<IconBadge icon={Brain} tone="lavender" />}>
      {!analysis ? (
        <Card>
          <Text style={styles.cardTitle}>{t("analysisEmpty")}</Text>
          <PrimaryButton label={t("homeImport")} onPress={() => router.push("/import")} />
        </Card>
      ) : (
        <>
          <Card>
            <View style={styles.cardHeader}>
              <IconBadge icon={MessageCircle} />
              <View style={styles.headerCopy}>
                <Text style={styles.cardTitle}>{t("analysisTone")}</Text>
                <Text style={styles.body}>{analysis.tone || "—"}</Text>
              </View>
            </View>
            <Info label={t("analysisIntent")} value={analysis.intent} styles={styles} />
            <Info label={t("analysisSubtext")} value={analysis.subtext} styles={styles} />
            <Info label={t("analysisSignal")} value={analysis.relationshipSignal} styles={styles} />
            <InfoMeter label={t("analysisConfidence")} value={analysis.confidence} />
            <InfoMeter label={t("analysisIntent")} value={0.72} tone="lavender" />
            <InfoMeter label={t("analysisRisk")} value={analysis.riskFlags.length ? 0.42 : 0.12} tone="coral" />
            {analysis.riskFlags.length ? <Info label={t("analysisRisk")} value={analysis.riskFlags.join(", ")} styles={styles} /> : null}
            <PrimaryButton label={t("analysisDraft")} onPress={() => router.push("/reply-coach")} />
          </Card>
          {memoryPatch ? (
            <Card>
              <View style={styles.cardHeader}>
                <IconBadge icon={Save} tone="accent" />
                <Text style={styles.cardTitle}>{t("analysisMemory")}</Text>
              </View>
              <TextInput
                multiline
                onChangeText={setEditedMemory}
                placeholderTextColor={colors.muted}
                style={styles.textArea}
                value={editedMemory}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {memoryPatch.evidence.length ? (
                <View style={styles.evidence}>
                  <ShieldAlert color={colors.coral} size={18} />
                  <Text style={styles.evidenceText}>{memoryPatch.evidence.join("\n")}</Text>
                </View>
              ) : null}
              <View style={styles.actions}>
                <PrimaryButton label={t("analysisReject")} variant="secondary" onPress={rejectMemory} />
                <PrimaryButton disabled={saving} label={saving ? t("commonLoading") : t("analysisApprove")} onPress={approveMemory} />
              </View>
            </Card>
          ) : null}
        </>
      )}
      </Screen>
    </RequireAuth>
  );
}

function Info({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.infoBlock}>
      <Text style={styles.cardTitle}>{label}</Text>
      <Text style={styles.body}>{value || "—"}</Text>
    </View>
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
    gap: spacing.xs
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs
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
  evidence: {
    alignItems: "flex-start",
    backgroundColor: colors.coralSoft,
    borderRadius: 14,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm
  },
  evidenceText: {
    color: colors.danger,
    flex: 1,
    fontSize: 13,
    lineHeight: 18
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20
  }
});
