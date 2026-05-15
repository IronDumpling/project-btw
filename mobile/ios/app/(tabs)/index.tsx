import { type Href, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/RequireAuth";
import { Screen } from "@/components/Screen";
import { EmptyStateVisual, TabIcon } from "@/components/visuals/BrandVisual";
import { useT } from "@/i18n/i18n";
import { useAppStore } from "@/state/useAppStore";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

export default function HomeScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useT();
  const user = useAppStore((state) => state.currentUser);
  const currentAnalysis = useAppStore((state) => state.currentAnalysis);
  const pendingMemoryPatch = useAppStore((state) => state.pendingMemoryPatch);
  const menu = [
    { title: t("importTitle"), body: t("importBody"), icon: "import" as const, href: "/import" as Href },
    { title: t("coachTitle"), body: t("homeMenuCoachBody"), icon: "coach" as const, href: "/reply-coach" as Href },
    { title: t("contactsTitle"), body: t("homeMenuContactsBody"), icon: "contacts" as const, href: "/contacts" as Href },
    { title: t("profileTitle"), body: t("homeMenuProfileBody"), icon: "profile" as const, href: "/profile" as Href }
  ];
  const nextAction = !user?.persona_markdown
    ? { label: t("homeSetup"), href: "/onboarding" as Href }
    : pendingMemoryPatch
      ? { label: t("homeReviewMemory"), href: "/analysis" as Href }
      : currentAnalysis
        ? { label: t("analysisDraft"), href: "/reply-coach" as Href }
        : { label: t("homeImport"), href: "/import" as Href };

  return (
    <RequireAuth>
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.kicker}>{t("homeKicker")}</Text>
          <Text style={styles.title}>{user?.display_name ? t("homeGreeting", { name: user.display_name }) : t("homeTitle")}</Text>
          <Text style={styles.body}>{t("homeBody")}</Text>
          <Pressable style={styles.primaryCta} onPress={() => router.push(nextAction.href)}>
            <Text style={styles.primaryCtaText}>{nextAction.label}</Text>
          </Pressable>
        </View>

        <Card>
          <View style={styles.profileRow}>
            <View style={styles.profileCopy}>
              <Text style={styles.sectionTitle}>{t("homeReady")}</Text>
              <Text style={styles.body}>
                {user?.persona_markdown
                  ? t("homeReadyBody")
                  : t("homeSetupBody")}
              </Text>
            </View>
            <View style={[styles.statusPill, user?.persona_markdown ? styles.statusReady : styles.statusTodo]}>
              <Text style={styles.statusText}>{user?.persona_markdown ? t("homeStatusReady") : t("homeStatusSetup")}</Text>
            </View>
          </View>
          {!user?.persona_markdown ? <EmptyStateVisual /> : null}
        </Card>

        <View style={styles.menuGrid}>
          {menu.map((item) => (
            <Pressable key={item.title} style={styles.menuItem} onPress={() => router.push(item.href)}>
              <View style={styles.iconWrap}>
                <TabIcon name={item.icon} color={colors.accent} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuBody}>{item.body}</Text>
            </Pressable>
          ))}
        </View>
      </Screen>
    </RequireAuth>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  hero: {
    gap: spacing.sm
  },
  kicker: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23
  },
  primaryCta: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  primaryCtaText: {
    color: colors.buttonText,
    fontSize: 15,
    fontWeight: "800"
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800"
  },
  profileRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  profileCopy: {
    flex: 1,
    gap: spacing.xs
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  statusReady: {
    backgroundColor: colors.accentSoft
  },
  statusTodo: {
    backgroundColor: colors.coralSoft
  },
  statusText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800"
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  menuItem: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    minHeight: 138,
    padding: spacing.md,
    width: "48%"
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  menuTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  menuBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  }
});
