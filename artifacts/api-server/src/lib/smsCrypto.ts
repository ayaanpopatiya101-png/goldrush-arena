import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";

function key(purpose: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SMS encryption unavailable");
  return Buffer.from(hkdfSync("sha256", secret, "goldrush-private-sms-v1", purpose, 32));
}
export function smsHash(value: string) {
  return createHmac("sha256", key("recipient-suppression")).update(value).digest("hex");
}
export function encryptPhone(phone: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key("phone-encryption"), iv);
  cipher.setAAD(Buffer.from("goldrush-sms-v1"));
  const data = Buffer.concat([cipher.update(phone, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(b => b.toString("base64url")).join(".");
}
export function decryptPhone(value: string) {
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Invalid SMS ciphertext");
  const [iv, tag, data] = parts.map(s => Buffer.from(s, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key("phone-encryption"), iv!);
  decipher.setAAD(Buffer.from("goldrush-sms-v1"));
  decipher.setAuthTag(tag!);
  return Buffer.concat([decipher.update(data!), decipher.final()]).toString("utf8");
}
