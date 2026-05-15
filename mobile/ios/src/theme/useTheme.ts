import { useMemo } from "react";
import { useAppStore } from "@/state/useAppStore";
import { themes } from "./theme";

export function useTheme() {
  const themeId = useAppStore((state) => state.themeId);
  return useMemo(() => themes[themeId] ?? themes.default, [themeId]);
}
