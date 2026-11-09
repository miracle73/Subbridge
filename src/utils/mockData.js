export const MOCK_USER = {
  id: 1,
  firstname: "Godwin",
  lastname: "SG",
  phone: "2348123456789",
  email: "godwin@example.com",
  amount: 98100.0,
  has_pin: true,
  virtualAccount: { bank: "Rubies MFB", accountNumber: "8880002194" },
};

export const MOCK_BENEFICIARIES = [
  { id: 1, name: "Chidera N.", phone: "08165928732", network: "mtn", type: "airtime" },
  { id: 2, name: "Emeka O.", phone: "09023456781", network: "airtel", type: "data" },
  { id: 3, name: "Fatima B.", phone: "08098765432", network: "glo", type: "airtime" },
  { id: 4, name: "Yusuf D.", phone: "07012345678", network: "9mobile", type: "data" },
  { id: 5, name: "Ngozi I.", phone: "08134567890", network: "mtn", type: "electricity" },
  { id: 6, name: "Tunde A.", phone: "09087654321", network: null, type: "cable" },
  { id: 7, name: "Blessing E.", phone: "08145678901", network: "mtn", type: "airtime" },
  { id: 8, name: "Kemi F.", phone: "09012345678", network: "airtel", type: "data" },
  { id: 9, name: "Adewale G.", smartcard: "7012345678", provider: "dstv", type: "cable" },
  { id: 10, name: "Chinelo H.", smartcard: "4012345678", provider: "gotv", type: "cable" },
  { id: 11, name: "Oluwaseun J.", meter: "44012345678", provider: "ikeja_electric", type: "electricity" },
  { id: 12, name: "Amina K.", meter: "55012345678", provider: "ekedc", type: "electricity" },
];

export const MOCK_RECENT_TX = [
  {
    id: 1,
    category: "airtime",
    label: "Airtime Purchase",
    description: "MTN \u00B7 08165928732",
    amount: 50,
    type: "debit",
    date: "2026-08-08T10:24:00Z",
    reference: "SBR10240001",
  },
  {
    id: 2,
    category: "data",
    label: "Data Purchase",
    description: "Airtel \u00B7 5GB",
    amount: 1200,
    type: "debit",
    date: "2026-08-08T09:15:00Z",
    reference: "SBR09150002",
  },
  {
    id: 3,
    category: "electricity",
    label: "Electricity Payment",
    description: "Ikeja Electric",
    amount: 3500,
    type: "debit",
    date: "2026-08-07T18:45:00Z",
    reference: "SBR18450003",
  },
  {
    id: 4,
    category: "fund",
    label: "Wallet Funding",
    description: "Bank Transfer \u00B7 Rubies MFB",
    amount: 50000,
    type: "credit",
    date: "2026-08-06T14:30:00Z",
    reference: "SBR14300004",
  },
  {
    id: 5,
    category: "cable",
    label: "Cable TV Subscription",
    description: "DSTV \u00B7 Premium",
    amount: 21500,
    type: "debit",
    date: "2026-08-05T11:00:00Z",
    reference: "SBR11000005",
  },
  {
    id: 6,
    category: "data",
    label: "Data Purchase",
    description: "MTN \u00B7 10GB SME",
    amount: 2800,
    type: "debit",
    date: "2026-08-04T08:20:00Z",
    reference: "SBR08200006",
  },
];

export const MOCK_ALL_TX = [
  ...MOCK_RECENT_TX,
  {
    id: 7,
    category: "fund",
    label: "Wallet Funding",
    description: "Card Payment",
    amount: 100000,
    type: "credit",
    date: "2026-08-03T16:00:00Z",
    reference: "SBR16000007",
  },
  {
    id: 8,
    category: "airtime",
    label: "Airtime Purchase",
    description: "Glo \u00B7 09012345678",
    amount: 200,
    type: "debit",
    date: "2026-08-02T12:10:00Z",
    reference: "SBR12100008",
  },
  {
    id: 9,
    category: "electricity",
    label: "Electricity Payment",
    description: "EKEDC \u00B7 Prepaid",
    amount: 10000,
    type: "debit",
    date: "2026-08-01T09:45:00Z",
    reference: "SBR09450009",
  },
  {
    id: 10,
    category: "cable",
    label: "Cable TV Subscription",
    description: "GOTV \u00B7 Basic",
    amount: 4100,
    type: "debit",
    date: "2026-07-31T15:30:00Z",
    reference: "SBR15300010",
  },
];

