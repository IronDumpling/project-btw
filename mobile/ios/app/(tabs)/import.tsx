import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import { mobileApi } from "@/api/client";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RequireAuth } from "@/components/RequireAuth";
import { Screen } from "@/components/Screen";
import { useT } from "@/i18n/i18n";
import { useAppStore } from "@/state/useAppStore";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

export default function ImportScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useT();
  const setAnalysisFlow = useAppStore((state) => state.setAnalysisFlow);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function pickScreenshot() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1
    });

    if (!result.canceled) {
      setScreenshotUri(result.assets[0]?.uri ?? null);
    }
  }

  async function analyzeText() {
    if (!pastedText.trim()) {
      setError(t("importEmpty"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await mobileApi.analyzeImport({ sourceType: "text", rawText: pastedText });
      setAnalysisFlow(result);
      router.push("/analysis");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("commonError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireAuth>
      <Screen>
      <Text style={styles.title}>{t("importTitle")}</Text>
      <Text style={styles.body}>{t("importBody")}</Text>

      <Card>
        <Text style={styles.cardTitle}>{t("importScreenshotTitle")}</Text>
        <Text style={styles.body}>{t("importScreenshotBody")}</Text>
        {screenshotUri ? <Text style={styles.selected}>{t("importSelected", { value: screenshotUri })}</Text> : null}
        <PrimaryButton label={t("importChooseScreenshot")} onPress={pickScreenshot} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>{t("importPasteTitle")}</Text>
        <TextInput
          multiline
          onChangeText={setPastedText}
          placeholder={t("importPlaceholder")}
          placeholderTextColor={colors.muted}
          style={styles.textArea}
          value={pastedText}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton disabled={loading} label={loading ? t("commonLoading") : t("importAnalyze")} onPress={analyzeText} />
      </Card>
      </Screen>
    </RequireAuth>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "800"
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800"
  },
  selected: {
    color: colors.accent,
    fontSize: 13
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20
  },
  textArea: {
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    minHeight: 140,
    padding: spacing.sm,
    textAlignVertical: "top"
  }
});
