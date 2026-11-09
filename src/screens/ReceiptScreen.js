import React, { useRef, useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, StatusBar, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { C, F, R, S } from "../utils/theme";
import { fmt, formatTime } from "../utils/format";
import { mergeTransactionData } from "../utils/mergeTransactions";
import Toast from "../components/Toast";
import api from "../services/api";

const TX_ICONS = {
  airtime: "phone-portrait-outline", data: "wifi-outline", cable: "tv-outline",
  electricity: "flash-outline", fund: "wallet-outline", transfer: "swap-horizontal-outline",
};

// Different providers/endpoints name the prepaid token differently.
const TOKEN_KEYS = [
  "token", "electricityToken", "electricity_token", "meterToken", "meter_token",
  "tokenValue", "token_value", "unitsToken", "units_token",
];

const getElectricityToken = (tx) => {
  for (const key of TOKEN_KEYS) {
    const value = tx?.[key];
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text && text.toLowerCase() !== "null" && text.toLowerCase() !== "none") return text;
  }
  return "";
};

export default function ReceiptScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const receiptRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [mergedTx, setMergedTx] = useState(null);
  const tx = route.params?.tx;

  useEffect(() => {
    if (tx) {
      // Merge transaction data to enrich with size info
      const enrichTx = async () => {
        const enriched = await mergeTransactionData(tx, api);
        setMergedTx(enriched);
      };
      enrichTx();
    }
  }, [tx]);

  if (!tx || !mergedTx) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Receipt</Text>
          <View style={{ width: 22 }} />
        </LinearGradient>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No transaction data</Text>
        </View>
      </View>
    );
  }

  const isDebit = mergedTx.type === "debit";

  let displayDesc = mergedTx.description || "";
  if (mergedTx.category && displayDesc && !displayDesc.toLowerCase().startsWith(mergedTx.category.toLowerCase())) {
    displayDesc = mergedTx.category + " - " + displayDesc.replace(/^[\s-]+/, "");
  } else if (mergedTx.category && !displayDesc) {
    displayDesc = mergedTx.category;
  }
  const displayLabel = mergedTx.label || mergedTx.category || "Transaction";

  // Trust the API status field, not the HTTP code (HTTP 200 can carry status: failed)
  const statusLower = String(mergedTx.status || "").toLowerCase();
  const isFailed = statusLower === "failed";
  const isPending = statusLower === "pending";
  const statusText = isFailed ? "FAILED" : isPending ? "PENDING" : "SUCCESSFUL";
  const statusColor = isFailed ? C.debit : isPending ? "#F59E0B" : C.accent;
  const statusIcon = isFailed ? "close" : isPending ? "time-outline" : "checkmark";

  const isElectricity = String(mergedTx.category || mergedTx.label || "").toLowerCase().includes("electric");
  const electricityToken = isElectricity ? getElectricityToken(mergedTx) : "";

  const copyToken = async () => {
    if (!electricityToken) return;
    await Clipboard.setStringAsync(electricityToken);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setToastMsg("Electricity token copied");
  };

  // History already provides formatted date/time strings — use them verbatim
  // so the receipt matches the transaction list exactly
  const displayDate = mergedTx.date || "";
  const displayTime = mergedTx.time || formatTime(mergedTx.date || mergedTx.createdAt);
  const displayDateTime = displayDate && displayTime ? `${displayDate} · ${displayTime}` : displayDate || displayTime;

  const buildHtml = () => `
    <html>
      <body style="font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 28px; color:#1A1D2E;">
        <div style="text-align:center; margin-bottom:20px;">
          <div style="font-size:22px; font-weight:800; color:#1A3CE8;">SubBridge</div>
          <div style="font-size:12px; color:#8A8FA8; margin-top:2px;">Transaction Receipt</div>
        </div>          <div style="text-align:center; margin-bottom:20px;">
            <div style="font-size:12px; color:#8A8FA8;">${isDebit ? "Amount Sent" : "Amount Received"}</div>
            <div style="font-size:28px; font-weight:800; color:${isDebit ? "#FF4757" : "#00C896"}; margin-top:2px;">
              ${isDebit ? "-" : "+"} ${fmt(mergedTx.amount)}
            </div>
            <div style="display:inline-block; margin-top:8px; padding:4px 14px; border-radius:20px; background:${statusColor}1A; color:${statusColor}; font-size:11px; font-weight:700;">
              ${statusText}
            </div>
            ${isElectricity && !isFailed ? `
            <div style="margin-top:12px; font-size:11px; color:#8A8FA8;">Electricity Token</div>
            <div style="font-size:16px; font-weight:800; letter-spacing:1px; margin-top:2px;">${electricityToken || "Token unavailable at the moment"}</div>` : ''}
          </div>
        <table style="width:100%; border-collapse:collapse;">
          ${mergedTx.api_response ? `
          <tr style="border-top:1px solid #E8EAF2;">
            <td style="padding:9px 0; color:#8A8FA8; font-size:12px;">API Response</td>
            <td style="padding:9px 0; text-align:right; font-weight:700; font-size:12px;">${mergedTx.api_response}</td>
          </tr>` : ''}
          <tr style="border-top:1px solid #E8EAF2;">
            <td style="padding:9px 0; color:#8A8FA8; font-size:12px;">Category</td>
            <td style="padding:9px 0; text-align:right; font-weight:700; font-size:12px;">${displayLabel}</td>
          </tr>
          <tr style="border-top:1px solid #E8EAF2;">
            <td style="padding:9px 0; color:#8A8FA8; font-size:12px;">Description</td>
            <td style="padding:9px 0; text-align:right; font-weight:700; font-size:12px;">${displayDesc}</td>
          </tr>
          ${mergedTx.size ? `
          <tr style="border-top:1px solid #E8EAF2;">
            <td style="padding:9px 0; color:#8A8FA8; font-size:12px;">Data Size</td>
            <td style="padding:9px 0; text-align:right; font-weight:700; font-size:12px;">${mergedTx.size}</td>
          </tr>` : ''}
          <tr style="border-top:1px solid #E8EAF2;">
            <td style="padding:9px 0; color:#8A8FA8; font-size:12px;">Date & Time</td>
            <td style="padding:9px 0; text-align:right; font-weight:700; font-size:12px;">${displayDateTime}</td>
          </tr>
          <tr style="border-top:1px solid #E8EAF2;">
            <td style="padding:9px 0; color:#8A8FA8; font-size:12px;">Reference</td>
            <td style="padding:9px 0; text-align:right; font-weight:700; font-size:12px;">${mergedTx.reference}</td>
          </tr>
        </table>
        <div style="text-align:center; margin-top:28px; font-size:10px; color:#B0B5CC;">
          Generated by SubBridge · ${new Date().toLocaleString("en-US")}
        </div>
      </body>
    </html>
  `;

  const shareAsPdf = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: buildHtml() });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Share Receipt (PDF)" });
      }
    } catch (e) {}
    setBusy(false);
  };

  const shareAsImage = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const uri = await captureRef(receiptRef, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share Receipt (Image)" });
      }
    } catch (e) {}
    setBusy(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Toast message={toastMsg} type="success" onHide={() => setToastMsg("")} />
      <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receipt</Text>
        <View style={{ width: 22 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View ref={receiptRef} collapsable={false} style={styles.receiptCard}>
          <View style={styles.brandRow}>
            <Image source={require("../assets/logo.jpg")} style={styles.brandLogo} resizeMode="contain" />
            <Text style={styles.brandText}>SubBridge</Text>
          </View>

          <View style={[styles.statusIcon, { backgroundColor: statusColor + "1A" }]}>
            <Ionicons name={statusIcon} size={28} color={statusColor} />
          </View>

          <Text style={styles.amountLabel}>{isDebit ? "Amount Sent" : "Amount Received"}</Text>
          <Text style={[styles.amountVal, { color: isDebit ? C.debit : C.accent }]}>
            {isDebit ? "-" : "+"} {fmt(mergedTx.amount)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "1A" }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
          </View>

          {/* No token box on failed payments — there is no token to show. */}
          {isElectricity && !isFailed ? (
            <View style={styles.tokenBox}>
              <Text style={styles.tokenLabel}>Electricity Token</Text>
              {electricityToken ? (
                <>
                  <Text style={styles.tokenValue} selectable>{electricityToken}</Text>
                  <TouchableOpacity style={styles.tokenCopyBtn} onPress={copyToken} activeOpacity={0.75}>
                    <Ionicons name="copy-outline" size={14} color={C.white} />
                    <Text style={styles.tokenCopyText}>Copy Token</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.tokenUnavailable}>Token unavailable at the moment</Text>
              )}
            </View>
          ) : null}

          <View style={styles.divider} />

          {mergedTx.api_response && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>API Response</Text>
              <Text style={[styles.rowValue, { flex: 1, textAlign: 'right' }]}>
                {mergedTx.api_response}
              </Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Category</Text>
            <Text style={styles.rowValue}>{displayLabel}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Description</Text>
            <Text style={styles.rowValue}>{displayDesc}</Text>
          </View>
          {mergedTx.size && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Data Size</Text>
              <Text style={styles.rowValue}>{mergedTx.size}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Date & Time</Text>
            <Text style={styles.rowValue}>{displayDateTime}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Reference</Text>
            <Text style={styles.rowValue}>{mergedTx.reference}</Text>
          </View>

          <Text style={styles.footer}>Thank you for using SubBridge</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={shareAsPdf} disabled={busy}>
            {busy ? <ActivityIndicator size="small" color={C.primary} /> : <Ionicons name="document-text-outline" size={18} color={C.primary} />}
            <Text style={styles.actionBtnText}>Share PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={shareAsImage} disabled={busy}>
            {busy ? <ActivityIndicator size="small" color={C.primary} /> : <Ionicons name="image-outline" size={18} color={C.primary} />}
            <Text style={styles.actionBtnText}>Share Image</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: S.xl, paddingVertical: S.base },
  headerTitle: { fontSize: F.lg, fontWeight: "800", color: C.white },
  scroll: { padding: S.xl, paddingBottom: 40 },

  receiptCard: { backgroundColor: C.white, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, padding: S.lg, alignItems: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: S.xl },
  brandLogo: { width: 30, height: 30, borderRadius: 8 },
  brandText: { fontSize: F.lg, fontWeight: "800", color: C.primary },

  statusIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: S.base },
  amountLabel: { fontSize: 12, color: C.textMuted, fontWeight: "500" },
  amountVal: { fontSize: 28, fontWeight: "900", letterSpacing: -1, marginTop: 4 },
  statusBadge: { marginTop: S.sm, paddingHorizontal: 14, paddingVertical: 5, borderRadius: R.full },
  statusText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },

  tokenBox: {
    width: "100%", alignItems: "center", marginTop: S.base,
    backgroundColor: C.primaryLight, borderRadius: R.sm, padding: S.md,
  },
  tokenLabel: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  tokenValue: {
    fontSize: F.lg, fontWeight: "900", color: C.text,
    letterSpacing: 1.5, marginTop: 2, textAlign: "center",
  },
  tokenCopyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.primary, borderRadius: R.full,
    paddingHorizontal: S.base, paddingVertical: 8, marginTop: S.sm,
  },
  tokenCopyText: { fontSize: F.sm, fontWeight: "800", color: C.white },
  tokenUnavailable: { fontSize: F.sm, fontWeight: "600", color: C.textMuted, marginTop: 4, textAlign: "center" },

  divider: { height: 1, backgroundColor: C.border, width: "100%", marginVertical: S.base },

  row: { flexDirection: "row", justifyContent: "space-between", width: "100%", paddingVertical: 10, borderTopWidth: 1, borderColor: C.border },
  rowLabel: { fontSize: 13, color: C.textMuted },
  rowValue: { fontSize: 13, fontWeight: "700", color: C.text, flexShrink: 1, textAlign: "right" },

  footer: { marginTop: S.base, fontSize: 11, color: C.textLight, fontWeight: "600" },

  actionsRow: { flexDirection: "row", gap: 10, marginTop: S.xl },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: R.sm, paddingVertical: 14,
  },
  actionBtnText: { fontSize: 13, fontWeight: "700", color: C.primary },

  emptyWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: F.md, color: C.textMuted },
});
