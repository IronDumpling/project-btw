import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { syncBackendProfileFromSession } from "@/auth/session";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { AuthHeroVisual } from "@/components/visuals/BrandVisual";
import { useT } from "@/i18n/i18n";
import { authRedirectUrl, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAppStore } from "@/state/useAppStore";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

export default function LoginScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useT();
  const authReady = useAppStore((state) => state.authReady);
  const authToken = useAppStore((state) => state.authToken);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (authReady && authToken) {
    return <Redirect href="/" />;
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      if (!isSupabaseConfigured()) {
        throw new Error(t("errorSupabaseMissing"));
      }
      const normalizedEmail = email.trim().toLowerCase();
      if (mode === "register") {
        const { data, error: signupError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: authRedirectUrl
          }
        });
        if (signupError) {
          throw signupError;
        }
        if (!data.session || !data.user?.email_confirmed_at) {
          await supabase.auth.signOut();
          router.replace({ pathname: "/verify-email", params: { email: normalizedEmail } });
          return;
        }
        await syncBackendProfileFromSession(data.session);
      } else {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });
        if (loginError) {
          if (loginError.message.toLowerCase().includes("email not confirmed")) {
            router.replace({ pathname: "/verify-email", params: { email: normalizedEmail } });
            return;
          }
          throw loginError;
        }
        if (!data.session || !data.user.email_confirmed_at) {
          await supabase.auth.signOut();
          router.replace({ pathname: "/verify-email", params: { email: normalizedEmail } });
          return;
        }
        await syncBackendProfileFromSession(data.session);
      }
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorAuthFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <AuthHeroVisual />
        <Text style={styles.title}>{t("loginTitle")}</Text>
        <Text style={styles.body}>{t("loginBody")}</Text>
      </View>

      <Card>
        <View style={styles.modeRow}>
          <PrimaryButton
            label={t("loginLogin")}
            onPress={() => setMode("login")}
            variant={mode === "login" ? "primary" : "secondary"}
          />
          <PrimaryButton
            label={t("loginRegister")}
            onPress={() => setMode("register")}
            variant={mode === "register" ? "primary" : "secondary"}
          />
        </View>

        {mode === "register" ? (
          <View style={styles.field}>
            <Text style={styles.label}>{t("loginDisplayName")}</Text>
            <TextInput autoCapitalize="words" onChangeText={setDisplayName} placeholderTextColor={colors.muted} style={styles.input} value={displayName} />
          </View>
        ) : null}

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

        <View style={styles.field}>
          <Text style={styles.label}>{t("loginPassword")}</Text>
          <TextInput onChangeText={setPassword} placeholderTextColor={colors.muted} secureTextEntry style={styles.input} value={password} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          disabled={submitting || !email.trim() || password.length < 8}
          label={submitting ? t("commonLoading") : mode === "register" ? t("loginCreateAccount") : t("loginLogin")}
          onPress={submit}
        />
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
    fontSize: 34,
    fontWeight: "900"
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23
  },
  modeRow: {
    flexDirection: "row",
    gap: spacing.sm
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
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    minHeight: 44,
    padding: spacing.sm
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20
  }
});
