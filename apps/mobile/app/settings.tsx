import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Globe2, Palette, Server, ShieldCheck } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { mobileApi } from "@/api/client";
import { Card } from "@/components/Card";
import { IconBadge } from "@/components/DesignSystem";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RequireAuth } from "@/components/RequireAuth";
import { Screen } from "@/components/Screen";
import { appConfig } from "@/config/env";
import { useT } from "@/i18n/i18n";
import { saveLocale, saveThemeId } from "@/state/preferences";
import { useAppStore } from "@/state/useAppStore";
import { spacing, themeLabels, themes, type ThemeColors, type ThemeId } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useT();
  const locale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);
  const themeId = useAppStore((state) => state.themeId);
  const setThemeId = useAppStore((state) => state.setThemeId);
  const health = useQuery({
    queryKey: ["backend-health"],
    queryFn: mobileApi.health,
    retry: false
  });

  function chooseTheme(nextThemeId: ThemeId) {
    setThemeId(nextThemeId);
    void saveThemeId(nextThemeId);
  }

  function chooseLocale(nextLocale: "en" | "zh-CN") {
    setLocale(nextLocale);
    void saveLocale(nextLocale);
  }

  return (
    <RequireAuth>
      <Screen kicker={t("settingsEnvironment")} title={t("settingsTitle")} trailing={<IconBadge icon={Server} tone="lavender" />}>
      <Card>
        <View style={styles.cardHeader}>
          <IconBadge icon={Server} tone="lavender" />
          <Text style={styles.cardTitle}>{t("settingsEnvironment")}</Text>
        </View>
        <Text style={styles.body}>{t("settingsAppEnv", { value: appConfig.appEnv })}</Text>
        <Text style={styles.body}>{t("settingsApi", { value: appConfig.apiBaseUrl })}</Text>
        <Text style={styles.body}>
          {t("settingsBackend", { value: health.isLoading ? t("settingsBackendChecking") : health.isSuccess ? t("settingsBackendConnected") : t("settingsBackendOffline") })}
        </Text>
      </Card>
      <Card>
        <View style={styles.cardHeader}>
          <IconBadge icon={Palette} />
          <Text style={styles.cardTitle}>{t("settingsTheme")}</Text>
        </View>
        <View style={styles.optionGrid}>
          {(Object.keys(themes) as ThemeId[]).map((id) => (
            <Pressable key={id} onPress={() => chooseTheme(id)} style={[styles.option, themeId === id && styles.optionSelected]}>
              <View style={[styles.swatch, { backgroundColor: themes[id].canvas, borderColor: themes[id].line }]} />
              <Text style={styles.optionText}>{themeLabels[id][locale]}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
      <Card>
        <View style={styles.cardHeader}>
          <IconBadge icon={Globe2} tone="lavender" />
          <Text style={styles.cardTitle}>{t("settingsLanguage")}</Text>
        </View>
        <View style={styles.optionGrid}>
          <Pressable onPress={() => chooseLocale("en")} style={[styles.option, locale === "en" && styles.optionSelected]}>
            <Text style={styles.optionText}>{t("settingsEnglish")}</Text>
          </Pressable>
          <Pressable onPress={() => chooseLocale("zh-CN")} style={[styles.option, locale === "zh-CN" && styles.optionSelected]}>
            <Text style={styles.optionText}>{t("settingsChinese")}</Text>
          </Pressable>
        </View>
      </Card>
      <Card>
        <View style={styles.cardHeader}>
          <IconBadge icon={ShieldCheck} />
          <Text style={styles.cardTitle}>{t("settingsPrivacy")}</Text>
        </View>
        <Text style={styles.body}>{t("settingsPrivacyUserInitiated")}</Text>
        <Text style={styles.body}>{t("settingsPrivacyScreenshots")}</Text>
        <Text style={styles.body}>{t("settingsPrivacyMemory")}</Text>
        <PrimaryButton label={t("privacyTitle")} variant="secondary" onPress={() => router.push("/privacy")} />
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
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  option: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  optionSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent
  },
  optionText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700"
  },
  swatch: {
    borderRadius: 10,
    borderWidth: 1,
    height: 20,
    width: 20
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  }
});
