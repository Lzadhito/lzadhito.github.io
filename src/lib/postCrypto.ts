// src/lib/postCrypto.ts — encryption for password-protected posts.
//
// The repo (and the built site) is public, so a post can only really be "password
// protected" if what gets committed is unreadable without the password: the composer
// encrypts a post's markdown before publishing, and a reader's browser decrypts it after
// they type the right password. The password itself is never committed or transmitted —
// there's no backdoor, so a lost password can't be recovered, only replaced by publishing
// new content.
//
// Blob format (what ends up as the post's body in the .md file): "v1.<salt>.<iv>.<ciphertext>",
// each part base64. PBKDF2-SHA256 derives an AES-GCM-256 key from the password and a random
// salt; AES-GCM's auth tag makes a wrong password (or a tampered blob) fail to decrypt rather
// than silently produce garbage.

const VERSION = "v1";
const PBKDF2_ITERATIONS = 300_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypts markdown with a password. The result is safe to commit to a public repo. */
export async function encryptBody(markdown: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, textEncoder.encode(markdown));
  return [VERSION, toBase64(salt), toBase64(iv), toBase64(new Uint8Array(ciphertext))].join(".");
}

/** Decrypts a blob from encryptBody(). Throws if the password is wrong or the blob is corrupt/tampered. */
export async function decryptBody(blob: string, password: string): Promise<string> {
  const [version, saltB64, ivB64, ciphertextB64] = blob.trim().split(".");
  if (version !== VERSION || !saltB64 || !ivB64 || !ciphertextB64) throw new Error("Unrecognized protected-post format");
  const key = await deriveKey(password, fromBase64(saltB64));
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivB64) as BufferSource },
    key,
    fromBase64(ciphertextB64) as BufferSource,
  );
  return textDecoder.decode(plaintext);
}
