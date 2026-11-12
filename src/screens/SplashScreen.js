import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, StyleSheet, StatusBar, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C, F, S, W, H } from "../utils/theme";
import { AuthToken, OnboardingFlag, SecurePin } from "../utils/storage";

const LOGO = require("../assets/logo.jpg");

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
        navigation.replace("Home");
      } else if (onboardingDone) {
        navigation.replace("Auth");
      } else {
        navigation.replace("Onboarding");
      }
    }, 2500);

    return () => { clearInterval(iv); clearTimeout(timeout); };
  }, []);

  return (
    <LinearGradient colors={["#2A4BFF", C.primary, "#081257"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.blob, { width: 420, height: 420, top: -80, left: -120 }]} />
      <View style={[styles.blob, { width: 380, height: 380, bottom: -60, right: -120 }]} />
      <View style={[styles.blob, { width: 220, height: 220, backgroundColor: C.gold + "33" }]} />
      <Text style={[styles.spark, { top: "34%", left: "22%" }]}>✦</Text>
      <Text style={[styles.spark, { top: "36%", right: "20%", fontSize: 14 }]}>✦</Text>
      <Text style={[styles.spark, { top: "56%", right: "22%", fontSize: 24 }]}>✦</Text>
      <Animated.View style={{ transform: [{ translateY: logoY }, { scale: logoS }], opacity }}>
        <View style={styles.logo}><Text style={styles.logoS}>S</Text></View>
      </Animated.View>
      <Text style={styles.name}>SubBridge</Text>
      <Text style={styles.tagline}>Bills paid. Life sorted.</Text>
      <View style={styles.progressWrap}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  blob: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)" },
  spark: { position: "absolute", color: "#FFD36B", fontSize: 20, fontWeight: "800" },
  logo: { width: 104, height: 104, borderRadius: 30, backgroundColor: C.white, alignItems: "center", justifyContent: "center", shadowColor: "#FFB020", shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
  logoS: { fontSize: 54, fontWeight: "900", color: C.primary },
  name: { fontSize: F.h1, fontWeight: "800", color: C.white, marginTop: S.base },
  tagline: { fontSize: F.md, color: "rgba(255,255,255,0.7)", marginTop: S.xs },
  progressWrap: {
    width: 160, height: 4, backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2, marginTop: S.xl, overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: C.gold, borderRadius: 2 },
});
