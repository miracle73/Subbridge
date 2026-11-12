import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

// Profile photo picked on this device; shared by Edit Profile and Profile.
const KEY = "sb_avatar_uri";
let current = null;
const listeners = new Set();
SecureStore.getItemAsync(KEY).then((v) => { current = v; listeners.forEach((l) => l(v)); }).catch(() => {});

export function setAvatar(uri) {
  current = uri;
  listeners.forEach((l) => l(uri));
  (uri ? SecureStore.setItemAsync(KEY, uri) : SecureStore.deleteItemAsync(KEY)).catch(() => {});
}

export function useAvatar() {
  const [uri, setUri] = useState(current);
  useEffect(() => { listeners.add(setUri); return () => listeners.delete(setUri); }, []);
  return uri;
}
