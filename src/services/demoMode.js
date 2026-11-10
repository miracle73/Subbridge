// DEMO MODE — lets every screen move to the next one before the real APIs are wired up.
// Flip DEMO_MODE to false when integrating the backend.
export const DEMO_MODE = true;

const DEMO_USER = {
  id: 1,
  firstName: "Godwin",
  lastName: "Chidiebere",
  firstname: "Godwin",
  lastname: "Chidiebere",
  phone: "08114516826",
  email: "godwieberex124@gmail.com",
  has_pin: true,
  virtualAccount: { bankName: "PalmPay", accountNumber: "6698922282", accountName: "SubBridge – Godwin C." },
};

const NETWORKS = [{ id: "mtn", name: "MTN" }, { id: "glo", name: "Glo" }, { id: "airtel", name: "Airtel" }, { id: "9mobile", name: "9mobile" }];
const DATA_PLANS = [
  ["500MB", 325, "7 days", "SME"], ["1GB", 425, "7 days", "SME"], ["1GB", 525, "30 days", "SME"], ["2GB", 1050, "30 days", "SME"],
  ["3.5GB", 1500, "30 days", "Gifting"], ["10GB", 3500, "30 days", "Gifting"], ["20GB", 6000, "30 days", "Corporate"], ["40GB", 11000, "30 days", "Corporate"],
  ["100MB", 100, "1 day", "SME"], ["1GB", 189, "1 day", "Gifting"],
].map(([name, amount, validity, type], i) => ({ id: `d${i}`, name, dataValue: name, amount, validity, type }));
const CABLE_PROVIDERS = [{ id: "dstv", name: "DStv" }, { id: "gotv", name: "GOtv" }, { id: "startimes", name: "StarTimes" }];
const CABLE_PLANS = {
  dstv: [["DStv Padi", 3800], ["DStv Yanga", 6000], ["DStv Confam", 11000], ["DStv Compact", 21000], ["DStv Compact Plus", 24500], ["DStv Premium", 44500]],
  gotv: [["GOtv Smallie", 1900], ["GOtv Jinja", 3900], ["GOtv Jolli", 5800], ["GOtv Max", 8500], ["GOtv Supa", 11400]],
  startimes: [["Nova", 1900], ["Basic", 3700], ["Smart", 4700], ["Classic", 5500], ["Super", 9000]],
};
const DISCOS = ["Ikeja Electric", "Eko Electric", "Abuja Electric", "Enugu Electric", "Ibadan Electric", "Kano Electric", "Port Harcourt Electric", "Jos Electric", "Kaduna Electric", "Benin Electric"]
  .map((name) => ({ id: name.toLowerCase().replace(/ /g, "_"), name }));
const day = (d) => { const t = new Date(Date.now() - d * 36e5); return { date: t.toISOString().slice(0, 10), time: t.toTimeString().slice(0, 5), createdAt: t.toISOString() }; };
const TX = [
  ["electricity", "Enugu Electric - 0101180118750", 1000, "debit", "success", 2],
  ["airtime", "MTN Airtime - 07034398627", 100, "debit", "success", 5],
  ["fund", "Wallet funding - PalmPay", 10000, "credit", "success", 9],
  ["data", "Glo Data 2GB - 08114516826", 1050, "debit", "success", 20],
  ["cable", "DStv Yanga - 7012345678", 6000, "debit", "pending", 30],
  ["airtime", "Airtel Airtime - 09012345678", 500, "debit", "failed", 44],
  ["fund", "Airtime refund", 500, "credit", "success", 45],
  ["data", "MTN Data 1GB - 07034398627", 525, "debit", "success", 70],
].map(([category, description, amount, type, status, h], i) => ({ id: i + 1, reference: `SB${100200 + i}`, category, description, amount, type, status, ...day(h) }));
const REFERRAL = {
  referralBalance: 1840, cashbackBalance: 0, totalEarnings: 1840, totalUsers: 12, monthEarnings: 260,
  referralCode: "08114516826", referralLink: "https://subbridge.connectbridge.com.ng/ref/08114516826",
  commission: { perReferral: 50, note: "Earn 2% commission on every friend's first 10 transactions." },
  commissionRates: { airtime: 2, data: 2, cable: 1, electricity: 1 },
  howItWorks: [
    "Share your referral link or code with friends and family.",
    "They sign up on SubBridge and verify their account.",
    "You earn a bonus once they complete their first bill payment.",
    "Withdraw your bonus to your wallet or bank anytime.",
  ],
  recentEarnings: [
    { id: 1, name: "Ada O.", product: "Data", productAmount: 1050, amount: 50, date: day(10).createdAt, status: "paid" },
    { id: 2, name: "Tunde A.", product: "Airtime", productAmount: 1000, amount: 20, date: day(30).createdAt, status: "paid" },
    { id: 3, name: "Chika E.", product: "Cable TV", productAmount: 6000, amount: 120, date: day(60).createdAt, status: "paid" },
  ],
};
const ALERTS = [
  { id: 1, title: "Wallet funded", message: "₦10,000 received from GTBank", type: "transaction", read: false },
  { id: 2, title: "Hot data deals 🔥", message: "MTN 1GB is now ₦425 — today only. Get 2% cashback before midnight.", type: "promo", read: false },
  { id: 3, title: "Electricity token", message: "Token 4821-0937-1156-7720-3349 is ready", type: "transaction", read: true },
  { id: 4, title: "Referral bonus", message: "You earned ₦50 from Ada", type: "promo", read: true },
];

