import { Redirect } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAppStore } from "@/state/useAppStore";
import { useTheme } from "@/theme/useTheme";

type Props = {
  children: ReactNode;
};

export function RequireAuth({ children }: Props) {
  const colors = useTheme();
  const styles = StyleSheet.create({
    loading: {
      alignItems: "center",
      backgroundColor: colors.canvas,
      flex: 1,
      justifyContent: "center"
    }
  });
  const authReady = useAppStore((state) => state.authReady);
  const authToken = useAppStore((state) => state.authToken);

  if (!authReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!authToken) {
    return <Redirect href="/login" />;
  }

  return children;
}
