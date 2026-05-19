import { Tabs } from "expo-router";
import { TabIcon } from "@/components/visuals/BrandVisual";
import { useT } from "@/i18n/i18n";
import { useTheme } from "@/theme/useTheme";

export default function TabsLayout() {
  const colors = useTheme();
  const t = useT();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.ink, fontWeight: "800" },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "800"
        }
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("tabsHome"), tabBarIcon: ({ color }) => <TabIcon name="home" color={color} /> }} />
      <Tabs.Screen name="import" options={{ title: t("tabsImport"), tabBarIcon: ({ color }) => <TabIcon name="import" color={color} /> }} />
      <Tabs.Screen name="reply-coach" options={{ title: t("tabsCoach"), tabBarIcon: ({ color }) => <TabIcon name="coach" color={color} /> }} />
      <Tabs.Screen name="contacts" options={{ title: t("tabsContacts"), tabBarIcon: ({ color }) => <TabIcon name="contacts" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t("tabsProfile"), tabBarIcon: ({ color }) => <TabIcon name="profile" color={color} /> }} />
    </Tabs>
  );
}
