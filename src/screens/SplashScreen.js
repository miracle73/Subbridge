import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, StyleSheet, StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { C, F, S, W, H } from "../utils/theme";
import { AuthToken, OnboardingFlag, SecurePin } from "../utils/storage";

export default function SplashScreen({ navigation }) {
  const logoY = useRef(new Animated.Value(40)).current;
  const logoS = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoY, { toValue: 0, friction: 7, useNativeDriver: true }),
      Animated.spring(logoS, { toValue: 1, friction: 7, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    const iv = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.random() * 15 + 8;
        return next >= 100 ? 100 : next;
      });
    }, 200);

    const timeout = setTimeout(async () => {
      clearInterval(iv);
      const loggedIn = await AuthToken.isLoggedIn();
      const onboardingDone = await OnboardingFlag.get();
      if (loggedIn) {
        navigation.replace("Auth");
      } else if (onboardingDone) {
        navigation.replace("Auth");
      } else {
        navigation.replace("Onboarding");
      }
    }, 2500);

    return () => { clearInterval(iv); clearTimeout(timeout); };
  }, []);

  return (
    <LinearGradient colors={[C.primary, C.primaryDark, C.dark]} style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Animated.View style={{ transform: [{ translateY: logoY }, { scale: logoS }], opacity }}>
        <Ionicons name="shield-checkmark" size={80} color={C.white} />
      </Animated.View>
      <Text style={styles.name}>SubBridge</Text>
      <Text style={styles.tagline}>Bills made simple</Text>
      <View style={styles.progressWrap}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  name: { fontSize: F.h1, fontWeight: "800", color: C.white, marginTop: S.base },
  tagline: { fontSize: F.md, color: "rgba(255,255,255,0.7)", marginTop: S.xs },
  progressWrap: {
    width: 160, height: 4, backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2, marginTop: S.xl, overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: C.white, borderRadius: 2 },
});
