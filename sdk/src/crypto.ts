const ALGO = "AES-GCM";
const IV_LENGTH = 12;

export type EncryptedBlob = {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  key: Uint8Array;
  sha256: string;
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

async function sha256(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(data));
  return bytesToHex(new Uint8Array(digest));
}

export async function encryptBytes(input: Uint8Array): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await crypto.subtle.generateKey({ name: ALGO, length: 256 }, true, [
    "encrypt",
    "decrypt"
  ]);
  const keyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGO, iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(input)
  );
  const ciphertext = new Uint8Array(encrypted);
  const digest = await sha256(ciphertext);

  return { ciphertext, iv, key: keyRaw, sha256: digest };
}

export async function decryptBytes(
  ciphertext: Uint8Array,
  keyRaw: Uint8Array,
  iv: Uint8Array
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", toArrayBuffer(keyRaw), { name: ALGO }, false, [
    "decrypt"
  ]);
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGO, iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(ciphertext)
  );
  return new Uint8Array(decrypted);
}

export async function verifyCiphertextHash(
  ciphertext: Uint8Array,
  expectedSha256: string
): Promise<boolean> {
  return (await sha256(ciphertext)) === expectedSha256.toLowerCase();
}
