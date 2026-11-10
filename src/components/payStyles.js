import { C } from "../utils/theme";

const shadow = { shadowColor: "#1A2680", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 18, elevation: 2 };

/** Figma payment-screen styling, layered over each service screen's own styles. */
const FIGMA = {
  container: { backgroundColor: C.bg },
  header: { backgroundColor: "transparent", paddingTop: 12, paddingBottom: 8 },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: "800" },
  label: { fontSize: 14, fontWeight: "800", color: C.text, marginTop: 20, marginBottom: 10 },
  comboRow: { backgroundColor: C.white, borderWidth: 0, borderRadius: 20, padding: 8, ...shadow },
  networkLogoBtn: { borderRadius: 16, borderWidth: 0, backgroundColor: C.primaryLight, width: 52, height: 52 },
  contactIconBtn: { borderRadius: 16, borderWidth: 0, backgroundColor: C.primaryLight, width: 52, height: 52 },
  phoneInput: { borderWidth: 0, backgroundColor: C.bg, borderRadius: 14, minHeight: 52, fontSize: 16, fontWeight: "600" },
  amountGrid: { gap: 10 },
  amountChip: { backgroundColor: C.white, borderWidth: 0, borderRadius: 16, minWidth: "30%", flexGrow: 1, paddingVertical: 15, ...shadow },
  amountChipActive: { backgroundColor: C.primary },
  amountChipText: { fontSize: 15, fontWeight: "800" },
  customAmountInput: { backgroundColor: C.white, borderWidth: 0, borderRadius: 16, minHeight: 56, fontSize: 16, marginTop: 12, ...shadow },
  balance: { fontWeight: "600" },
  btn: { borderRadius: 18, paddingVertical: 17, shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4 },
  btnInactive: { borderRadius: 18, borderWidth: 0, backgroundColor: "#E6E9F5", shadowOpacity: 0, elevation: 0 },
  btnText: { fontWeight: "800", fontSize: 16 },
  buyBar: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, ...shadow },
  modalSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: "75%", paddingBottom: 24 },
  modalOverlay: { backgroundColor: "rgba(5,10,36,0.55)" },
  modalItem: { borderRadius: 16 },
  confirmSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  confirmTitle: { fontSize: 22, fontWeight: "900" },
  confirmDetails: { backgroundColor: C.bg, borderRadius: 20, padding: 16 },
  confirmBtn: { borderRadius: 18, paddingVertical: 17 },
  confirmCancel: { borderRadius: 18, paddingVertical: 17 },
  successIconWrap: { backgroundColor: C.credit + "24", width: 96, height: 96, borderRadius: 48 },
  successTitle: { fontSize: 22, fontWeight: "900" },
  successAmount: { fontSize: 34, fontWeight: "900" },
  successDetails: { backgroundColor: C.white, borderRadius: 24, padding: 18, ...shadow },
  doneBtn: { borderRadius: 18, paddingVertical: 17 },
};

export function withPayStyles(styles) {
  Object.keys(FIGMA).forEach((k) => { if (styles[k]) styles[k] = [styles[k], FIGMA[k]]; });
  return styles;
}
