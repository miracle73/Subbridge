import React, { useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../utils/theme";
import { OnboardingFlag } from "../utils/storage";

const { width: W } = Dimensions.get("window");

const PAGES = [
  {
    icon: "wallet-outline",
    title: "Fund Your Wallet",
    desc: "Top up your wallet via bank transfer and enjoy instant payments.",
  },
  {
    icon: "phone-portrait-outline",
    title: "Buy Airtime & Data",
    desc: "Purchase airtime and data bundles for all networks at the best rates.",
  },
  {
    icon: "tv-outline",
    title: "Pay Bills Easily",
    desc: "Subscribe to cable TV, pay electricity bills, and more — all in one place.",
  },
];

export default function OnboardingScreen({ navigation }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatRef = useRef(null);

  const handleNext = (idx) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (idx < PAGES.length - 1) {
      flatRef.current?.scrollToIndex({ index: idx + 1 });
    } else {
      finish();
    }
  };

  const finish = async () => {
    await OnboardingFlag.set();
    navigation.replace("Auth");
  };

  return (
    <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.container}>
      <View style={styles.skipWrap}>
        <TouchableOpacity onPress={finish}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Animated.FlatList
        ref={flatRef}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        renderItem={({ item, index }) => (
          <View style={[styles.page, { width: W }]}>
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={80} color={C.white} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
            <TouchableOpacity style={styles.btn} onPress={() => handleNext(index)} activeOpacity={0.8}>
              <Text style={styles.btnText}>{index < PAGES.length - 1 ? "Next" : "Get Started"}</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={styles.dots}>
        {PAGES.map((_, i) => {
          const inputRange = [(i - 1) * W, i * W, (i + 1) * W];
          const dotW = scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: "clamp" });
          const dotOp = scrollX.interpolate({ inputRange, outputRange: [0.4, 1, 0.4], extrapolate: "clamp" });
          return <Animated.View key={i} style={[styles.dot, { width: dotW, opacity: dotOp }]} />;
        })}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipWrap: { alignItems: "flex-end", paddingTop: 60, paddingHorizontal: S.xl },
  skip: { color: "rgba(255,255,255,0.7)", fontSize: F.md, fontWeight: "600" },
  page: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: S.xl },
  iconWrap: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center", marginBottom: S.xxl,
  },
  title: { fontSize: F.h2, fontWeight: "800", color: C.white, textAlign: "center", marginBottom: S.md },
  desc: { fontSize: F.md, color: "rgba(255,255,255,0.75)", textAlign: "center", lineHeight: 22, marginBottom: S.xxl },
  btn: {
    backgroundColor: C.white, paddingHorizontal: S.xl, paddingVertical: S.md,
    borderRadius: R.sm, minWidth: 200, alignItems: "center",
  },
  btnText: { color: C.primary, fontSize: F.lg, fontWeight: "700" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, paddingBottom: 60 },
  dot: { height: 8, borderRadius: 4, backgroundColor: C.white },
});
