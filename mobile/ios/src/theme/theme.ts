export type ThemeId = "default" | "warm" | "sage" | "night";

export type ThemeColors = {
  ink: string;
  muted: string;
  line: string;
  surface: string;
  canvas: string;
  accent: string;
  accentSoft: string;
  coral: string;
  coralSoft: string;
  lavender: string;
  lavenderSoft: string;
  warning: string;
  danger: string;
  buttonText: string;
};

export const themes: Record<ThemeId, ThemeColors> = {
  default: {
    ink: "#192329",
    muted: "#647079",
    line: "#dfe6e7",
    surface: "#ffffff",
    canvas: "#f7f5f1",
    accent: "#2f6f73",
    accentSoft: "#dcefeb",
    coral: "#c97868",
    coralSoft: "#f6dfd8",
    lavender: "#7b6fa3",
    lavenderSoft: "#e9e4f4",
    warning: "#9a5b1b",
    danger: "#a13b45",
    buttonText: "#ffffff"
  },
  warm: {
    ink: "#2d2020",
    muted: "#745f5b",
    line: "#ead5ce",
    surface: "#fffafa",
    canvas: "#fff3ee",
    accent: "#a8544a",
    accentSoft: "#f7ddd7",
    coral: "#c97868",
    coralSoft: "#f8e4df",
    lavender: "#77618b",
    lavenderSoft: "#eee4f3",
    warning: "#9a5b1b",
    danger: "#a13b45",
    buttonText: "#ffffff"
  },
  sage: {
    ink: "#172320",
    muted: "#5b6d67",
    line: "#d7e4dc",
    surface: "#fbfffc",
    canvas: "#eff7f1",
    accent: "#3f7358",
    accentSoft: "#dceee2",
    coral: "#bd735f",
    coralSoft: "#f3dfd7",
    lavender: "#62729a",
    lavenderSoft: "#e3e8f4",
    warning: "#8a651e",
    danger: "#9a3e48",
    buttonText: "#ffffff"
  },
  night: {
    ink: "#f4f1ea",
    muted: "#b8c0c0",
    line: "#334145",
    surface: "#172126",
    canvas: "#0f171b",
    accent: "#79c7bd",
    accentSoft: "#203d3d",
    coral: "#efa08d",
    coralSoft: "#46302e",
    lavender: "#c0b5e8",
    lavenderSoft: "#302d45",
    warning: "#e5b866",
    danger: "#ff8e9a",
    buttonText: "#0f171b"
  }
};

export const colors = themes.default;

export const themeLabels: Record<ThemeId, { en: string; "zh-CN": string }> = {
  default: { en: "Default", "zh-CN": "默认" },
  warm: { en: "Warm", "zh-CN": "暖色" },
  sage: { en: "Sage", "zh-CN": "鼠尾草" },
  night: { en: "Night", "zh-CN": "夜间" }
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32
};
