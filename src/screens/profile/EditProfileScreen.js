import { withPayStyles } from "../../components/payStyles";
import React, { useState, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, S } from "../../utils/theme";
import api from "../../services/api";
import Preloader from "../../components/Preloader";

export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    console.log("[EditProfile] Fetching...");
    try {
      const res = await api.getUserProfile();
      console.log("[EditProfile] Result:", res.success, res.data ? Object.keys(res.data) : "null");
      if (res.success && res.data) {
        const u = res.data.user || res.data;
        const firstName = u.firstName || u.firstname || "";
        const lastName = u.lastName || u.lastname || "";
        console.log("[EditProfile] User:", firstName, lastName, u.email);
        setFirstName(firstName);
        setLastName(lastName);
        setEmail(u.email || "");
        setPhone(u.phone || "");
      }
    } catch (err) {
      console.error("[EditProfile] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    console.log("[EditProfile] Saving:", firstName, lastName, email);
    try {
      const res = await api.updateUserData({
        firstName,
        lastName,
        email,
      });
      console.log("[EditProfile] Save result:", res.success, res.message);
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        Alert.alert("Error", res.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Preloader />;

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const field = (label, value, onChange, locked, keyboardType) => (
    <View style={{ marginTop: 18 }}>
      <Text style={ep.label}>{label}</Text>
      <View style={ep.field}>
        <TextInput style={[ep.input, locked && { color: C.textMuted }]} value={value} onChangeText={onChange} editable={!locked} keyboardType={keyboardType} autoCapitalize={keyboardType ? "none" : "words"} />
        {locked ? <Text style={{ fontSize: 14 }}>🔒</Text> : null}
      </View>
    </View>
  );

  // Design "Edit Profile": avatar with camera badge, four fields (phone + email locked), Save changes.
  return (
    <View style={[ep.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={ep.header}>
        <TouchableOpacity style={ep.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={ep.title}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <View style={ep.avatarWrap}>
          <View style={ep.avatar}><Text style={ep.avatarText}>{initials || "?"}</Text></View>
          <View style={ep.camera}><Text style={{ fontSize: 13 }}>📷</Text></View>
        </View>

        {field("First name", firstName, setFirstName)}
        {field("Last name", lastName, setLastName)}
        {field("Phone number", phone, setPhone, true, "phone-pad")}
        {field("Email", email, setEmail, true, "email-address")}
        <Text style={ep.note}>🔒 Phone & email are verified — contact support to change.</Text>
        {saved ? <Text style={ep.saved}>Profile updated!</Text> : null}
      </ScrollView>

      <View style={[ep.bar, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity style={[ep.btn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          <Text style={ep.btnText}>{saving ? "Saving..." : "Save changes"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const epShadow = { shadowColor: "#1A2680", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 2 };
const ep = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: "center", justifyContent: "center", ...epShadow },
  title: { fontSize: 18, fontWeight: "800", color: C.text },
  avatarWrap: { alignSelf: "center", marginTop: 12 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.primary + "1F", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 28, fontWeight: "900", color: C.primary },
  camera: { position: "absolute", right: 0, bottom: 4, width: 30, height: 30, borderRadius: 15, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.bg },
  label: { fontSize: 13, fontWeight: "600", color: C.textMuted, marginBottom: 8 },
  field: { flexDirection: "row", alignItems: "center", backgroundColor: C.white, borderRadius: 16, height: 54, paddingHorizontal: 20, ...epShadow },
  input: { flex: 1, fontSize: 15, fontWeight: "600", color: C.text },
  note: { fontSize: 12, fontWeight: "500", color: C.textMuted, marginTop: 14 },
  saved: { fontSize: 13, fontWeight: "700", color: C.credit, marginTop: 12 },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 12, backgroundColor: C.bg },
  btn: { backgroundColor: C.primary, borderRadius: 18, height: 56, alignItems: "center", justifyContent: "center", shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4 },
  btnText: { fontSize: 16, fontWeight: "800", color: C.white },
});

const styles = withPayStyles(StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: S.xl, paddingVertical: S.base },
  headerTitle: { fontSize: F.lg, fontWeight: "800", color: C.white },
  scroll: { padding: S.xl },
  avatarSection: { alignItems: "center", paddingVertical: S.xl },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: C.primaryLight,
    justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: C.primary,
  },
  avatarText: { fontSize: F.h2, fontWeight: "800", color: C.primary },
  changePhoto: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: S.md },
  changePhotoText: { fontSize: F.sm, color: C.primary, fontWeight: "600" },
  label: { fontSize: F.sm, fontWeight: "600", color: C.text, marginBottom: 6, marginTop: S.md },
  input: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
    borderRadius: R.sm, paddingHorizontal: S.base, paddingVertical: S.md + 2,
    fontSize: F.base, color: C.text,
  },
  saved: { fontSize: F.sm, color: C.accent, textAlign: "center", marginTop: S.base },
  btn: {
    backgroundColor: C.primary, borderRadius: R.sm, paddingVertical: S.md + 2,
    alignItems: "center", marginTop: S.xl,
  },
  btnText: { color: C.white, fontSize: F.lg, fontWeight: "700" },
}));