export const MOCK_NETWORKS = [
  { id: "mtn", name: "MTN", logo: require("../assets/logos/mtn.jpg") },
  { id: "airtel", name: "Airtel", logo: require("../assets/logos/airtel.png") },
  { id: "glo", name: "Glo", logo: require("../assets/logos/glo.jpg") },
  { id: "9mobile", name: "9mobile", logo: require("../assets/logos/9mobile.png") },
];

export const MOCK_DATA_TYPES = ["Daily", "Weekly", "Monthly", "Yearly"];

export const MOCK_PLAN_TYPES = ["SME", "Gifting", "Corporate"];

export const MOCK_DATA_PLANS = {
  mtn: {
    Daily: {
      SME: [
        { id: "1", name: "500MB", amount: 200, validity: "1 day" },
        { id: "2", name: "1GB", amount: 380, validity: "1 day" },
        { id: "3", name: "2GB", amount: 700, validity: "1 day" },
      ],
      Gifting: [
        { id: "4", name: "500MB", amount: 150, validity: "1 day" },
        { id: "5", name: "1GB", amount: 300, validity: "1 day" },
      ],
      Corporate: [
        { id: "6", name: "1GB", amount: 250, validity: "1 day" },
        { id: "7", name: "2GB", amount: 500, validity: "1 day" },
      ],
    },
    Weekly: {
      SME: [
        { id: "10", name: "1GB", amount: 350, validity: "7 days" },
        { id: "11", name: "2GB", amount: 700, validity: "7 days" },
        { id: "12", name: "3GB", amount: 1000, validity: "7 days" },
      ],
      Gifting: [
        { id: "13", name: "1GB", amount: 300, validity: "7 days" },
        { id: "14", name: "2GB", amount: 550, validity: "7 days" },
      ],
      Corporate: [
        { id: "15", name: "2GB", amount: 500, validity: "7 days" },
        { id: "16", name: "5GB", amount: 1200, validity: "7 days" },
      ],
    },
    Monthly: {
      SME: [
        { id: "20", name: "1.5GB", amount: 1000, validity: "30 days" },
        { id: "21", name: "3GB", amount: 1500, validity: "30 days" },
        { id: "22", name: "5GB", amount: 2500, validity: "30 days" },
        { id: "23", name: "10GB", amount: 4500, validity: "30 days" },
      ],
      Gifting: [
        { id: "24", name: "1.5GB", amount: 800, validity: "30 days" },
        { id: "25", name: "3GB", amount: 1200, validity: "30 days" },
        { id: "26", name: "5GB", amount: 2000, validity: "30 days" },
      ],
      Corporate: [
        { id: "27", name: "10GB", amount: 3500, validity: "30 days" },
        { id: "28", name: "15GB", amount: 5000, validity: "30 days" },
        { id: "29", name: "20GB", amount: 7000, validity: "30 days" },
      ],
    },
    Yearly: {
      SME: [
        { id: "30", name: "50GB", amount: 25000, validity: "365 days" },
      ],
      Gifting: [
        { id: "31", name: "50GB", amount: 22000, validity: "365 days" },
      ],
      Corporate: [
        { id: "32", name: "100GB", amount: 45000, validity: "365 days" },
        { id: "33", name: "200GB", amount: 80000, validity: "365 days" },
      ],
    },
  },
  airtel: {
    Daily: {
      SME: [
        { id: "40", name: "500MB", amount: 200, validity: "1 day" },
        { id: "41", name: "1GB", amount: 350, validity: "1 day" },
      ],
      Gifting: [
        { id: "42", name: "500MB", amount: 150, validity: "1 day" },
        { id: "43", name: "1GB", amount: 280, validity: "1 day" },
      ],
      Corporate: [
        { id: "44", name: "1GB", amount: 250, validity: "1 day" },
      ],
    },
    Weekly: {
      SME: [
        { id: "50", name: "1GB", amount: 300, validity: "7 days" },
        { id: "51", name: "2GB", amount: 600, validity: "7 days" },
      ],
      Gifting: [
        { id: "52", name: "1GB", amount: 250, validity: "7 days" },
        { id: "53", name: "2GB", amount: 500, validity: "7 days" },
      ],
      Corporate: [
        { id: "54", name: "2GB", amount: 450, validity: "7 days" },
      ],
    },
    Monthly: {
      SME: [
        { id: "60", name: "1.5GB", amount: 900, validity: "30 days" },
        { id: "61", name: "3GB", amount: 1400, validity: "30 days" },
        { id: "62", name: "5GB", amount: 2200, validity: "30 days" },
        { id: "63", name: "10GB", amount: 4000, validity: "30 days" },
      ],
      Gifting: [
        { id: "64", name: "1.5GB", amount: 750, validity: "30 days" },
        { id: "65", name: "3GB", amount: 1100, validity: "30 days" },
      ],
      Corporate: [
        { id: "66", name: "10GB", amount: 3200, validity: "30 days" },
        { id: "67", name: "15GB", amount: 4500, validity: "30 days" },
      ],
    },
    Yearly: {
      SME: [
        { id: "70", name: "50GB", amount: 28000, validity: "365 days" },
      ],
      Gifting: [
        { id: "71", name: "50GB", amount: 24000, validity: "365 days" },
      ],
      Corporate: [
        { id: "72", name: "100GB", amount: 50000, validity: "365 days" },
      ],
    },
  },
  glo: {
    Daily: {
      SME: [
        { id: "80", name: "500MB", amount: 150, validity: "1 day" },
        { id: "81", name: "1GB", amount: 300, validity: "1 day" },
      ],
      Gifting: [
        { id: "82", name: "500MB", amount: 120, validity: "1 day" },
        { id: "83", name: "1GB", amount: 250, validity: "1 day" },
      ],
      Corporate: [
        { id: "84", name: "1GB", amount: 200, validity: "1 day" },
      ],
    },
    Weekly: {
      SME: [
        { id: "90", name: "1GB", amount: 250, validity: "7 days" },
        { id: "91", name: "2GB", amount: 500, validity: "7 days" },
      ],
      Gifting: [
        { id: "92", name: "1GB", amount: 200, validity: "7 days" },
        { id: "93", name: "2GB", amount: 400, validity: "7 days" },
      ],
      Corporate: [
        { id: "94", name: "2GB", amount: 350, validity: "7 days" },
      ],
    },
    Monthly: {
      SME: [
        { id: "100", name: "1.5GB", amount: 800, validity: "30 days" },
        { id: "101", name: "3GB", amount: 1200, validity: "30 days" },
        { id: "102", name: "5GB", amount: 2000, validity: "30 days" },
        { id: "103", name: "10GB", amount: 3500, validity: "30 days" },
      ],
      Gifting: [
        { id: "104", name: "1.5GB", amount: 650, validity: "30 days" },
        { id: "105", name: "3GB", amount: 1000, validity: "30 days" },
      ],
      Corporate: [
        { id: "106", name: "10GB", amount: 2800, validity: "30 days" },
      ],
    },
    Yearly: {
      SME: [
        { id: "110", name: "50GB", amount: 25000, validity: "365 days" },
      ],
      Gifting: [
        { id: "111", name: "50GB", amount: 20000, validity: "365 days" },
      ],
      Corporate: [
        { id: "112", name: "100GB", amount: 42000, validity: "365 days" },
      ],
    },
  },
  "9mobile": {
    Daily: {
      SME: [
        { id: "120", name: "500MB", amount: 150, validity: "1 day" },
        { id: "121", name: "1GB", amount: 300, validity: "1 day" },
      ],
      Gifting: [
        { id: "122", name: "500MB", amount: 120, validity: "1 day" },
      ],
      Corporate: [
        { id: "123", name: "1GB", amount: 200, validity: "1 day" },
      ],
    },
    Weekly: {
      SME: [
        { id: "130", name: "1GB", amount: 250, validity: "7 days" },
        { id: "131", name: "2GB", amount: 500, validity: "7 days" },
      ],
      Gifting: [
        { id: "132", name: "1GB", amount: 200, validity: "7 days" },
      ],
      Corporate: [
        { id: "133", name: "2GB", amount: 400, validity: "7 days" },
      ],
    },
    Monthly: {
      SME: [
        { id: "140", name: "1.5GB", amount: 800, validity: "30 days" },
        { id: "141", name: "3GB", amount: 1300, validity: "30 days" },
        { id: "142", name: "5GB", amount: 2100, validity: "30 days" },
      ],
      Gifting: [
        { id: "143", name: "1.5GB", amount: 650, validity: "30 days" },
        { id: "144", name: "3GB", amount: 1000, validity: "30 days" },
      ],
      Corporate: [
        { id: "145", name: "5GB", amount: 1800, validity: "30 days" },
      ],
    },
    Yearly: {
      SME: [
        { id: "150", name: "50GB", amount: 26000, validity: "365 days" },
      ],
      Gifting: [
        { id: "151", name: "50GB", amount: 22000, validity: "365 days" },
      ],
      Corporate: [
        { id: "152", name: "100GB", amount: 48000, validity: "365 days" },
      ],
    },
  },
};

