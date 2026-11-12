import { withPayStyles } from "../../components/payStyles";
import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, S } from "../../utils/theme";
import api from "../../services/api";
import Preloader from "../../components/Preloader";

export default function SupportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [support, setSupport] = useState(null);

  const fetchSupport = useCallback(async () => {
    setLoading(true);
    console.log("[Support] Fetching...");
    try {
      const res = await api.getSupportInfo();
      console.log("[Support] Result:", res.success, res.data ? Object.keys(res.data) : "null");
      if (res.success && res.data) setSupport(res.data);
    } catch (err) {
      console.error("[Support] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSupport();
  }, [fetchSupport]);

  const openLink = (url) => Linking.openURL(url).catch(() => {});

  if (loading) return <Preloader />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={[styles.header]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 160 }]}>
        <Text style={styles.sectionTitle}>Contact Us</Text>

        <TouchableOpacity style={styles.contactCard} onPress={() => openLink(`https://wa.me/${support?.whatsapp}`)}>
          <View style={[styles.contactIcon, { backgroundColor: "#25D366" + "15" }]}>
            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>WhatsApp</Text>
            <Text style={styles.contactValue}>Chat with us</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactCard} onPress={() => openLink(`mailto:${support?.email}`)}>
          <View style={[styles.contactIcon, { backgroundColor: C.primary + "15" }]}>
            <Ionicons name="mail-outline" size={24} color={C.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactValue}>{support?.email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactCard} onPress={() => openLink(`tel:${support?.phone}`)}>
          <View style={[styles.contactIcon, { backgroundColor: C.accent + "15" }]}>
            <Ionicons name="call-outline" size={24} color={C.accent} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Phone</Text>
            <Text style={styles.contactValue}>{support?.phone}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.textLight} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: S.xl }]}>FAQs</Text>
        {(support?.faq || support?.faqs || []).map((faq, i) => (
          <View key={i} style={styles.faqCard}>
            <Text style={styles.faqQ}>{faq.question || faq.q}</Text>
            <Text style={styles.faqA}>{faq.answer || faq.a}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = withPayStyles(StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: S.xl, paddingVertical: S.base },
  headerTitle: { fontSize: F.lg, fontWeight: "800", color: C.white },
  scroll: { padding: S.xl },
  sectionTitle: { fontSize: F.lg, fontWeight: "800", color: C.text, marginBottom: S.md },

  contactCard: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    backgroundColor: C.white, borderRadius: R.sm, padding: S.base,
    marginBottom: S.sm, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  contactIcon: { width: 44, height: 44, borderRadius: R.sm, justifyContent: "center", alignItems: "center" },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: F.md, fontWeight: "700", color: C.text },
  contactValue: { fontSize: F.sm, color: C.textMuted, marginTop: 2 },

  faqCard: { backgroundColor: C.white, borderRadius: R.sm, padding: S.base, marginBottom: S.sm },
  faqQ: { fontSize: F.md, fontWeight: "700", color: C.text, marginBottom: S.xs },
  faqA: { fontSize: F.sm, color: C.textMuted, lineHeight: 20 },
}));
