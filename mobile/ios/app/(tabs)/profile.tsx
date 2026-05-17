import { useRouter } from "expo-router";
import { LogOut, ShieldCheck, Sparkles, UserRound } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { mobileApi } from "@/api/client";
import { clearSupabaseAndLocalSession } from "@/auth/session";
import { Card } from "@/components/Card";
import { IconBadge } from "@/components/DesignSystem";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RequireAuth } from "@/components/RequireAuth";
import { Screen } from "@/components/Screen";
import { useT } from "@/i18n/i18n";
import { useAppStore } from "@/state/useAppStore";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useT();
  const user = useAppStore((state) => state.currentUser);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  const setOnboardingDraft = useAppStore((state) => state.setOnboardingDraft);
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveProfile() {
    setSaving(true);
    setError("");
    try {
      const updated = await mobileApi.updateProfile(displayName);
      setCurrentUser(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorUpdateProfile"));
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    try {
      await mobileApi.logout();
    } catch {
      // Local logout should still complete if the backend session is already gone.
    }
    await clearSupabaseAndLocalSession();
    router.replace("/login");
  }

  async function editPersona() {
    if (user?.onboarding) {
      setOnboardingDraft(user.onboarding as Parameters<typeof setOnboardingDraft>[0]);
    }
    router.push("/onboarding");
  }

  async function deletePersona() {
    setSaving(true);
    setError("");
    try {
      const result = await mobileApi.deletePersona();
      setCurrentUser(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorDeletePersona"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth>
      <Screen kicker={t("profileAccount")} title={t("profileTitle")} trailing={<IconBadge icon={UserRound} />}>
        <View style={styles.avatarHero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(displayName || user?.email || "B").slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={styles.avatarTitle}>{displayName || user?.email}</Text>
          <Text style={styles.verified}>{user?.email_verified ? t("profileVerified") : t("profileUnverified")}</Text>
        </View>

        <Card>
          <View style={styles.cardHeader}>
            <IconBadge icon={ShieldCheck} />
            <Text style={styles.cardTitle}>{t("profileAccount")}</Text>
          </View>
          <Text style={styles.body}>{user?.email}</Text>
          <View style={styles.field}>
            <Text style={styles.label}>{t("profileDisplayName")}</Text>
            <TextInput onChangeText={setDisplayName} placeholderTextColor={colors.muted} style={styles.input} value={displayName} />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton disabled={saving} label={saving ? t("commonLoading") : t("commonSave")} onPress={saveProfile} />
        </Card>

        {user?.persona_markdown ? (
          <Card>
            <View style={styles.cardHeader}>
              <IconBadge icon={Sparkles} tone="lavender" />
              <Text style={styles.cardTitle}>{t("profilePersona")}</Text>
            </View>
            <Text style={styles.markdown}>{user.persona_markdown}</Text>
            {user.memory_markdown ? (
              <>
                <Text style={styles.cardTitle}>{t("profileMemory")}</Text>
                <Text style={styles.markdown}>{user.memory_markdown}</Text>
              </>
            ) : null}
            <View style={styles.actions}>
              <PrimaryButton label={t("profileDelete")} variant="secondary" disabled={saving} onPress={deletePersona} />
              <PrimaryButton label={t("profileEdit")} onPress={editPersona} />
            </View>
          </Card>
        ) : (
          <Card>
            <Text style={styles.cardTitle}>{t("profileNoPersona")}</Text>
            <Text style={styles.body}>{t("profileNoPersonaBody")}</Text>
            <PrimaryButton label={t("profileSetup")} onPress={() => router.push("/onboarding")} />
          </Card>
        )}

        <Card>
          <Text style={styles.cardTitle}>{t("settingsPrivacy")}</Text>
          <Text style={styles.body}>{t("profilePrivacyBody")}</Text>
          <PrimaryButton label={t("privacyTitle")} variant="secondary" onPress={() => router.push("/privacy")} />
          <PrimaryButton label={t("settingsTitle")} variant="secondary" onPress={() => router.push("/settings")} />
          <View style={styles.logoutRow}>
            <LogOut color={colors.danger} size={18} />
            <PrimaryButton label={t("profileLogout")} variant="danger" onPress={logout} />
          </View>
        </Card>
      </Screen>
    </RequireAuth>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  avatarHero: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    height: 124,
    justifyContent: "center",
    width: 124
  },
  avatarText: {
    color: colors.accent,
    fontSize: 44,
    fontWeight: "900"
  },
  avatarTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900"
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
  verified: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800"
  },
  field: {
    gap: spacing.xs
  },
  actions: {
    gap: spacing.sm
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
  markdown: {
    backgroundColor: colors.canvas,
    borderRadius: 16,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    padding: spacing.sm
  },
  logoutRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20
  }
});
