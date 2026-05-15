import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LocalizedOption } from "@/i18n/i18n";
import { useT } from "@/i18n/i18n";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

type Props = {
  label: string;
  options: Array<string | LocalizedOption>;
  mode: "single" | "multi";
  value: string | string[];
  onChange: (value: string | string[]) => void;
  max?: number;
};

export function ChoiceGroup({ label, options, mode, value, onChange, max }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const t = useT();
  const [open, setOpen] = useState(mode === "multi");
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const normalizedOptions = options.map((option) => (typeof option === "string" ? { value: option, label: option } : option));
  const selectedLabel = normalizedOptions.find((option) => option.value === selected[0])?.label;

  function toggle(option: string) {
    if (mode === "single") {
      onChange(option);
      setOpen(false);
      return;
    }
    if (!selected.includes(option) && max && selected.length >= max) {
      return;
    }
    onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  }

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      {mode === "multi" && max ? <Text style={styles.hint}>{t("commonSelectedCount", { max, count: selected.length })}</Text> : null}
      {mode === "single" ? (
        <Pressable accessibilityRole="button" onPress={() => setOpen((next) => !next)} style={styles.select}>
          <Text style={[styles.selectText, !selected[0] && styles.placeholder]}>
            {selectedLabel ?? t("commonChooseOne")}
          </Text>
          <Text style={styles.chevron}>{open ? "▲" : "▼"}</Text>
        </Pressable>
      ) : null}

      {open ? (
        <View style={styles.options}>
          {normalizedOptions.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <Pressable
                accessibilityRole={mode === "multi" ? "checkbox" : "button"}
                accessibilityState={{ checked }}
                key={option.value}
                onPress={() => toggle(option.value)}
                style={[styles.option, checked && styles.optionSelected]}
              >
                <Text style={[styles.mark, checked && styles.markSelected]}>{checked ? "✓" : ""}</Text>
                <Text style={styles.optionText}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (theme: ThemeColors) => StyleSheet.create({
  group: {
    gap: spacing.xs
  },
  label: {
    color: theme.ink,
    fontSize: 14,
    fontWeight: "700"
  },
  hint: {
    color: theme.muted,
    fontSize: 12
  },
  select: {
    alignItems: "center",
    borderColor: theme.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: spacing.sm
  },
  selectText: {
    color: theme.ink,
    flex: 1,
    fontSize: 15
  },
  placeholder: {
    color: theme.muted
  },
  chevron: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  options: {
    gap: spacing.xs
  },
  option: {
    alignItems: "center",
    borderColor: theme.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 42,
    paddingHorizontal: spacing.sm
  },
  optionSelected: {
    backgroundColor: theme.accentSoft,
    borderColor: theme.accent
  },
  mark: {
    borderColor: theme.line,
    borderRadius: 4,
    borderWidth: 1,
    color: theme.accent,
    fontSize: 13,
    fontWeight: "900",
    height: 20,
    lineHeight: 18,
    textAlign: "center",
    width: 20
  },
  markSelected: {
    borderColor: theme.accent
  },
  optionText: {
    color: theme.ink,
    flex: 1,
    fontSize: 15
  }
});
