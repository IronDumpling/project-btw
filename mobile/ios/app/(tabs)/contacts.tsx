import { StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RequireAuth } from "@/components/RequireAuth";
import { Screen } from "@/components/Screen";
import { useT } from "@/i18n/i18n";
import { useAppStore } from "@/state/useAppStore";
import { type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

export default function ContactsScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useT();
  const contacts = useAppStore((state) => state.contacts);

  return (
    <RequireAuth>
      <Screen>
      <Text style={styles.title}>{t("contactsTitle")}</Text>
      {contacts.length === 0 ? (
        <Card>
          <Text style={styles.cardTitle}>{t("contactsEmptyTitle")}</Text>
          <Text style={styles.body}>{t("contactsEmptyBody")}</Text>
          <PrimaryButton label={t("homeImport")} onPress={() => router.push("/import")} />
        </Card>
      ) : (
        contacts.map((contact) => (
          <Card key={contact.id}>
            <Text style={styles.cardTitle}>{contact.displayName}</Text>
            <Text style={styles.body}>{contact.localMemorySummary ?? t("contactsNoMemory")}</Text>
          </Card>
        ))
      )}
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
