// Web-only stand-in for expo-secure-store (browsers have no secure store), used for previewing the UI.
const ls = () => (typeof localStorage !== "undefined" ? localStorage : null);
export async function getItemAsync(key) { return ls()?.getItem(key) ?? null; }
export async function setItemAsync(key, value) { ls()?.setItem(key, String(value)); }
export async function deleteItemAsync(key) { ls()?.removeItem(key); }
export async function isAvailableAsync() { return true; }
export const WHEN_UNLOCKED = "WHEN_UNLOCKED";
export const AFTER_FIRST_UNLOCK = "AFTER_FIRST_UNLOCK";
export default { getItemAsync, setItemAsync, deleteItemAsync, isAvailableAsync, WHEN_UNLOCKED, AFTER_FIRST_UNLOCK };
