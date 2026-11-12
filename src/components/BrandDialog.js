import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C } from "../utils/theme";

// Branded replacement for Alert.alert: same call shape,
// brandAlert(title, message, [{ text, style: "cancel" | "destructive", onPress }]).
let push = null;
export function brandAlert(title, message, buttons) {
  const list = buttons && buttons.length ? buttons : [{ text: "OK" }];
  if (push) push({ title, message, buttons: list });
}

const ICON = (title = "", buttons) => {
  const t = title.toLowerCase();
  if (buttons.some((b) => b.style === "destructive")) return ["⚠️", C.debit];
  if (/success|done|enabled|updated/.test(t)) return ["✓", C.credit];
  if (/error|fail/.test(t)) return ["!", C.debit];
  if (/biometric|fingerprint|face/.test(t)) return ["🫆", C.primary];
  return ["ℹ️", C.primary];
};

/** Mount once near the app root. */
export function BrandDialogHost() {
  const [d, setD] = useState(null);
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { push = (x) => setD(x); return () => { push = null; }; }, []);
  useEffect(() => {
    if (d) { v.setValue(0); Animated.timing(v, { toValue: 1, duration: 220, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start(); }
  }, [d]);
  if (!d) return null;
  const [icon, color] = ICON(d.title, d.buttons);
  const close = (b) => { setD(null); b?.onPress && setTimeout(b.onPress, 60); };
  const ordered = [...d.buttons].sort((a) => (a.style === "cancel" ? -1 : 1));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => close(d.buttons.find((b) => b.style === "cancel"))}>
      <View style={s.overlay}>
        <Animated.View style={[s.card, { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
          <View style={[s.halo, { backgroundColor: color + "1F" }]}>
            <View style={[s.badge, { backgroundColor: color }]}><Text style={s.badgeText}>{icon}</Text></View>
          </View>
          {d.title ? <Text style={s.title}>{d.title}</Text> : null}
          {d.message ? <Text style={s.msg}>{d.message}</Text> : null}
          <View style={[s.row, ordered.length > 2 && { flexDirection: "column" }]}>
            {ordered.map((b, i) => {
              const primary = b.style !== "cancel";
              const danger = b.style === "destructive";
              return primary ? (
                <TouchableOpacity key={i} style={s.flex} onPress={() => close(b)} activeOpacity={0.85}>
                  <LinearGradient colors={danger ? [C.debit, "#C9302C"] : [C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
                    <Text style={s.btnText}>{b.text}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity key={i} style={[s.flex, s.ghost]} onPress={() => close(b)} activeOpacity={0.85}>
                  <Text style={s.ghostText}>{b.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(5,10,36,0.6)", alignItems: "center", justifyContent: "center", padding: 28 },
  card: { width: "100%", maxWidth: 360, backgroundColor: C.white, borderRadius: 28, padding: 24, alignItems: "center", shadowColor: "#050A24", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 12 },
  halo: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  badge: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  badgeText: { fontSize: 22, fontWeight: "900", color: C.white },
  title: { fontSize: 20, fontWeight: "900", color: C.text, textAlign: "center" },
  msg: { fontSize: 14, color: C.textMuted, textAlign: "center", lineHeight: 21, marginTop: 8 },
  row: { flexDirection: "row", gap: 10, alignSelf: "stretch", marginTop: 22 },
  flex: { flex: 1 },
  btn: { height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 15, fontWeight: "800", color: C.white },
  ghost: { height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: C.primaryLight },
  ghostText: { fontSize: 15, fontWeight: "800", color: C.primary },
});
