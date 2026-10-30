import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for secrets at rest (e.g. brokerage provider tokens).
 * PORTLE_ENCRYPTION_KEY is 32 random bytes, base64-encoded. The pre-rename name,
 * PORFAEL_ENCRYPTION_KEY, is still read so existing environments keep their key.
 */
function key(): Buffer {
  const raw = process.env.PORTLE_ENCRYPTION_KEY ?? process.env.PORFAEL_ENCRYPTION_KEY;
  if (!raw) throw new Error("PORTLE_ENCRYPTION_KEY is not set.");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("PORTLE_ENCRYPTION_KEY must decode to 32 bytes.");
  return buf;
}

/** True when PORTLE_ENCRYPTION_KEY is set and the right length, so secrets can be stored. */
export function encryptionReady() {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), body.toString("base64")].join(":");
}

export function decryptSecret(sealed: string): string {
  const [version, iv, tag, body] = sealed.split(":");
  if (version !== "v1" || !iv || !tag || !body) throw new Error("Unrecognised secret format.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]).toString("utf8");
}
