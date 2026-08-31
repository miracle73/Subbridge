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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 22 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName?.charAt(0)}{lastName?.charAt(0)}</Text>
          </View>
          <TouchableOpacity style={styles.changePhoto}>
            <Ionicons name="camera-outline" size={16} color={C.primary} />
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>First Name</Text>
        <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />

        <Text style={styles.label}>Last Name</Text>
        <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={[styles.input, { color: C.textMuted }]} value={phone} editable={false} />

        {saved && <Text style={styles.saved}>Profile updated!</Text>}

        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.btnText}>{saving ? "Saving..." : "Save Changes"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
