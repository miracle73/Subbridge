import AuthBackground, { withAuthStyles } from "../../components/AuthBackground";
import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import { SecurePin } from "../../utils/storage";
import PinDots from "../../components/PinDots";
import PinPad from "../../components/PinPad";
import api from "../../services/api";

export default function SetupPinScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const shakeAnim = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const handleKey = (k) => {
    if (k === "del") {
      if (step === 1) setNewPin((p) => p.slice(0, -1));
      else setConfirmPin((p) => p.slice(0, -1));
      setError("");
      return;
    }
    const current = step === 1 ? newPin : confirmPin;
    const setCurrent = step === 1 ? setNewPin : setConfirmPin;
    if (current.length >= 4) return;
    const next = current + k;
    setCurrent(next);
    if (next.length === 4) {
      if (step === 1) {
        setTimeout(() => setStep(2), 300);
      } else if (next !== newPin) {
        setError("PINs do not match. Try again.");
        setConfirmPin("");
        shakeAnim();
      } else {
        submitPin(next);
      }
    }
  };

  const submitPin = async (pinValue) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await api.setupPin(pinValue);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const phone = route.params?.phone || (await SecurePin.getPhone()) || "";
        await SecurePin.save(pinValue, phone);
        navigation.replace("Home");
      } else {
        setError(res.message || "Failed to set PIN. Please try again.");
        setConfirmPin("");
        setStep(1);
        setNewPin("");
        shakeAnim();
      }
    } catch (err) {
      setError("Network error. Please try again.");
      setConfirmPin("");
      shakeAnim();
    } finally {
      setSubmitting(false);
    }
  };

  const pinValue = step === 1 ? newPin : confirmPin;

  // Figma "Create PIN — Step 2": blue top with step + title, white sheet with 4 boxes and keypad.
  return (
    <View style={fig.container}>
      <StatusBar barStyle="light-content" />
      <View style={[fig.top, { paddingTop: insets.top + 24 }]}>
        <AuthBackground />
        <Text style={fig.step}>Step 2 of 2</Text>
        <Text style={fig.title}>Set your transaction PIN</Text>
        <Text style={fig.sub}>4 digits to approve every payment</Text>
      </View>

      <View style={fig.sheet}>
        <Text style={fig.prompt}>{step === 1 ? "Enter PIN" : "Confirm PIN"}</Text>
        <Animated.View style={[fig.boxes, { transform: [{ translateX: shake }] }]}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[fig.box, i < pinValue.length && fig.boxOn]}>
              {i < pinValue.length ? <View style={fig.dot} /> : null}
            </View>
          ))}
        </Animated.View>
        <Text style={fig.hint}>{step === 1 ? "Confirm PIN next →" : "Re-enter the same 4 digits"}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {submitting ? <Text style={styles.busy}>Setting up PIN...</Text> : null}
        <View style={{ flex: 1 }} />
        <View style={{ paddingBottom: insets.bottom + 24 }}>
          <PinPad onPress={handleKey} />
        </View>
      </View>
    </View>
  );
}

const fig = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white },
  top: { paddingHorizontal: 24, paddingBottom: 72, overflow: "hidden" },
  step: { fontSize: 13, fontWeight: "800", color: C.gold },
  title: { fontSize: 26, fontWeight: "900", color: C.white, marginTop: 8 },
  sub: { fontSize: 15, color: C.onPrimaryMuted, marginTop: 8 },
  sheet: { flex: 1, backgroundColor: C.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -40, alignItems: "center", paddingTop: 30 },
  prompt: { fontSize: 15, fontWeight: "600", color: C.textMuted },
  boxes: { flexDirection: "row", gap: 14, marginTop: 24 },
  box: { width: 48, height: 56, borderRadius: 16, backgroundColor: "#F1F3FA", alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: C.primary + "1A" },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.primary },
  hint: { fontSize: 13, fontWeight: "500", color: C.textMuted, marginTop: 16 },
});

const styles = withAuthStyles(StyleSheet.create({
  container: { flex: 1, backgroundColor: C.primary },
  header: { alignItems: "center", paddingTop: S.xl, paddingHorizontal: S.xl },
  title: { fontSize: F.h2, fontWeight: "800", color: C.white, marginTop: S.base },
  subtitle: {
    fontSize: F.md, color: "rgba(255,255,255,0.75)",
    marginTop: S.xs, textAlign: "center", lineHeight: 22,
  },
  stepLabel: { fontSize: F.sm, color: "rgba(255,255,255,0.6)", marginTop: S.sm, fontWeight: "600" },
  body: { flex: 1, justifyContent: "center", alignItems: "center" },
  dotsCard: {
    backgroundColor: C.white, borderRadius: R.lg,
    paddingHorizontal: S.xl, paddingVertical: S.sm,
  },
  error: { fontSize: F.sm, color: "#FFD4D4", marginTop: S.md },
  busy: { fontSize: F.sm, color: "rgba(255,255,255,0.7)", marginTop: S.md },
}));
