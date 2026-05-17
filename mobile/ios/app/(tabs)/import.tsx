import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { AlertTriangle, FileText, ImagePlus, ShieldCheck, Upload } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { mobileApi } from "@/api/client";
import { Card } from "@/components/Card";
import { IconBadge } from "@/components/DesignSystem";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RequireAuth } from "@/components/RequireAuth";
import { Screen } from "@/components/Screen";
import { useT } from "@/i18n/i18n";
import { hasImportConsent, saveImportConsent } from "@/privacy/consent";
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
  const [screenshotDataUri, setScreenshotDataUri] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [sourceMode, setSourceMode] = useState<"screenshot" | "text">("screenshot");
  const [contactName, setContactName] = useState("");
  const [consented, setConsented] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void hasImportConsent().then(setConsented);
  }, []);

  async function acceptConsent() {
    await saveImportConsent();
    setConsented(true);
  }

  async function pickScreenshot() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      base64: true,
      exif: false
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setScreenshotUri(asset?.uri ?? null);
      setScreenshotDataUri(asset?.base64 ? `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}` : null);
    }
  }

  async function ensureConsent() {
    if (consented) {
      return true;
    }
    setError(t("importConsentTitle"));
    return false;
  }

  async function analyzeText() {
    if (!(await ensureConsent())) {
      return;
    }
    if (!pastedText.trim()) {
      setError(t("importEmpty"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await mobileApi.analyzeImport({ sourceType: "text", rawText: pastedText, contactName });
      setAnalysisFlow(result);
      router.push("/analysis");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("commonError"));
    } finally {
      setLoading(false);
    }
  }

  async function analyzeScreenshot() {
    if (!(await ensureConsent())) {
      return;
    }
    if (!screenshotDataUri) {
      setError(t("importScreenshotTitle"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await mobileApi.analyzeImport({
        sourceType: "screenshot",
        screenshotDataUri,
        localScreenshotUri: screenshotUri ?? undefined,
        contactName
      });
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
      <Screen kicker={t("importConsentTitle")} title={t("importTitle")} subtitle={t("importBody")} trailing={<IconBadge icon={Upload} />}>
      <View style={styles.segmented}>
        <Pressable onPress={() => setSourceMode("screenshot")} style={[styles.segment, sourceMode === "screenshot" && styles.segmentActive]}>
          <ImagePlus color={sourceMode === "screenshot" ? colors.buttonText : colors.accent} size={18} />
          <Text style={[styles.segmentText, sourceMode === "screenshot" && styles.segmentTextActive]}>{t("importScreenshotTitle")}</Text>
        </Pressable>
        <Pressable onPress={() => setSourceMode("text")} style={[styles.segment, sourceMode === "text" && styles.segmentActive]}>
          <FileText color={sourceMode === "text" ? colors.buttonText : colors.accent} size={18} />
          <Text style={[styles.segmentText, sourceMode === "text" && styles.segmentTextActive]}>{t("importPasteTitle")}</Text>
        </Pressable>
      </View>

      {!consented ? (
        <Card variant="soft">
          <View style={styles.cardHeader}>
            <IconBadge icon={ShieldCheck} />
            <Text style={styles.cardTitle}>{t("importConsentTitle")}</Text>
          </View>
          <Text style={styles.body}>{t("importConsentBody")}</Text>
          <PrimaryButton label={t("importConsentAccept")} onPress={acceptConsent} />
        </Card>
      ) : null}

      <Card>
        <Text style={styles.cardTitle}>{t("importContactName")}</Text>
        <TextInput
          onChangeText={setContactName}
          placeholder={t("importContactPlaceholder")}
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={contactName}
        />
      </Card>

      {sourceMode === "screenshot" ? (
        <Card>
          <View style={styles.uploadBox}>
            <IconBadge icon={ImagePlus} tone="lavender" />
            <Text style={styles.cardTitle}>{t("importChooseScreenshot")}</Text>
            <Text style={styles.body}>{t("importScreenshotBody")}</Text>
            {screenshotUri ? <Text style={styles.selected}>{t("importSelected", { value: screenshotUri.split("/").pop() ?? screenshotUri })}</Text> : null}
          </View>
          <View style={styles.warning}>
            <AlertTriangle color={colors.coral} size={18} />
            <Text style={styles.warningText}>{t("importConsentBody")}</Text>
          </View>
          <View style={styles.actions}>
            <PrimaryButton label={t("importChooseScreenshot")} variant="secondary" onPress={pickScreenshot} />
            <PrimaryButton disabled={loading || !screenshotDataUri || !consented} label={loading ? t("commonLoading") : t("importAnalyzeScreenshot")} onPress={analyzeScreenshot} />
          </View>
        </Card>
      ) : null}
      {sourceMode === "screenshot" && error ? <Text style={styles.error}>{error}</Text> : null}

      {sourceMode === "text" ? <Card>
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
        <PrimaryButton disabled={loading || !consented} label={loading ? t("commonLoading") : t("importAnalyze")} onPress={analyzeText} />
      </Card> : null}
      </Screen>
    </RequireAuth>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
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
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  segmented: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs
  },
  segment: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 48
  },
  segmentActive: {
    backgroundColor: colors.accent
  },
  segmentText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "900"
  },
  segmentTextActive: {
    color: colors.buttonText
  },
  uploadBox: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: 18,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: 160,
    justifyContent: "center",
    padding: spacing.lg
  },
  warning: {
    alignItems: "flex-start",
    backgroundColor: colors.coralSoft,
    borderRadius: 14,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm
  },
  warningText: {
    color: colors.danger,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17
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
    borderRadius: 16,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    minHeight: 140,
    padding: spacing.sm,
    textAlignVertical: "top"
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
  actions: {
    gap: spacing.sm
  }
});