export const MOCK_CABLE_PROVIDERS = [
  { id: "dstv", name: "DStv", logo: require("../assets/logos/dstv.png") },
  { id: "gotv", name: "GOtv", logo: require("../assets/logos/gotv.png") },
  { id: "startimes", name: "StarTimes", logo: require("../assets/logos/startimes.jpg") },
];

export const MOCK_CABLE_PLANS = {
  dstv: [
    { id: "20", name: "DStv Padi", amount: 2150, validity: "1 month" },
    { id: "21", name: "DStv Yanga", amount: 3600, validity: "1 month" },
    { id: "22", name: "DStv Confam", amount: 5400, validity: "1 month" },
    { id: "23", name: "DStv Compact", amount: 6800, validity: "1 month" },
    { id: "24", name: "DStv Premium", amount: 21500, validity: "1 month" },
  ],
  gotv: [
    { id: "30", name: "GOtv Lite", amount: 4100, validity: "1 month" },
    { id: "31", name: "GOtv Max", amount: 5700, validity: "1 month" },
    { id: "32", name: "GOtv Supa", amount: 8200, validity: "1 month" },
  ],
  startimes: [
    { id: "40", name: "Basic", amount: 2200, validity: "1 month" },
    { id: "41", name: "Classic", amount: 3300, validity: "1 month" },
    { id: "42", name: "Premium", amount: 6600, validity: "1 month" },
  ],
};

