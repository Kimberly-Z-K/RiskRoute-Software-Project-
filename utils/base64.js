// Turns the base64 text of a file into raw bytes, so an image can be uploaded
// as bytes. (React Native "FormData" file uploads are no longer supported by
// the current Expo runtime: "unsupported FormData implementation".)

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const LOOKUP = new Uint8Array(256).fill(255);
for (let i = 0; i < ALPHABET.length; i++) LOOKUP[ALPHABET.charCodeAt(i)] = i;

export function base64ToBytes(input) {
  const clean = String(input)
    .replace(/^data:[^;]+;base64,/, "")
    .replace(/\s+/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < clean.length; i++) {
    const c = clean.charCodeAt(i);
    if (c === 61) break; // "=" padding
    const v = c < 256 ? LOOKUP[c] : 255;
    if (v === 255) throw new Error("Invalid base64 data");
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buffer >> bits) & 0xff;
      buffer &= (1 << bits) - 1;
    }
  }
  return out.slice(0, o);
}

// Looks at the first bytes so the file is stored with the right type.
export function detectImageType(bytes) {
  if (bytes?.length > 3 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { contentType: "image/png", ext: "png" };
  }
  return { contentType: "image/jpeg", ext: "jpg" };
}
