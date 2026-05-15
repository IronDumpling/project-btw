import { Pressable, StyleSheet, Text } from "react-native";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, variant = "primary", disabled = false }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={[styles.button, variant === "secondary" && styles.secondary, disabled && styles.disabled]}
    >
      <Text style={[styles.label, variant === "secondary" && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (theme: ThemeColors) => StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: theme.accent,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  secondary: {
    backgroundColor: theme.accentSoft
  },
  disabled: {
    opacity: 0.55
  },
  label: {
    color: theme.buttonText,
    fontSize: 15,
    fontWeight: "700"
  },
  secondaryLabel: {
    color: theme.accent
  }
});
