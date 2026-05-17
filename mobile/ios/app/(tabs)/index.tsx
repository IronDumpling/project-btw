import { type Href, useRouter } from "expo-router";
import { MessageCircle, Sparkles, Upload, UserRound, UsersRound } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { GradientHero, IconBadge } from "@/components/DesignSystem";
import { RequireAuth } from "@/components/RequireAuth";
import { Screen } from "@/components/Screen";
import { EmptyStateVisual } from "@/components/visuals/BrandVisual";
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
    { title: t("importTitle"), body: t("importBody"), icon: Upload, href: "/import" as Href },
    { title: t("coachTitle"), body: t("homeMenuCoachBody"), icon: MessageCircle, href: "/reply-coach" as Href },
    { title: t("contactsTitle"), body: t("homeMenuContactsBody"), icon: UsersRound, href: "/contacts" as Href },
    { title: t("profileTitle"), body: t("homeMenuProfileBody"), icon: UserRound, href: "/profile" as Href }
  ];
  const nextAction = !user?.persona_markdown
    ? { label: t("homeSetup"), href: "/onboarding" as Href }
    : pendingMemoryPatch
      ? { label: t("homeReviewMemory"), href: "/memory-review" as Href }
      : currentAnalysis
        ? { label: t("analysisDraft"), href: "/reply-coach" as Href }
        : { label: t("homeImport"), href: "/import" as Href };

  return (
    <RequireAuth>
      <Screen>
        <GradientHero
          kicker={t("homeKicker")}
          title={user?.display_name ? t("homeGreeting", { name: user.display_name }) : t("homeTitle")}
          body={t("homeBody")}
        >
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: user?.persona_markdown ? "78%" : "34%" }]} />
          </View>
          <Pressable style={styles.primaryCta} onPress={() => router.push(nextAction.href)}>
            <Text style={styles.primaryCtaText}>{nextAction.label}</Text>
          </Pressable>
        </GradientHero>

        <Card>
          <View style={styles.profileRow}>
            <IconBadge icon={Sparkles} tone={user?.persona_markdown ? "accent" : "coral"} />
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
              <IconBadge icon={item.icon} tone={item.title === t("coachTitle") ? "lavender" : "accent"} />
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
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  },
  progressTrack: {
    backgroundColor: `${colors.buttonText}55`,
    borderRadius: 999,
    height: 8,
    marginTop: spacing.sm,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: colors.buttonText,
    borderRadius: 999,
    height: "100%"
  },
  primaryCta: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.buttonText,
    borderRadius: 16,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  primaryCtaText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "900"
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
    backgroundColor: `${colors.surface}f2`,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    minHeight: 138,
    padding: spacing.md,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    width: "48%"
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
