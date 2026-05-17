import { useLocalSearchParams, useRouter } from "expo-router";
import { MailCheck } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { syncBackendProfileFromSession } from "@/auth/session";
import { Card } from "@/components/Card";
import { IconBadge } from "@/components/DesignSystem";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useT } from "@/i18n/i18n";
import { authRedirectUrl, supabase } from "@/lib/supabase";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useT();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function resend() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: authRedirectUrl }
      });
      if (resendError) {
        throw resendError;
      }
      setMessage(t("verifySent"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorResendVerification"));
    } finally {
      setBusy(false);
    }
  }

  async function continueIfVerified() {
    setBusy(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      await syncBackendProfileFromSession(data.session);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorVerificationIncomplete"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title={t("verifyTitle")} subtitle={t("verifyBody")} trailing={<IconBadge icon={MailCheck} />}>
      <Card>
        <View style={styles.field}>
          <Text style={styles.label}>{t("loginEmail")}</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={email}
          />
        </View>
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton disabled={busy || !email.trim()} label={t("verifyResend")} variant="secondary" onPress={resend} />
        <PrimaryButton disabled={busy} label={t("commonContinue")} onPress={continueIfVerified} />
      </Card>
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  hero: {
    gap: spacing.sm
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "900"
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23
  },
  field: {
    gap: spacing.xs
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
  }
});
