import { ShieldCheck } from "lucide-react-native";
import { StyleSheet, Text } from "react-native";
import { Card } from "@/components/Card";
import { IconBadge } from "@/components/DesignSystem";
import { Screen } from "@/components/Screen";
import { useT } from "@/i18n/i18n";
import { type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

export default function PrivacyPolicyScreen() {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useT();
  const sections = [
    { title: t("privacyPolicyIntroTitle"), body: t("privacyPolicyIntroBody") },
    { title: t("privacyPolicyAiTitle"), body: t("privacyPolicyAiBody") },
    { title: t("privacyPolicyControlTitle"), body: t("privacyPolicyControlBody") },
    { title: t("privacyPolicySafetyTitle"), body: t("privacyPolicySafetyBody") }
  ];

  return (
    <Screen title={t("privacyPolicyTitle")} trailing={<IconBadge icon={ShieldCheck} />}>
      {sections.map((section) => (
        <Card key={section.title}>
          <Text style={styles.cardTitle}>{section.title}</Text>
          <Text style={styles.body}>{section.body}</Text>
        </Card>
      ))}
    </Screen>
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
  }
});
