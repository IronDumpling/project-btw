import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { syncBackendProfileFromSession } from "@/auth/session";
import { mobileApi } from "@/api/client";
import { normalizeLocale, useT } from "@/i18n/i18n";
import { supabase } from "@/lib/supabase";
import { loadPreferences } from "@/state/preferences";
import { useAppStore } from "@/state/useAppStore";
import { useTheme } from "@/theme/useTheme";

export default function RootLayout() {
  const router = useRouter();
  const [queryClient] = useState(() => new QueryClient());
  const theme = useTheme();
  const t = useT();
  const setAuthToken = useAppStore((state) => state.setAuthToken);
  const markAuthReady = useAppStore((state) => state.markAuthReady);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  const clearSession = useAppStore((state) => state.clearSession);
  const setLocale = useAppStore((state) => state.setLocale);
  const setThemeId = useAppStore((state) => state.setThemeId);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      const prefs = await loadPreferences();
      if (mounted) {
        setThemeId(prefs.themeId);
        setLocale(prefs.locale ?? normalizeLocale(Intl.DateTimeFormat().resolvedOptions().locale));
      }
      const { data } = await supabase.auth.getSession();
      if (!mounted) {
        return;
      }
      if (!data.session) {
        markAuthReady();
        return;
      }
      setAuthToken(data.session.access_token);
      try {
        const user = await mobileApi.me();
        if (mounted) {
          setCurrentUser(user);
        }
      } catch {
        if (mounted) {
          await supabase.auth.signOut();
          await clearSession();
          router.replace({
            pathname: "/verify-email",
            params: { email: data.session.user.email ?? "" }
          });
        }
      }
    }

    void hydrate();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) {
        return;
      }
      if (event === "SIGNED_OUT" || !session) {
        void clearSession();
        return;
      }
      void syncBackendProfileFromSession(session).catch(() => {
        void supabase.auth.signOut();
        router.replace({
          pathname: "/verify-email",
          params: { email: session.user.email ?? "" }
        });
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [clearSession, markAuthReady, router, setAuthToken, setCurrentUser, setLocale, setThemeId]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={theme.canvas === "#0f171b" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.canvas },
          headerShadowVisible: false,
          headerTitleStyle: { color: theme.ink, fontWeight: "700" },
          contentStyle: { backgroundColor: theme.canvas }
        }}
      >
        <Stack.Screen name="login" options={{ title: t("loginLogin"), headerShown: false }} />
        <Stack.Screen name="terms" options={{ title: t("termsTitle") }} />
        <Stack.Screen name="privacy-policy" options={{ title: t("privacyPolicyTitle") }} />
        <Stack.Screen name="verify-email" options={{ title: t("verifyTitle"), headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ title: t("verifyTitle"), headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: t("onboardingTitle") }} />
        <Stack.Screen name="analysis" options={{ title: t("analysisTitle") }} />
        <Stack.Screen name="settings" options={{ title: t("settingsTitle") }} />
        <Stack.Screen name="privacy" options={{ title: t("privacyTitle") }} />
        <Stack.Screen name="memory-review" options={{ title: t("memoryReviewTitle") }} />
      </Stack>
    </QueryClientProvider>
  );
}
