import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { mobileApi } from "@/api/client";
import { Card } from "@/components/Card";
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
        localMemorySummary: result.memorySummary,
        syncStatus: "local"
      });
      clearPendingMemoryPatch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("commonError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth>
      <Screen>
      <Text style={styles.title}>{t("analysisTitle")}</Text>
      {!analysis ? (
        <Card>
          <Text style={styles.cardTitle}>{t("analysisEmpty")}</Text>
          <PrimaryButton label={t("homeImport")} onPress={() => router.push("/import")} />
        </Card>
      ) : (
        <>
          <Card>
            <Info label={t("analysisTone")} value={analysis.tone} styles={styles} />
            <Info label={t("analysisIntent")} value={analysis.intent} styles={styles} />
            <Info label={t("analysisSubtext")} value={analysis.subtext} styles={styles} />
            <Info label={t("analysisSignal")} value={analysis.relationshipSignal} styles={styles} />
            <Info label={t("analysisConfidence")} value={`${Math.round(analysis.confidence * 100)}%`} styles={styles} />
            {analysis.riskFlags.length ? <Info label={t("analysisRisk")} value={analysis.riskFlags.join(", ")} styles={styles} /> : null}
            <PrimaryButton label={t("analysisDraft")} onPress={() => router.push("/reply-coach")} />
          </Card>
          {memoryPatch ? (
            <Card>
              <Text style={styles.cardTitle}>{t("analysisMemory")}</Text>
              <TextInput
                multiline
                onChangeText={setEditedMemory}
                placeholderTextColor={colors.muted}
                style={styles.textArea}
                value={editedMemory}
              />
              {memoryPatch.evidence.length ? <Text style={styles.body}>{memoryPatch.evidence.join("\n")}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.actions}>
                <PrimaryButton label={t("analysisReject")} variant="secondary" onPress={clearPendingMemoryPatch} />
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
  infoBlock: {
    gap: spacing.xs
  },
  textArea: {
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    minHeight: 120,
    padding: spacing.sm,
    textAlignVertical: "top"
  },
  actions: {
    gap: spacing.sm
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20
  }
});
