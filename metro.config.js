const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// react-native-quick-base64's native TurboModule ("QuickBase64") is not
// registered in the Android binary, so requiring it throws
// "TurboModuleRegistry.get(...) could not be found". Redirect every require
// to a pure-JS implementation with the same API (used by
// @craftzdog/react-native-buffer inside react-native-quick-crypto).
const QUICK_BASE64_SHIM = path.resolve(__dirname, "src", "shims", "base64.js");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Web preview only: browsers have no secure store.
  if (platform === "web" && moduleName === "expo-secure-store") {
    return { type: "sourceFile", filePath: path.resolve(__dirname, "src", "shims", "secureStoreWeb.js") };
  }
  if (moduleName === "react-native-quick-base64") {
    return { type: "sourceFile", filePath: QUICK_BASE64_SHIM };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
