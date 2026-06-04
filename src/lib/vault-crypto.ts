"use client";

// Zero-knowledge vault crypto — runs exclusively in the browser (WebCrypto).
// The server only ever receives/stores ciphertext. The derived key lives in
// memory only and is never persisted or transmitted.

const VERIFIER_PLAINTEXT = "meteoro-vault-v1";
const KDF_HASH = "SHA-256";
const KDF_ALGO = "PBKDF2";
const ENC_ALGO = "AES-GCM";
const KEY_LENGTH = 256;

export type KdfParams = {
  salt: string;   // base64
  iterations: number;
};

export type EncryptedBlob = {
  ciphertext: string; // base64
  iv: string;         // base64
};

function toBase64(buf: ArrayBuffer | Uint8Array): string {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...arr));
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toBase64(bytes);
}

export function defaultKdfParams(): KdfParams {
  return { salt: generateSalt(), iterations: 600_000 };
}

export async function deriveKey(passphrase: string, params: KdfParams): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: KDF_ALGO },
    false,
    ["deriveKey"],
  );
  const saltBytes = fromBase64(params.salt);
  return crypto.subtle.deriveKey(
    {
      name: KDF_ALGO,
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: params.iterations,
      hash: KDF_HASH,
    },
    keyMaterial,
    { name: ENC_ALGO, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encrypt(key: CryptoKey, plaintext: string): Promise<EncryptedBlob> {
  const ivBytes = new Uint8Array(12);
  crypto.getRandomValues(ivBytes);
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt(
    { name: ENC_ALGO, iv: ivBytes },
    key,
    enc.encode(plaintext),
  );
  return {
    ciphertext: toBase64(cipherBuf),
    iv: toBase64(ivBytes),
  };
}

export async function decrypt(key: CryptoKey, blob: EncryptedBlob): Promise<string> {
  const dec = new TextDecoder();
  const ivBytes = fromBase64(blob.iv);
  const cipherBytes = fromBase64(blob.ciphertext);
  const plain = await crypto.subtle.decrypt(
    { name: ENC_ALGO, iv: ivBytes as BufferSource },
    key,
    cipherBytes as unknown as BufferSource,
  );
  return dec.decode(plain);
}

/** Encrypts a known constant to verify passphrase correctness without storing it. */
export async function makeVerifier(key: CryptoKey): Promise<EncryptedBlob> {
  return encrypt(key, VERIFIER_PLAINTEXT);
}

/** Returns true if passphrase produces a key that decrypts the verifier. */
export async function checkVerifier(key: CryptoKey, verifier: EncryptedBlob): Promise<boolean> {
  try {
    const plain = await decrypt(key, verifier);
    return plain === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}
