import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { spacing, type ThemeColors } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

export function LoginHeroScene() {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const leftFloat = useRef(new Animated.Value(0)).current;
  const rightFloat = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const lockPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const leftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(leftFloat, { duration: 3200, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: true }),
        Animated.timing(leftFloat, { duration: 3200, easing: Easing.inOut(Easing.quad), toValue: 0, useNativeDriver: true })
      ])
    );
    const rightLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(rightFloat, { duration: 3400, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: true }),
        Animated.timing(rightFloat, { duration: 3400, easing: Easing.inOut(Easing.quad), toValue: 0, useNativeDriver: true })
      ])
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { duration: 1800, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: true }),
        Animated.timing(pulse, { duration: 1800, easing: Easing.inOut(Easing.quad), toValue: 0, useNativeDriver: true })
      ])
    );
    const lockLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(lockPulse, { duration: 2200, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: true }),
        Animated.timing(lockPulse, { duration: 2200, easing: Easing.inOut(Easing.quad), toValue: 0, useNativeDriver: true })
      ])
    );

    leftLoop.start();
    rightLoop.start();
    pulseLoop.start();
    lockLoop.start();

    return () => {
      leftLoop.stop();
      rightLoop.stop();
      pulseLoop.stop();
      lockLoop.stop();
    };
  }, [leftFloat, lockPulse, pulse, rightFloat]);

  const leftCardStyle = {
    transform: [
      { translateY: leftFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
      { rotate: leftFloat.interpolate({ inputRange: [0, 1], outputRange: ["-1.2deg", "-0.4deg"] }) }
    ]
  };

  const rightCardStyle = {
    transform: [
      { translateY: rightFloat.interpolate({ inputRange: [0, 1], outputRange: [-2, 5] }) },
      { rotate: rightFloat.interpolate({ inputRange: [0, 1], outputRange: ["1.1deg", "0.35deg"] }) }
    ]
  };

  const signalStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1] }),
    transform: [{ translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [2, -2] }) }]
  };

  const lockStyle = {
    opacity: lockPulse.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }),
    transform: [{ scale: lockPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.055] }) }]
  };

  const nodeStyle = {
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] }) }]
  };

  return (
    <View style={styles.scene} accessibilityRole="image">
      <Svg width="100%" height="100%" viewBox="0 0 360 220" style={StyleSheet.absoluteFill}>
        <Circle cx="180" cy="96" r="54" fill={colors.surface} opacity="0.62" />
        <Circle cx="180" cy="96" r="38" fill="none" stroke={colors.coral} strokeDasharray="4 8" strokeOpacity="0.28" strokeWidth="1.4" />
        <Path d="M16 146c38-18 62-18 96 0" fill="none" stroke={colors.coral} strokeOpacity="0.18" strokeWidth="1.4" />
        <Path d="M246 42c34-13 60-12 96 2" fill="none" stroke={colors.coral} strokeOpacity="0.16" strokeWidth="1.4" />
        <G opacity="0.55">
          <Path d="M32 143c26-28 42-56 30-92" fill="none" stroke={colors.accent} strokeWidth="1.2" />
          <Path d="M42 112c-18-7-28-21-28-39 20 6 30 20 28 39z" fill={colors.accentSoft} stroke={colors.accent} strokeWidth="1" />
          <Path d="M54 91c-15-15-18-32-8-48 15 13 18 29 8 48z" fill={colors.accentSoft} stroke={colors.accent} strokeWidth="1" />
          <Path d="M306 157c-12-30-8-54 16-76" fill="none" stroke={colors.lavender} strokeWidth="1.2" />
          <Path d="M316 126c18-12 36-13 52-2-16 14-33 15-52 2z" fill={colors.lavenderSoft} stroke={colors.lavender} strokeWidth="1" />
          <Path d="M329 101c12-15 27-20 44-14-10 15-25 21-44 14z" fill={colors.lavenderSoft} stroke={colors.lavender} strokeWidth="1" />
        </G>
      </Svg>

      <Animated.View style={[styles.chatCard, styles.leftCard, leftCardStyle]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, styles.tealAvatar]} />
          <View style={styles.headerLine} />
          <Text style={styles.more}>...</Text>
        </View>
        <View style={styles.userBubble}>
          <View style={styles.bubbleLineWide} />
          <View style={styles.bubbleLine} />
          <View style={styles.bubbleLineShort} />
        </View>
        <View style={styles.softBubble}>
          <View style={styles.miniAvatar} />
          <View style={styles.softLines}>
            <View style={styles.softLineWide} />
            <View style={styles.softLine} />
          </View>
          <Text style={styles.heart}>♥</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.chatCard, styles.rightCard, rightCardStyle]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, styles.lavenderAvatar]} />
          <View style={styles.headerLineLavender} />
          <Text style={styles.moreLavender}>...</Text>
        </View>
        <View style={styles.partnerBubble}>
          <View style={styles.partnerLineWide} />
          <View style={styles.partnerLine} />
          <View style={styles.partnerLineShort} />
        </View>
        <View style={styles.softBubble}>
          <View style={[styles.miniAvatar, styles.lavenderMini]} />
          <View style={styles.softLines}>
            <View style={styles.softLineWide} />
            <View style={styles.softLine} />
          </View>
          <Text style={styles.heart}>♥</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.signalWrap, signalStyle]}>
        <Svg width="100%" height="56" viewBox="0 0 188 56">
          <Path d="M4 24c31-24 57 31 91 7 31-21 53-24 89-2" fill="none" stroke={colors.accent} strokeLinecap="round" strokeOpacity="0.82" strokeWidth="2" />
          <Path d="M4 30c34-12 55 19 86 0 33-20 58-10 94 6" fill="none" stroke={colors.lavender} strokeLinecap="round" strokeOpacity="0.7" strokeWidth="2" />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.lockHalo, lockStyle]}>
        <View style={styles.lockBody}>
          <View style={styles.lockShackle} />
          <View style={styles.keyhole} />
        </View>
      </Animated.View>

      <View style={styles.nodes}>
        <Animated.View style={[styles.node, styles.nodeTeal, nodeStyle]}>
          <Text style={styles.nodeText}>••</Text>
        </Animated.View>
        <Animated.View style={[styles.node, styles.nodeCoral, nodeStyle]}>
          <Text style={styles.nodeHeart}>♥</Text>
        </Animated.View>
        <Animated.View style={[styles.node, styles.nodeLavender, nodeStyle]}>
          <Text style={styles.nodeText}>▣</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  scene: {
    height: 238,
    overflow: "hidden",
    position: "relative",
    width: "100%"
  },
  chatCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    padding: spacing.md,
    position: "absolute",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20
  },
  leftCard: {
    height: 130,
    left: 24,
    top: 46,
    width: 170
  },
  rightCard: {
    height: 130,
    right: 20,
    top: 54,
    width: 170
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  avatar: {
    borderRadius: 999,
    height: 22,
    width: 22
  },
  tealAvatar: {
    backgroundColor: colors.accent
  },
  lavenderAvatar: {
    backgroundColor: colors.lavender
  },
  headerLine: {
    backgroundColor: colors.line,
    borderRadius: 999,
    flex: 1,
    height: 7
  },
  headerLineLavender: {
    backgroundColor: colors.lavenderSoft,
    borderRadius: 999,
    flex: 1,
    height: 7
  },
  more: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 16
  },
  moreLavender: {
    color: colors.lavender,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 16
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
    borderRadius: 14,
    gap: 5,
    padding: spacing.sm,
    width: "82%"
  },
  partnerBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.lavender,
    borderBottomLeftRadius: 4,
    borderRadius: 14,
    gap: 5,
    opacity: 0.78,
    padding: spacing.sm,
    width: "82%"
  },
  bubbleLineWide: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    height: 5,
    opacity: 0.55,
    width: "92%"
  },
  bubbleLine: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    height: 5,
    opacity: 0.38,
    width: "68%"
  },
  bubbleLineShort: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    height: 5,
    opacity: 0.32,
    width: "48%"
  },
  partnerLineWide: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    height: 5,
    opacity: 0.6,
    width: "92%"
  },
  partnerLine: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    height: 5,
    opacity: 0.42,
    width: "70%"
  },
  partnerLineShort: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    height: 5,
    opacity: 0.34,
    width: "50%"
  },
  softBubble: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    borderRadius: 18,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 34,
    paddingHorizontal: spacing.sm
  },
  miniAvatar: {
    backgroundColor: colors.line,
    borderRadius: 999,
    height: 20,
    width: 20
  },
  lavenderMini: {
    backgroundColor: colors.lavenderSoft
  },
  softLines: {
    flex: 1,
    gap: 5
  },
  softLineWide: {
    backgroundColor: colors.line,
    borderRadius: 999,
    height: 5,
    width: "78%"
  },
  softLine: {
    backgroundColor: colors.line,
    borderRadius: 999,
    height: 5,
    width: "52%"
  },
  heart: {
    color: colors.coral,
    fontSize: 17,
    lineHeight: 18
  },
  signalWrap: {
    left: 87,
    position: "absolute",
    top: 105,
    width: 188
  },
  lockHalo: {
    alignItems: "center",
    backgroundColor: `${colors.surface}dd`,
    borderColor: colors.coralSoft,
    borderRadius: 999,
    borderWidth: 1,
    height: 68,
    justifyContent: "center",
    left: "50%",
    marginLeft: -34,
    position: "absolute",
    shadowColor: colors.coral,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    top: 48,
    width: 68
  },
  lockBody: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 7,
    height: 30,
    justifyContent: "center",
    marginTop: 9,
    width: 28
  },
  lockShackle: {
    borderColor: colors.accent,
    borderRadius: 10,
    borderWidth: 4,
    height: 24,
    position: "absolute",
    top: -17,
    width: 20
  },
  keyhole: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    height: 6,
    width: 6
  },
  nodes: {
    bottom: 11,
    flexDirection: "row",
    gap: spacing.lg,
    left: 0,
    justifyContent: "center",
    position: "absolute",
    right: 0
  },
  node: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    width: 42
  },
  nodeTeal: {
    backgroundColor: colors.accentSoft
  },
  nodeCoral: {
    backgroundColor: colors.coralSoft
  },
  nodeLavender: {
    backgroundColor: colors.lavenderSoft
  },
  nodeText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "900"
  },
  nodeHeart: {
    color: colors.coral,
    fontSize: 19,
    fontWeight: "900"
  }
});
