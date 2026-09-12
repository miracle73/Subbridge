import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import { AuthToken, SecurePin } from "../../utils/storage";
import PinDots from "../../components/PinDots";
import PinPad from "../../components/PinPad";
import api from "../../services/api";

export default function PinSignInScreen({ navigation }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const handleKey = (k) => {
    if (k === "del") { setPin((p) => p.slice(0, -1)); setError(""); return; }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) verifyPin(next);
  };

  const verifyPin = async (value) => {
    setLoading(true);
    setError("");
    console.log("[PinSignIn] Verifying PIN...");

    try {
      const phone = await SecurePin.getPhone();
      console.log("[PinSignIn] Phone:", phone);
      if (!phone) {
        setError("No phone found. Please sign in with password.");
        setLoading(false);
        return;
      }

      const result = await api.signInWithPin(phone, value);
      console.log("[PinSignIn] Result:", result.success, result.message);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const user = result.data?.user;
        const name = user?.firstName || user?.firstname || user?.lastName || user?.lastname
          ? `${user.firstName || user.firstname || ""} ${user.lastName || user.lastname || ""}`.trim()
          : null;
        if (name) await SecurePin.setName(name);
        if (user?.has_pin === false) {
          navigation.replace("SetupPin", { phone });
        } else {
          navigation.replace("Home");
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(result.message || "Incorrect PIN");
        setPin("");
        setLoading(false);
        Animated.sequence([
          Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: true }),
          Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 6, duration: 55, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
        ]).start();
      }
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={22} color={C.text} />
      </TouchableOpacity>

      <View style={styles.center}>
        <Ionicons name="finger-print" size={48} color={C.primary} />
        <Text style={styles.title}>Enter your PIN</Text>

        <Animated.View style={{ transform: [{ translateX: shake }] }}>
          <PinDots length={4} filled={pin.length} />
        </Animated.View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <PinPad onPress={handleKey} />

      <TouchableOpacity style={styles.forgot} onPress={() => navigation.navigate("ForgotPassword")}>
        <Text style={styles.forgotText}>Forgot PIN?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white, paddingTop: 60 },
  back: { paddingHorizontal: S.xl },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: S.xl },
  title: { fontSize: F.h3, fontWeight: "800", color: C.text, marginTop: S.base, marginBottom: S.lg },
  error: { fontSize: F.sm, color: C.debit, marginTop: S.md },
  forgot: { alignItems: "center", paddingVertical: S.base, marginBottom: S.xl },
  forgotText: { fontSize: F.md, color: C.primary, fontWeight: "600" },
});
