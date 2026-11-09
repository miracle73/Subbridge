// Pure-JS replacement for react-native-quick-base64's native TurboModule.
// The native module ("QuickBase64") is not registered in the Android binary,
// which crashed every import of @craftzdog/react-native-buffer (used by
// react-native-quick-crypto). This shim exposes the exact same API in JS.
// https://github.com/craftzdog/react-native-quick-base64

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const REV = (() => {
  const t = new Array(256).fill(-1);
  for (let i = 0; i < B64.length; i++) {
    t[B64.charCodeAt(i)] = i;
    t[B64URL.charCodeAt(i)] = i;
  }
  return t;
})();

function getLens(b64) {
  const len = b64.length;
  if (len % 4 > 0) {
    throw new Error("Invalid string. Length must be a multiple of 4");
  }
  let validLen = b64.indexOf("=");
  if (validLen === -1) validLen = len;
  const placeHoldersLen = validLen === len ? 0 : 4 - (validLen % 4);
  return [validLen, placeHoldersLen];
}

export function byteLength(b64) {
  const [validLen, placeHoldersLen] = getLens(b64);
  return ((validLen + placeHoldersLen) * 3) / 4 - placeHoldersLen;
}

export function toByteArray(b64, removeLinebreaks) {
  let str = String(b64);
  if (removeLinebreaks !== false) str = str.replace(/[\r\n]/g, "");
  const rem = str.length % 4;
  if (rem === 1) throw new Error("Invalid string. Length must be a multiple of 4");
  if (rem) str += "=".repeat(4 - rem);
  const [validLen] = getLens(str);
  const arr = new Uint8Array(byteLength(str));
  let p = 0;
  const len = validLen > str.length ? str.length : validLen;
  for (let i = 0; i < len; i += 4) {
    const c0 = REV[str.charCodeAt(i)];
    const c1 = REV[str.charCodeAt(i + 1)];
    const c2 = i + 2 < len ? REV[str.charCodeAt(i + 2)] : 0;
    const c3 = i + 3 < len ? REV[str.charCodeAt(i + 3)] : 0;
    if (c0 < 0 || c1 < 0) throw new Error("Invalid character in base64 string");
    arr[p++] = (c0 << 2) | (c1 >> 4);
    if (p < arr.length && c2 >= 0) arr[p++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (p < arr.length && c3 >= 0) arr[p++] = ((c2 & 3) << 6) | (c3 & 63);
  }
  return arr;
}

export function fromByteArray(uint8, urlSafe) {
  const table = urlSafe ? B64URL : B64;
  const bytes = uint8 instanceof Uint8Array ? uint8 : new Uint8Array(uint8);
  const len = bytes.length;
  const extra = len % 3;
  const parts = [];
  for (let i = 0; i < len - extra; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 1 + 1];
    parts.push(
      table[(n >> 18) & 63] + table[(n >> 12) & 63] + table[(n >> 6) & 63] + table[n & 63]
    );
  }
  if (extra === 1) {
    const n = bytes[len - 1];
    parts.push(table[n >> 2] + table[(n & 3) << 4] + (urlSafe ? "" : "=="));
  } else if (extra === 2) {
    const n = (bytes[len - 2] << 8) | bytes[len - 1];
    parts.push(table[n >> 10] + table[(n >> 4) & 63] + table[(n & 15) << 2] + (urlSafe ? "" : "="));
  }
  return parts.join("");
}

export const trimBase64Padding = (str) => str.replace(/[.=]{1,2}$/, "");

export default { byteLength, toByteArray, fromByteArray, trimBase64Padding };