export const MOCK_CABLE_VERIFIED = {
  dstv: { name: "John Doe", iuc: "7012345678", currentPlan: "DStv Padi" },
  gotv: { name: "John Doe", iuc: "7012345678", currentPlan: "GOtv Lite" },
  startimes: { name: "John Doe", iuc: "7012345678", currentPlan: "Basic" },
};

export const MOCK_ELECTRICITY_PROVIDERS = [
  { id: "ikeja_electric", name: "Ikeja Electric", logo: require("../assets/logos/ikeja.png") },
  { id: "ekedc", name: "EKEDC", logo: require("../assets/logos/eko.jpg") },
  { id: "ibedc", name: "IBEDC", logo: require("../assets/logos/ibadan.jpg") },
  { id: "ikedc", name: "IKEDC", logo: require("../assets/logos/meter.jpg") },
  { id: "abuja_electric", name: "Abuja Electric", logo: require("../assets/logos/abuja.jpg") },
  { id: "kano_electric", name: "Kano Electric", logo: require("../assets/logos/kano.png") },
  { id: "jos_electric", name: "Jos Electric", logo: require("../assets/logos/jos.jpg") },
  { id: "benin_electric", name: "Benin Electric", logo: require("../assets/logos/benin.jpg") },
  { id: "kaduna_electric", name: "Kaduna Electric", logo: require("../assets/logos/kaduna.jpg") },
  { id: "yola_electric", name: "Yola Electric", logo: require("../assets/logos/yola.jpg") },
];

