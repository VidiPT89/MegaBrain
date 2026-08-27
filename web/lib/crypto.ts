import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

function getKey(): Buffer {
  const secret = process.env.MEGABRAIN_ENCRYPTION_KEY;
  if (!secret) throw new Error("MEGABRAIN_ENCRYPTION_KEY não está definido");
  return scryptSync(secret, "megabrain-api-keys", 32);
}

/** Encripta uma chave de API antes de a guardar na base de dados (AES-256-GCM). */
export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((buf) => buf.toString("base64")).join(".");
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return decrypted.toString("utf-8");
}
