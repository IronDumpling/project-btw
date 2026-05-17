import { useRouter } from "expo-router";
import { Database, Download, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Share, StyleSheet, Text, TextInput, View } from "react-native";
import { mobileApi } from "@/api/client";
import { clearSupabaseAndLocalSession } from "@/auth/session";
import { Card } from "@/components/Card";
import { IconBadge } from "@/components/DesignSystem";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RequireAuth } from "@/components/RequireAuth";
import { Screen } from "@/components/Screen";
import { useT } from "@/i18n/i18n";
import { clearImportConsent } from "@/privacy/consent";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

export default function PrivacyScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useT();
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function exportData() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await mobileApi.exportPrivacyData();
      await Share.share({ message: JSON.stringify(data, null, 2) });
      setMessage(t("privacyExportReady"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("commonError"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await mobileApi.deleteAccount();
      await clearImportConsent();
      await clearSupabaseAndLocalSession();
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("commonError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequireAuth>
      <Screen kicker={t("settingsPrivacy")} title={t("privacyTitle")} subtitle={t("privacySafetyBody")} trailing={<IconBadge icon={ShieldCheck} />}>
        <Card>
          <View style={styles.cardHeader}>
            <IconBadge icon={Database} tone="lavender" />
            <Text style={styles.cardTitle}>{t("privacyStoredTitle")}</Text>
          </View>
          <Text style={styles.body}>{t("privacyStoredBody")}</Text>
        </Card>
        <Card>
          <View style={styles.cardHeader}>
            <IconBadge icon={ShieldCheck} />
            <Text style={styles.cardTitle}>{t("privacyAiTitle")}</Text>
          </View>
          <Text style={styles.body}>{t("privacyAiBody")}</Text>
        </Card>
        <Card variant="soft">
          <View style={styles.cardHeader}>
            <IconBadge icon={ShieldAlert} tone="coral" />
            <Text style={styles.cardTitle}>{t("privacySafetyTitle")}</Text>
          </View>
          <Text style={styles.body}>{t("privacySafetyBody")}</Text>
        </Card>
        <Card>
          <View style={styles.cardHeader}>
            <IconBadge icon={Download} />
            <Text style={styles.cardTitle}>{t("privacyDataControls")}</Text>
          </View>
          <Text style={styles.body}>{t("privacyDeleteWarning")}</Text>
          {message ? <Text style={styles.success}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton disabled={busy} label={busy ? t("commonLoading") : t("privacyExport")} onPress={exportData} />
          <View style={styles.field}>
            <Text style={styles.label}>{t("privacyDeleteConfirm")}</Text>
            <TextInput
              autoCapitalize="characters"
              onChangeText={setDeleteConfirm}
              placeholder={t("privacyDeletePlaceholder")}
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={deleteConfirm}
            />
          </View>
          <View style={styles.deleteRow}>
            <Trash2 color={colors.danger} size={18} />
            <PrimaryButton disabled={busy || deleteConfirm !== "DELETE"} label={t("privacyDelete")} variant="danger" onPress={deleteAccount} />
          </View>
        </Card>
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
  field: {
    gap: spacing.xs
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700"
  },
  input: {
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    minHeight: 44,
    padding: spacing.sm
  },
  success: {
    color: colors.accent,
    fontSize: 14,
    lineHeight: 20
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20
  },
  deleteRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  }
});