export const MOCK_METER_VERIFIED = {
  ikeja_electric: { name: "John Doe", address: "12 Allen Avenue, Ikeja, Lagos" },
  ekedc: { name: "John Doe", address: "15 Lekki Phase 1, Lagos" },
};

export const MOCK_SUPPORT = {
  whatsapp: "2348012345678",
  email: "support@subbridge.com",
  phone: "08012345678",
  faqs: [
    { q: "How do I fund my wallet?", a: "Go to Wallet > Fund Wallet. You'll see your virtual account details. Transfer to that account from any bank app." },
    { q: "How do I buy airtime?", a: "Tap Airtime on the home screen, select network, enter phone number, choose amount, and confirm with your PIN." },
    { q: "How do I reset my PIN?", a: "Go to Profile > Change PIN, or use the Forgot PIN option on the login screen." },
    { q: "What if my airtime purchase fails?", a: "Failed purchases are automatically refunded to your wallet within a few minutes." },
    { q: "How do I contact support?", a: "Tap the Support button, or reach us via WhatsApp, email, or phone." },
  ],
};

export const MOCK_BILLS_TX = [
  {
    id: 101,
    category: "data",
    label: "Data Purchase",
    description: "MTN \u00B7 1GB SME",
    amount: 380,
    type: "debit",
    date: "2026-08-08T10:24:00Z",
    reference: "SBR10240101",
  },
  {
    id: 102,
    category: "electricity",
    label: "Electricity Payment",
    description: "Ikeja Electric \u00B7 Prepaid",
    amount: 5000,
    type: "debit",
    date: "2026-08-07T14:00:00Z",
    reference: "SBR14000102",
  },
  {
    id: 103,
    category: "cable",
    label: "Cable TV Subscription",
    description: "DStv \u00B7 Confam",
    amount: 5400,
    type: "debit",
    date: "2026-08-06T09:30:00Z",
    reference: "SBR09300103",
  },
  {
    id: 104,
    category: "fund",
    label: "Wallet Funding",
    description: "Bank Transfer",
    amount: 25000,
    type: "credit",
    date: "2026-08-05T16:00:00Z",
    reference: "SBR16000104",
  },
];

export const MOCK_REWARDS = {
  referralBalance: 12500,
  cashbackBalance: 0,
  totalEarnings: 48750,
  totalUsers: 14,
  monthEarnings: 6500,
  referralLink: "https://subbridge.connectbridge.com.ng/ref/CHIDY2024",
  referralCode: "CHIDY2024",
  commission: {
    perReferral: 500,
    note: "You earn a bonus when a referred friend completes their first bill payment on SubBridge.",
  },
  commissionRates: [
    { id: "airtime", label: "Airtime", rate: 0.3 },
    { id: "data", label: "Data", rate: 0.5 },
    { id: "cable", label: "Cable TV", rate: 0.2 },
    { id: "electricity", label: "Electricity", rate: 0.7 },
  ],
  howItWorks: [
    "Share your referral link or code with friends and family.",
    "They sign up on SubBridge and verify their account.",
    "You earn a bonus once they complete their first bill payment.",
    "Withdraw your bonus to your wallet or bank anytime.",
  ],
  recentEarnings: [
    { id: 1, name: "Emeka O.", product: "Airtime", productAmount: 100000, amount: 300, date: "2026-10-14T10:24:00Z", status: "paid" },
    { id: 2, name: "Fatima B.", product: "Data", productAmount: 4000, amount: 20, date: "2026-10-12T09:15:00Z", status: "paid" },
    { id: 3, name: "Tunde A.", product: "Electricity", productAmount: 50000, amount: 350, date: "2026-10-08T18:45:00Z", status: "paid" },
    { id: 4, name: "Blessing E.", product: "Cable TV", productAmount: 21500, amount: 43, date: "2026-10-03T14:30:00Z", status: "paid" },
    { id: 5, name: "Kemi F.", product: "Data", productAmount: 10000, amount: 50, date: "2026-09-28T11:00:00Z", status: "paid" },
  ],
};
