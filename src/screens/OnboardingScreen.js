import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions, StatusBar } from "react-native";
import * as Haptics from "expo-haptics";
import { C, S } from "../utils/theme";
import { OnboardingFlag } from "../utils/storage";
import AuthBackground from "../components/AuthBackground";

const { width: W } = Dimensions.get("window");

// Figma onboarding: floating service bubbles, headline, page dots, Get Started.
const PAGES = [
  {
    bubbles: [["📱", 0.38, 0, 90, "#FFFFFF"], ["⚡", 0.1, 120, 64, "#FFB020"], ["📺", 0.66, 110, 70, "#FFFFFF"], ["📶", 0.42, 200, 60, "#FFB020"]],
    title: "Airtime, data, TV & power — in one tap",
    desc: "Fast, secure and rewarding. Earn cashback on every recharge.",
  },
  {
    bubbles: [["💸", 0.36, 10, 96, "#FFB020"], ["🏦", 0.1, 150, 64, "#FFFFFF"], ["⚡", 0.68, 140, 66, "#FFFFFF"]],
    title: "Fund your wallet instantly",
    desc: "Transfer to your SubBridge account and your balance updates in seconds.",
  },
  {
    bubbles: [["🎁", 0.38, 0, 92, "#FFFFFF"], ["🤝", 0.1, 130, 66, "#FFB020"], ["🏆", 0.66, 120, 70, "#FFB020"]],
    title: "Invite friends, earn rewards",
    desc: "Share your code and earn commission when friends pay bills.",
  },
];

export default function OnboardingScreen({ navigation }) {
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);

  const finish = async () => {
    await OnboardingFlag.set();
    navigation.replace("Auth");
  };

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (index < PAGES.length - 1) listRef.current?.scrollToIndex({ index: index + 1 });
    else finish();
  };

  return (
    <View style={styles.container}>
      <AuthBackground />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <TouchableOpacity style={styles.skip} onPress={finish}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
        renderItem={({ item }) => (
          <View style={{ width: W, paddingHorizontal: S.xl }}>
            <View style={styles.art}>
              <View style={[styles.halo, { width: 310, height: 310 }]} />
              <View style={[styles.halo, { width: 230, height: 230, backgroundColor: "rgba(255,255,255,0.1)" }]} />
              {item.bubbles.map(([e, x, y, size, bg]) => (
                <View key={e + x} style={[styles.bubble, { left: (W - S.xl * 2) * x, top: 40 + y, width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
                  <Text style={{ fontSize: size * 0.46 }}>{e}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {PAGES.map((_, i) => <View key={i} style={[styles.dot, i === index && styles.dotOn]} />)}
      </View>
      <TouchableOpacity style={styles.btn} onPress={next} activeOpacity={0.85}>
        <Text style={styles.btnText}>{index === PAGES.length - 1 ? "Get Started" : "Next"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.primary, paddingBottom: 40 },
  skip: { position: "absolute", top: 56, right: S.xl, zIndex: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)" },
  skipText: { color: C.white, fontWeight: "800", fontSize: 13 },
  art: { height: 380, marginTop: 90, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" },
  bubble: { position: "absolute", alignItems: "center", justifyContent: "center", shadowColor: "#050A24", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 6 },
  title: { fontSize: 28, fontWeight: "900", color: C.white, textAlign: "center", marginTop: S.lg },
  desc: { fontSize: 15, color: C.onPrimaryMuted, textAlign: "center", lineHeight: 22, marginTop: S.md, paddingHorizontal: S.base },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: S.xl },
  dot: { width: 10, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.3)" },
  dotOn: { width: 30, backgroundColor: C.gold },
  btn: { marginHorizontal: S.xl, backgroundColor: C.white, borderRadius: 18, paddingVertical: 17, alignItems: "center" },
  btnText: { fontSize: 16, fontWeight: "800", color: C.primary },
});