const ok = (data = {}, message = "Success") => ({ success: true, data, message });

/** Returns a fake successful response for flow-gating endpoints, or null to hit the real server. */
export function demoResponse(endpoint) {
  if (!DEMO_MODE) return null;
  const e = endpoint.split("?")[0];

  if (/sign-in-user|sign-in-with-pin/.test(e)) return ok({ token: "demo-token", id: DEMO_USER.id, user: DEMO_USER });
  if (/sign-up\/$|verify-sign-up|resend-verification-code/.test(e)) return ok({ id: DEMO_USER.id, user: DEMO_USER, token: "demo-token" });
  if (/^\/api\/users\/\d+\/$/.test(e)) return ok({ user: DEMO_USER });
  if (/^\/api\/wallet\/\d+\/$/.test(e)) return ok({ balance: 59160, accountNumber: "6698922282", bankName: "PalmPay", accounts: [{ bankName: "PalmPay", accountNumber: "6698922282", fee: "1% fee · cap ₦50" }, { bankName: "9PSB", accountNumber: "5224238006", fee: "₦35 flat" }] });
  if (/^\/api\/transactions\//.test(e)) return ok({ transactions: TX });
  if (/mobile\/history/.test(e)) return ok(TX);
  if (/mobile\/alerts/.test(e)) return ok(ALERTS);
  if (/data\/providers/.test(e)) return ok({ providers: NETWORKS });
  if (/data\/plans/.test(e)) return ok({ plans: DATA_PLANS, types: ["SME", "Gifting", "Corporate"] });
  if (/cable\/providers/.test(e)) return ok({ providers: CABLE_PROVIDERS });
  if (/cable\/plans/.test(e)) {
    const p = (endpoint.match(/provider=([^&]+)/) || [])[1] || "dstv";
    return ok({ plans: (CABLE_PLANS[p] || CABLE_PLANS.dstv).map(([name, amount], i) => ({ id: `${p}${i}`, name, amount, validity: "30 days" })) });
  }
  if (/electricity\/providers/.test(e)) return ok({ providers: DISCOS });
  if (/mobile\/referral\/earnings/.test(e)) return ok({ results: REFERRAL.recentEarnings, count: REFERRAL.recentEarnings.length });
  if (/mobile\/referral/.test(e)) return ok(REFERRAL);
  if (/mobile\/commission/.test(e)) return ok(REFERRAL.commissionRates);
  if (/\/support\//.test(e)) return ok({ whatsapp: "2348012345678", email: "support@subbridge.com", phone: "08012345678", faqs: [] });
  if (/\/banks\//.test(e)) return ok([{ code: "058", name: "GTBank" }, { code: "044", name: "Access Bank" }, { code: "999992", name: "OPay" }, { code: "999991", name: "PalmPay" }, { code: "50515", name: "Moniepoint" }]);
  if (/paystack-resolve/.test(e)) return ok({ account_name: "GODWIN CHIDIEBERE", accountName: "GODWIN CHIDIEBERE" });
  if (/bonus-transfer|paystack-bank-transfer|logout|biometric/.test(e)) return ok({});
  if (/check-email-phone/.test(e)) return ok({ email: false, phone: false });
  if (/forgot-password|forgot-pin|resend-password-code|resend-pin-code/.test(e)) return ok({}, "Code sent");
  if (/verify-otp|verify-pin-otp/.test(e)) return ok({ resetToken: "demo-reset-token" });
  if (/reset-password|reset-pin|setup-pin|change-pin/.test(e)) return ok({});
  if (/verify-pin\/$/.test(e)) return ok(true);
  if (/cable\/verify/.test(e)) return ok({ customerName: "GODWIN CHIDIEBERE", Customer_Name: "GODWIN CHIDIEBERE", status: "verified" });
  if (/electricity\/verify/.test(e)) return ok({ customerName: "GODWIN CHIDIEBERE", customerAddress: "Umunze, Anambra" });
  if (/\/purchase\//.test(e)) {
    return ok({
      reference: `DEMO${Date.now()}`,
      status: "success",
      token: /electricity/.test(e) ? "4821-0937-1156-7720-3349" : undefined,
    }, "Transaction successful");
  }
  // Everything else: succeed quietly so no screen ever waits on the network in demo mode.
  return ok({});
}
