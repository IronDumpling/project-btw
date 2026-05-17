import { useRouter } from "expo-router";
import { ClipboardCheck } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { mobileApi } from "@/api/client";
import type { CommunicationData, EmotionalData, IdentityData, OnboardingForm, RelationshipData } from "@/api/types";
import { Card } from "@/components/Card";
import { ChoiceGroup } from "@/components/ChoiceGroup";
import { IconBadge } from "@/components/DesignSystem";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RequireAuth } from "@/components/RequireAuth";
import { Screen } from "@/components/Screen";
import {
  normalizeOnboardingForm,
  optionLabel,
  optionsFor,
  useLocale,
  useT
} from "@/i18n/i18n";
import { useAppStore } from "@/state/useAppStore";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

const TOTAL_STEPS = 4;

function makeEmpty(): OnboardingForm {
  return normalizeOnboardingForm();
}

function mergeForm(saved?: Partial<OnboardingForm>): OnboardingForm {
  return normalizeOnboardingForm(saved);
}

function joinValue(value: string | string[], emptyLabel: string) {
  if (Array.isArray(value)) {
    return value.length ? value.join("、") : emptyLabel;
  }
  return value || emptyLabel;
}

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (value: string[]) => void; placeholder: string }) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useT();
  const [input, setInput] = useState("");

  function add(raw = input) {
    const tags = raw
      .split(/[,，、]/)
      .map((item) => item.trim())
      .filter((item) => item && !value.includes(item));
    if (tags.length) {
      onChange([...value, ...tags]);
    }
    setInput("");
  }

  return (
    <View style={styles.tagWrap}>
      <View style={styles.tagRow}>
        {value.map((tag) => (
          <Pressable key={tag} onPress={() => onChange(value.filter((item) => item !== tag))} style={styles.tag}>
            <Text style={styles.tagText}>{tag} ×</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        onBlur={() => add()}
        onChangeText={(text) => {
          if (/[,，、]/.test(text)) {
            add(text);
          } else {
            setInput(text);
          }
        }}
        onSubmitEditing={() => add()}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={input}
      />
      <Text style={styles.hint}>{t("commonTagHint")}</Text>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string | string[] }) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useT();
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewKey}>{label}</Text>
      <Text style={styles.reviewValue}>{joinValue(value, t("commonEmpty"))}</Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useT();
  const locale = useLocale();
  const savedDraft = useAppStore((state) => state.onboardingDraft);
  const user = useAppStore((state) => state.currentUser);
  const setOnboardingDraft = useAppStore((state) => state.setOnboardingDraft);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingForm>(() => mergeForm(user?.onboarding ?? savedDraft));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isReview = step === TOTAL_STEPS;
  const stepTitles = [
    t("onboardingStepIdentity"),
    t("onboardingStepCommunication"),
    t("onboardingStepEmotional"),
    t("onboardingStepRelationship")
  ];

  function updateIdentity(next: Partial<IdentityData>) {
    setForm((current) => ({ ...current, identity: { ...current.identity, ...next } }));
  }

  function updateCommunication(next: Partial<CommunicationData>) {
    setForm((current) => ({ ...current, communication: { ...current.communication, ...next } }));
  }

  function updateEmotional(next: Partial<EmotionalData>) {
    setForm((current) => ({ ...current, emotional: { ...current.emotional, ...next } }));
  }

  function updateRelationship(next: Partial<RelationshipData>) {
    setForm((current) => ({ ...current, relationship: { ...current.relationship, ...next } }));
  }

  function canProceed() {
    if (step === 0) return form.identity.nicknames.length > 0;
    if (step === 1 && form.communication.mode === "complex") return form.communication.materials.trim().length > 0;
    return true;
  }

  async function generate() {
    setSaving(true);
    setError("");
    try {
      setOnboardingDraft(form);
      await mobileApi.generateOnboarding(form);
      const updated = await mobileApi.me();
      setCurrentUser(updated);
      router.replace("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneratePersona"));
    } finally {
      setSaving(false);
    }
  }

  const reviewValue = (setName: Parameters<typeof optionLabel>[0], value: string) => optionLabel(setName, value, locale);
  const reviewValues = (setName: Parameters<typeof optionLabel>[0], values: string[]) => values.map((value) => optionLabel(setName, value, locale));

  return (
    <RequireAuth>
      <Screen
        kicker={isReview ? t("onboardingReviewKicker") : t("onboardingStepKicker", { step: step + 1, total: TOTAL_STEPS })}
        title={isReview ? t("onboardingReviewTitle") : stepTitles[step]}
        subtitle={isReview ? t("onboardingReviewBody") : t("onboardingBody")}
        trailing={<IconBadge icon={ClipboardCheck} />}
      >
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, ((step + 1) / (TOTAL_STEPS + 1)) * 100)}%` }]} />
        </View>

        {error ? <Text style={styles.error}>{t("commonError")}：{error}</Text> : null}

        {!isReview && step === 0 ? (
          <Card>
            <TagInput value={form.identity.nicknames} onChange={(nicknames) => updateIdentity({ nicknames })} placeholder={t("onboardingNicknamesPlaceholder")} />
            <ChoiceGroup label={t("onboardingAgeRange")} mode="single" options={optionsFor("ageRange", locale)} value={form.identity.age_range} onChange={(value) => updateIdentity({ age_range: value as string })} />
            <View style={styles.field}>
              <Text style={styles.label}>{t("onboardingOccupation")}</Text>
              <TextInput placeholderTextColor={colors.muted} style={styles.input} value={form.identity.occupation} onChangeText={(occupation) => updateIdentity({ occupation })} placeholder={t("onboardingOccupationPlaceholder")} />
            </View>
            <ChoiceGroup label={t("onboardingMbti")} mode="single" options={optionsFor("mbti", locale)} value={form.identity.mbti} onChange={(value) => updateIdentity({ mbti: value as string })} />
            <ChoiceGroup label={t("onboardingZodiac")} mode="single" options={optionsFor("zodiac", locale)} value={form.identity.zodiac} onChange={(value) => updateIdentity({ zodiac: value as string })} />
          </Card>
        ) : null}

        {!isReview && step === 1 ? (
          <Card>
            <View style={styles.modeRow}>
              <PrimaryButton label={t("onboardingSimpleMode")} variant={form.communication.mode === "simple" ? "primary" : "secondary"} onPress={() => updateCommunication({ mode: "simple" })} />
              <PrimaryButton label={t("onboardingComplexMode")} variant={form.communication.mode === "complex" ? "primary" : "secondary"} onPress={() => updateCommunication({ mode: "complex" })} />
            </View>
            {form.communication.mode === "complex" ? (
              <View style={styles.field}>
                <Text style={styles.label}>{t("onboardingMaterials")}</Text>
                <TextInput multiline placeholderTextColor={colors.muted} style={styles.textArea} value={form.communication.materials} onChangeText={(materials) => updateCommunication({ materials })} placeholder={t("onboardingMaterialsPlaceholder")} />
                <Text style={styles.hint}>{t("commonChars", { count: form.communication.materials.length })}</Text>
              </View>
            ) : (
              <>
                <ChoiceGroup label={t("onboardingMessageFormat")} mode="single" options={optionsFor("messageFormat", locale)} value={form.communication.message_format} onChange={(value) => updateCommunication({ message_format: value as string })} />
                <ChoiceGroup label={t("onboardingEmojiUsage")} mode="single" options={optionsFor("emojiUsage", locale)} value={form.communication.emoji_usage} onChange={(value) => updateCommunication({ emoji_usage: value as string })} />
                <ChoiceGroup label={t("onboardingPunctuation")} mode="multi" options={optionsFor("punctuation", locale)} value={form.communication.punctuation_habits} onChange={(value) => updateCommunication({ punctuation_habits: value as string[] })} />
                <ChoiceGroup label={t("onboardingReplySpeed")} mode="single" options={optionsFor("replySpeed", locale)} value={form.communication.reply_speed} onChange={(value) => updateCommunication({ reply_speed: value as string })} />
                <TagInput value={form.communication.catchphrases} onChange={(catchphrases) => updateCommunication({ catchphrases })} placeholder={t("onboardingCatchphrasesPlaceholder")} />
              </>
            )}
          </Card>
        ) : null}

        {!isReview && step === 2 ? (
          <Card>
            <ChoiceGroup label={t("onboardingAttachment")} mode="single" options={optionsFor("attachment", locale)} value={form.emotional.attachment_style} onChange={(value) => updateEmotional({ attachment_style: value as string })} />
            <ChoiceGroup label={t("onboardingLoveLanguages")} mode="multi" max={3} options={optionsFor("loveLanguages", locale)} value={form.emotional.love_languages} onChange={(value) => updateEmotional({ love_languages: value as string[] })} />
            <ChoiceGroup label={t("onboardingConflict")} mode="single" options={optionsFor("conflict", locale)} value={form.emotional.conflict_response} onChange={(value) => updateEmotional({ conflict_response: value as string })} />
            <View style={styles.field}>
              <Text style={styles.label}>{t("onboardingWhenInterested")}</Text>
              <TextInput placeholderTextColor={colors.muted} style={styles.input} value={form.emotional.when_interested} onChangeText={(when_interested) => updateEmotional({ when_interested })} placeholder={t("onboardingWhenInterestedPlaceholder")} />
            </View>
          </Card>
        ) : null}

        {!isReview && step === 3 ? (
          <Card>
            <ChoiceGroup label={t("onboardingRole")} mode="single" options={optionsFor("relationshipRole", locale)} value={form.relationship.role} onChange={(value) => updateRelationship({ role: value as string })} />
            <ChoiceGroup label={t("onboardingValuedTraits")} mode="multi" max={3} options={optionsFor("valuedTraits", locale)} value={form.relationship.valued_traits} onChange={(value) => updateRelationship({ valued_traits: value as string[] })} />
            <View style={styles.field}>
              <Text style={styles.label}>{t("onboardingDealbreakers")}</Text>
              <TextInput placeholderTextColor={colors.muted} style={styles.input} value={form.relationship.dealbreakers} onChangeText={(dealbreakers) => updateRelationship({ dealbreakers })} placeholder={t("onboardingDealbreakersPlaceholder")} />
            </View>
          </Card>
        ) : null}

        {isReview ? (
          <Card>
            <Text style={styles.cardTitle}>{t("onboardingSectionIdentity")}</Text>
            <ReviewRow label={t("onboardingNicknames")} value={form.identity.nicknames} />
            <ReviewRow label={t("onboardingAgeRange")} value={reviewValue("ageRange", form.identity.age_range)} />
            <ReviewRow label={t("onboardingOccupation")} value={form.identity.occupation} />
            <ReviewRow label={t("onboardingMbti")} value={reviewValue("mbti", form.identity.mbti)} />
            <ReviewRow label={t("onboardingZodiac")} value={reviewValue("zodiac", form.identity.zodiac)} />
            <Text style={styles.cardTitle}>{t("onboardingSectionCommunication")}</Text>
            <ReviewRow label={t("onboardingMode")} value={form.communication.mode === "complex" ? t("onboardingComplexMode") : t("onboardingSimpleMode")} />
            <ReviewRow label={t("onboardingReviewMessageHabit")} value={reviewValue("messageFormat", form.communication.message_format)} />
            <ReviewRow label={t("onboardingEmojiUsage")} value={reviewValue("emojiUsage", form.communication.emoji_usage)} />
            <ReviewRow label={t("onboardingReviewPunctuation")} value={reviewValues("punctuation", form.communication.punctuation_habits)} />
            <ReviewRow label={t("onboardingReviewReplySpeed")} value={reviewValue("replySpeed", form.communication.reply_speed)} />
            <ReviewRow label={t("onboardingReviewCatchphrases")} value={form.communication.catchphrases} />
            <Text style={styles.cardTitle}>{t("onboardingSectionEmotional")}</Text>
            <ReviewRow label={t("onboardingAttachment")} value={reviewValue("attachment", form.emotional.attachment_style)} />
            <ReviewRow label={t("onboardingLoveLanguages")} value={reviewValues("loveLanguages", form.emotional.love_languages)} />
            <ReviewRow label={t("onboardingReviewConflict")} value={reviewValue("conflict", form.emotional.conflict_response)} />
            <ReviewRow label={t("onboardingReviewInterested")} value={form.emotional.when_interested} />
            <Text style={styles.cardTitle}>{t("onboardingSectionRelationship")}</Text>
            <ReviewRow label={t("onboardingReviewRole")} value={reviewValue("relationshipRole", form.relationship.role)} />
            <ReviewRow label={t("onboardingReviewTraits")} value={reviewValues("valuedTraits", form.relationship.valued_traits)} />
            <ReviewRow label={t("onboardingReviewDealbreakers")} value={form.relationship.dealbreakers} />
          </Card>
        ) : null}

        <View style={styles.nav}>
          {step > 0 ? <PrimaryButton label={t("commonBack")} variant="secondary" onPress={() => setStep(step - 1)} /> : <View />}
          {isReview ? (
            <PrimaryButton disabled={saving} label={saving ? t("commonLoading") : t("onboardingGenerate")} onPress={generate} />
          ) : (
            <PrimaryButton disabled={!canProceed()} label={step === TOTAL_STEPS - 1 ? t("onboardingReviewSummary") : t("onboardingNext")} onPress={() => setStep(step + 1)} />
          )}
        </View>
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
    fontWeight: "800",
    marginTop: spacing.xs
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
  textArea: {
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    minHeight: 180,
    padding: spacing.sm,
    textAlignVertical: "top"
  },
  modeRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  tagWrap: {
    gap: spacing.xs
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  tag: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  tagText: {
    color: colors.accent,
    fontWeight: "700"
  },
  hint: {
    color: colors.muted,
    fontSize: 12
  },
  reviewRow: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    gap: spacing.xs,
    paddingVertical: spacing.sm
  },
  reviewKey: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  reviewValue: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21
  },
  nav: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20
  },
  progressTrack: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    height: 8,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: "100%"
  }
});
