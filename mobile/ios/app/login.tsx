import { Redirect, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { syncBackendProfileFromSession } from "@/auth/session";
import { Screen } from "@/components/Screen";
import { LoginHeroScene } from "@/components/visuals/LoginHeroScene";
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
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const heroEntrance = useRef(new Animated.Value(0)).current;
  const formEntrance = useRef(new Animated.Value(0)).current;
  const heroPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(90, [
      Animated.timing(heroEntrance, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(formEntrance, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(heroPulse, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(heroPulse, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        })
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [formEntrance, heroEntrance, heroPulse]);

  if (authReady && authToken) {
    return <Redirect href="/" />;
  }

  async function submit() {
    if (mode === "register" && !acceptedLegal) {
      setError(t("loginLegalRequired"));
      return;
    }
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
      <Animated.View
        style={[
          styles.hero,
          {
            opacity: heroEntrance,
            transform: [
              {
                translateY: heroEntrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0]
                })
              }
            ]
          }
        ]}
      >
        <Animated.View
          style={{
            transform: [
              {
                translateY: heroPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -3]
                })
              },
              {
                scale: heroPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.012]
                })
              }
            ]
          }}
        >
          <LoginHeroScene />
        </Animated.View>
        <Text style={styles.title}>{t("loginTitle")}</Text>
        <Text style={styles.body}>{t("loginBody")}</Text>
      </Animated.View>

      <Animated.View
        style={{
          opacity: formEntrance,
          transform: [
            {
              translateY: formEntrance.interpolate({
                inputRange: [0, 1],
                outputRange: [22, 0]
              })
            }
          ]
        }}
      >
        <View style={styles.panel}>
          <View style={styles.panelGlow} />
          <View style={styles.segmented}>
            <Pressable accessibilityRole="button" onPress={() => setMode("login")} style={[styles.segment, mode === "login" && styles.segmentActive]}>
              <Text style={[styles.segmentText, mode === "login" && styles.segmentTextActive]}>{t("loginLogin")}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setMode("register")} style={[styles.segment, mode === "register" && styles.segmentActive]}>
              <Text style={[styles.segmentText, mode === "register" && styles.segmentTextActive]}>{t("loginRegister")}</Text>
            </Pressable>
          </View>
          <View style={styles.legalLinks}>
            <Text style={styles.legalText}>{t("loginLegalPrefix")}</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push("/terms")}>
              <Text style={styles.legalLink}>{t("termsTitle")}</Text>
            </Pressable>
            <Text style={styles.legalText}>{t("loginLegalAnd")}</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push("/privacy-policy")}>
              <Text style={styles.legalLink}>{t("privacyPolicyTitle")}</Text>
            </Pressable>
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

          {mode === "register" ? (
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acceptedLegal }} onPress={() => setAcceptedLegal((value) => !value)} style={styles.legalConsent}>
              <View style={[styles.checkbox, acceptedLegal && styles.checkboxChecked]}>
                {acceptedLegal ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.legalConsentText}>{t("loginLegalConsent")}</Text>
            </Pressable>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={submitting || !email.trim() || password.length < 8 || (mode === "register" && !acceptedLegal)}
            onPress={submit}
            style={[styles.submitButton, (submitting || !email.trim() || password.length < 8 || (mode === "register" && !acceptedLegal)) && styles.submitDisabled]}
          >
            <Text style={styles.submitText}>{submitting ? t("commonLoading") : mode === "register" ? t("loginCreateAccount") : t("loginLogin")}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  hero: {
    gap: spacing.xs,
    paddingTop: spacing.xs
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 39,
    textAlign: "center"
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center"
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.lg,
    overflow: "hidden",
    padding: spacing.lg,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.1,
    shadowRadius: 32
  },
  panelGlow: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    height: 140,
    opacity: 0.36,
    position: "absolute",
    right: -46,
    top: -72,
    width: 180
  },
  segmented: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.xs
  },
  segment: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: spacing.sm
  },
  segmentActive: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10
  },
  segmentText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "800"
  },
  segmentTextActive: {
    color: colors.buttonText
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
    backgroundColor: colors.canvas,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 17,
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 18,
    minHeight: 58,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14
  },
  submitDisabled: {
    opacity: 0.55
  },
  submitText: {
    color: colors.buttonText,
    fontSize: 18,
    fontWeight: "900"
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20
  },
  legalConsent: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  checkbox: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: 7,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    marginTop: 1,
    width: 22
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  checkmark: {
    color: colors.buttonText,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 18
  },
  legalConsentText: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    lineHeight: 19
  },
  legalLinks: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center"
  },
  legalText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18
  },
  legalLink: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18
  }
});
