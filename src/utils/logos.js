const NETWORK_LOGOS = {
  mtn: require("../assets/logos/mtn.jpg"),
  glo: require("../assets/logos/glo.jpg"),
  airtel: require("../assets/logos/airtel.png"),
  "9mobile": require("../assets/logos/9mobile.png"),
  smile: require("../assets/logos/smile.png"),
};

const CABLE_LOGOS = {
  dstv: require("../assets/logos/dstv.png"),
  gotv: require("../assets/logos/gotv.png"),
  startimes: require("../assets/logos/startimes.jpg"),
};

function normalizeId(id) {
  return (id || "").toLowerCase().replace(/[\s_-]+/g, "");
}

// Maps alternate server ids to a bundled logo key.
// NOTE: TSTV has no bundled file yet — drop tstv.png/jpg into
// src/assets/logos/ and add: tstv: require("../assets/logos/tstv.png"),
const CABLE_ALIASES = {
  startimes: ["startime", "startimes", "startimestv"],
};

const ELECTRICITY_LOGOS = {
  "ikeja electric": require("../assets/logos/ikeja.png"),
  "eko electric": require("../assets/logos/eko.jpg"),
  "abuja electric": require("../assets/logos/abuja.jpg"),
  "kano electric": require("../assets/logos/kano.png"),
  "enugu electric": require("../assets/logos/enugu.png"),
  "port harcourt electric": require("../assets/logos/portharcourt.jpg"),
  "ibadan electric": require("../assets/logos/ibadan.jpg"),
  "kaduna electric": require("../assets/logos/kaduna.jpg"),
  "jos electric": require("../assets/logos/jos.jpg"),
  "benin electric": require("../assets/logos/benin.jpg"),
  "yola electric": require("../assets/logos/yola.jpg"),
};

export function getNetworkLogo(id) {
  return NETWORK_LOGOS[id?.toLowerCase()] || null;
}

export function getCableLogo(id) {
  const norm = normalizeId(id);
  if (CABLE_LOGOS[norm]) return CABLE_LOGOS[norm];
  for (const [key, aliases] of Object.entries(CABLE_ALIASES)) {
    if (aliases.includes(norm) && CABLE_LOGOS[key]) return CABLE_LOGOS[key];
  }
  return null;
}

export function getElectricityLogo(id) {
  return ELECTRICITY_LOGOS[id?.toLowerCase()] || null;
}

export function enrichProviders(list, logoFn) {
  return (list || []).map((p) => ({
    ...p,
    logo: logoFn(p.id) || logoFn(p.code) || logoFn(p.name) || null,
  }));
}
