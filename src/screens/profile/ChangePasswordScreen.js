import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C } from "../../utils/theme";
import api from "../../services/api";
import { ServiceHeader } from "../../components/ServiceUI";
import Toast from "../../components/Toast";

/** Figma "Change Password": current, new (5 digits) and confirm fields, then Update Password. */
export default function ChangePasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "error" });

  const digits = (t) => t.replace(/\D/g, "").slice(0, 7);
  const field = (label, value, onChange) => (
    <View style={{ marginTop: 18 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.field}>
        <TextInput style={s.input} value={value} onChangeText={(t) => onChange(digits(t))} placeholder="• • • • •" placeholderTextColor={C.textLight} keyboardType="number-pad" secureTextEntry={!show} maxLength={7} />
        <TouchableOpacity onPress={() => setShow((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color={C.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const update = async () => {
    if (current.length < 5) return setToast({ msg: "Enter your current password", type: "error" });
    if (!/^\d{5,7}$/.test(next)) return setToast({ msg: "New password must be 5 digits, numbers only", type: "error" });
    if (next !== confirm) return setToast({ msg: "Passwords do not match", type: "error" });
    setSaving(true);
    const res = await api.changePassword(current, next).catch(() => ({ success: false }));
    setSaving(false);
    if (!res?.success) return setToast({ msg: res?.message || "Could not update password", type: "error" });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setToast({ msg: "Password updated", type: "success" });
    setTimeout(() => navigation.goBack(), 1200);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <ServiceHeader title="Change Password" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 220 }} keyboardShouldPersistTaps="handled">
        <View style={s.icon}><Text style={{ fontSize: 32 }}>🔐</Text></View>
        {field("Current password", current, setCurrent)}
        {field("New password (5 digits)", next, setNext)}
        {field("Confirm new password", confirm, setConfirm)}
      </ScrollView>
      <View style={[s.bar, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity style={[s.btn, saving && { opacity: 0.6 }]} onPress={update} disabled={saving} activeOpacity={0.85}>
          <Text style={s.btnText}>{saving ? "Updating..." : "Update Password"}</Text>
        </TouchableOpacity>
      </View>
      <Toast message={toast.msg} type={toast.type} onHide={() => setToast({ msg: "", type: "error" })} />
    </View>
  );
}

const shadow = { shadowColor: "#1A2680", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 2 };
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  icon: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.primary + "1A", alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 12 },
  label: { fontSize: 13, fontWeight: "600", color: C.textMuted, marginBottom: 8 },
  field: { flexDirection: "row", alignItems: "center", backgroundColor: C.white, borderRadius: 16, height: 54, paddingHorizontal: 20, ...shadow },
  input: { flex: 1, fontSize: 16, fontWeight: "600", color: C.text, letterSpacing: 2 },
  hint: { fontSize: 12, fontWeight: "500", color: C.textMuted, marginTop: 14 },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 12, backgroundColor: C.bg },
  btn: { backgroundColor: C.primary, borderRadius: 18, height: 56, alignItems: "center", justifyContent: "center", shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4 },
  btnText: { fontSize: 16, fontWeight: "800", color: C.white },
});
