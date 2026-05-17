import { Pressable, StyleSheet, Text } from "react-native";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
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
      style={[
        styles.button,
        variant === "secondary" && styles.secondary,
        variant === "danger" && styles.danger,
        disabled && styles.disabled
      ]}
    >
      <Text style={[styles.label, variant === "secondary" && styles.secondaryLabel, variant === "danger" && styles.dangerLabel]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (theme: ThemeColors) => StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: theme.accent,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.18,
    shadowRadius: 16
  },
  secondary: {
    backgroundColor: theme.accentSoft,
    shadowOpacity: 0
  },
  danger: {
    backgroundColor: theme.coralSoft,
    shadowOpacity: 0
  },
  disabled: {
    opacity: 0.55
  },
  label: {
    color: theme.buttonText,
    fontSize: 16,
    fontWeight: "900"
  },
  secondaryLabel: {
    color: theme.accent
  },
  dangerLabel: {
    color: theme.danger
  }
});
