import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  FlatList, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import { C, F, R, S } from "../utils/theme";

// Normalizes a raw contact number to Nigerian local format (0XXXXXXXXXX)
export function normalizeNGNumber(raw) {
  if (!raw) return "";
  let d = String(raw).replace(/\D/g, "");
  if (d.startsWith("234") && d.length === 13) d = "0" + d.slice(3);
  else if (d.length === 10) d = "0" + d;
  return d;
}

export default function ContactPicker({ visible, onClose, onSelect }) {
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setDenied(false);
    (async () => {
      try {
        setLoading(true);
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== "granted") {
          setDenied(true);
          return;
        }
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        });
        const rows = [];
        (data || []).forEach((c) => {
          const name = c.name || "Unknown";
          (c.phoneNumbers || []).forEach((p, i) => {
            const normalized = normalizeNGNumber(p.number);
            if (!normalized) return;
            rows.push({
              key: `${c.id}-${i}`,
              name,
              number: normalized,
              raw: p.number,
              label: p.label || "mobile",
            });
          });
        });
        rows.sort((a, b) => a.name.localeCompare(b.name));
        setContacts(rows);
      } catch (e) {
        setDenied(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? contacts.filter(
        (c) => c.name.toLowerCase().includes(q) || c.number.includes(q.replace(/\D/g, ""))
      )
    : contacts;

  const pick = (item) => {
    onSelect && onSelect(item.number, item.name);
    onClose && onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Choose Contact</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={C.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search name or number"
              placeholderTextColor={C.textLight}
            />
          </View>

          <Text style={styles.sectionLabel}>Recent beneficiaries</Text>
          <Text style={styles.emptyNote}>No recent beneficiaries</Text>

          <Text style={styles.sectionLabel}>Phone contacts</Text>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={styles.loadingText}>Loading contacts...</Text>
            </View>
          ) : denied ? (
            <View style={styles.center}>
              <Ionicons name="person-circle-outline" size={48} color={C.textLight} />
              <Text style={styles.emptyNote}>Contacts permission denied. Enable it in settings to pick a number.</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.key}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              ListEmptyComponent={
                <Text style={styles.emptyNote}>
                  {contacts.length === 0 ? "No contacts with phone numbers found" : "No match found"}
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => pick(item)}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.number}>{item.number}</Text>
                  </View>
                  <Ionicons name="call-outline" size={18} color={C.primary} />
                </TouchableOpacity>
              )}
            />
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.white, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
    padding: S.xl, paddingTop: S.lg, maxHeight: "85%",
  },
  title: { fontSize: F.lg, fontWeight: "800", color: C.text, marginBottom: S.md },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
    borderRadius: R.sm, paddingHorizontal: S.base, marginBottom: S.md,
  },
  searchInput: { flex: 1, paddingVertical: S.md, fontSize: F.base, color: C.text },
  sectionLabel: { fontSize: F.sm, fontWeight: "700", color: C.primary, marginBottom: 4, marginTop: S.sm },
  emptyNote: { fontSize: 13, color: C.textMuted, textAlign: "center", paddingVertical: S.sm },
  list: { marginTop: S.xs },
  row: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    paddingVertical: S.sm, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.primaryLight,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: F.md, fontWeight: "800", color: C.primary },
  name: { fontSize: F.base, fontWeight: "600", color: C.text },
  number: { fontSize: F.sm, color: C.textMuted, marginTop: 1 },
  center: { alignItems: "center", paddingVertical: S.xl },
  loadingText: { fontSize: F.sm, color: C.textMuted, marginTop: S.sm },
  closeBtn: {
    borderWidth: 1, borderColor: C.border, borderRadius: R.sm,
    paddingVertical: S.md, alignItems: "center", marginTop: S.md,
  },
  closeText: { fontSize: F.md, fontWeight: "600", color: C.textMuted },
});
