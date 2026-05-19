import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { ShieldCheck } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { syncBackendProfileFromSession } from "@/auth/session";
import { Card } from "@/components/Card";
import { IconBadge } from "@/components/DesignSystem";
import { Screen } from "@/components/Screen";
import { useT } from "@/i18n/i18n";
import { supabase } from "@/lib/supabase";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useT();
  const [error, setError] = useState("");

  useEffect(() => {
    async function complete() {
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(url);
          if (exchangeError) {
            throw exchangeError;
          }
        }
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          router.replace("/login");
          return;
        }
        await syncBackendProfileFromSession(data.session);
        router.replace("/");
      } catch (err) {
        setError(err instanceof Error ? err.message : t("errorVerifyLink"));
      }
    }

    void complete();
  }, [router]);

  return (
    <Screen>
      <Card>
        <View style={styles.center}>
          <IconBadge icon={ShieldCheck} />
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.title}>{t("authCallbackTitle")}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </Card>
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    marginTop: spacing.sm
  },
  center: {
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 220
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20
  }
});
