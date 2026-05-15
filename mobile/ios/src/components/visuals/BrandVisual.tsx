import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { useTheme } from "@/theme/useTheme";

type IconName = "home" | "import" | "coach" | "contacts" | "profile" | "settings";

export function AuthHeroVisual() {
  const colors = useTheme();
  return (
    <Svg width="100%" height={170} viewBox="0 0 340 170" accessibilityRole="image">
      <Defs>
        <LinearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.accentSoft} />
          <Stop offset="1" stopColor={colors.coralSoft} />
        </LinearGradient>
      </Defs>
      <Rect x="18" y="18" width="304" height="134" rx="26" fill="url(#hero)" />
      <Circle cx="98" cy="84" r="38" fill={colors.surface} opacity="0.86" />
      <Circle cx="238" cy="84" r="38" fill={colors.surface} opacity="0.86" />
      <Path
        d="M129 87c18 22 62 22 80 0"
        fill="none"
        stroke={colors.accent}
        strokeLinecap="round"
        strokeWidth="9"
      />
      <Path
        d="M92 73c9-10 20-10 29 0M232 73c9-10 20-10 29 0"
        fill="none"
        stroke={colors.ink}
        strokeLinecap="round"
        strokeWidth="7"
      />
      <Circle cx="169" cy="86" r="9" fill={colors.coral} />
    </Svg>
  );
}

export function EmptyStateVisual() {
  const colors = useTheme();
  return (
    <Svg width="100%" height={120} viewBox="0 0 260 120" accessibilityRole="image">
      <Rect x="34" y="18" width="192" height="82" rx="22" fill={colors.lavenderSoft} />
      <Rect x="58" y="38" width="88" height="12" rx="6" fill={colors.surface} />
      <Rect x="58" y="60" width="144" height="10" rx="5" fill={colors.surface} opacity="0.88" />
      <Rect x="58" y="78" width="112" height="10" rx="5" fill={colors.surface} opacity="0.72" />
      <Circle cx="194" cy="42" r="18" fill={colors.accent} opacity="0.88" />
      <Path d="M185 42l6 6 13-15" fill="none" stroke={colors.surface} strokeLinecap="round" strokeWidth="5" />
    </Svg>
  );
}

export function TabIcon({ name, color, size = 24 }: { name: IconName; color: string; size?: number }) {
  const strokeWidth = 2.2;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "home" ? (
        <Path d="M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4z" fill="none" stroke={color} strokeWidth={strokeWidth} />
      ) : null}
      {name === "import" ? (
        <G fill="none" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth}>
          <Path d="M12 4v11M8 11l4 4 4-4M5 20h14" />
        </G>
      ) : null}
      {name === "coach" ? (
        <G fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}>
          <Path d="M5 6h14v9H9l-4 4z" />
          <Path d="M9 10h6M9 13h4" />
        </G>
      ) : null}
      {name === "contacts" ? (
        <G fill="none" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth}>
          <Circle cx="9" cy="8" r="3" />
          <Path d="M3.5 19c1-3.2 3-4.8 5.5-4.8S13.5 15.8 14.5 19" />
          <Path d="M16 9.5a2.5 2.5 0 1 0 0-5M16.5 14.5c2 .5 3.4 2 4 4.5" />
        </G>
      ) : null}
      {name === "profile" ? (
        <G fill="none" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth}>
          <Circle cx="12" cy="8" r="4" />
          <Path d="M5 20c1.1-4 3.4-6 7-6s5.9 2 7 6" />
        </G>
      ) : null}
      {name === "settings" ? (
        <G fill="none" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth}>
          <Circle cx="12" cy="12" r="3" />
          <Path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
        </G>
      ) : null}
    </Svg>
  );
}
