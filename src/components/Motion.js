import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet } from "react-native";

/** Fades and slides its children up on mount; use `delay` to stagger sections. */
export function FadeIn({ delay = 0, distance = 18, duration = 520, style, children }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Springy press: shrinks slightly while held and bounces back on release.
 *  Layout keys (width, flex, margins, alignment) go on the outer Pressable so
 *  percentage widths and grids size correctly; the rest goes on the scaled view. */
const OUTER = ["width", "minWidth", "maxWidth", "flex", "flexGrow", "flexShrink", "flexBasis", "alignSelf", "margin", "marginTop", "marginBottom", "marginLeft", "marginRight", "marginHorizontal", "marginVertical", "position", "top", "left", "right", "bottom"];
export function PressScale({ onPress, style, children, disabled, scale = 0.95 }) {
  const v = useRef(new Animated.Value(1)).current;
  const to = (n) => Animated.spring(v, { toValue: n, friction: 5, tension: 260, useNativeDriver: true }).start();
  const flat = StyleSheet.flatten(style) || {};
  const outer = {}, inner = {};
  Object.keys(flat).forEach((k) => { (OUTER.includes(k) ? outer : inner)[k] = flat[k]; });
  return (
    <Pressable style={outer} onPress={onPress} disabled={disabled} onPressIn={() => to(scale)} onPressOut={() => to(1)}>
      <Animated.View style={[inner, { transform: [{ scale: v }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Slow looping drift for background glow blobs. */
export function Float({ style, range = 14, duration = 4200, delay = 0 }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const t = v.interpolate({ inputRange: [0, 1], outputRange: [-range, range] });
  return <Animated.View pointerEvents="none" style={[style, { transform: [{ translateY: t }, { translateX: Animated.multiply(t, 0.5) }] }]} />;
}

/** Twinkling gold sparkle. */
export function Sparkle({ style, size = 16, delay = 0 }) {
  const v = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1100, delay, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0.3, duration: 1100, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.Text pointerEvents="none" style={[{ position: "absolute", color: "#FFD36B", fontSize: size, fontWeight: "800" }, style, { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0.3, 1], outputRange: [0.8, 1.15] }) }] }]}>
      ✦
    </Animated.Text>
  );
}
