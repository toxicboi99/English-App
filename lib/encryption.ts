import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function getKey() {
  const secret = process.env.TOKEN_ENCRYPTION_SECRET;

  if (!secret) {
    throw new Error("TOKEN_ENCRYPTION_SECRET is not configured.");
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptText(value: string) {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptText(payload: string) {
  const [ivHex, tagHex, valueHex] = payload.split(":");

  if (!ivHex || !tagHex || !valueHex) {
    throw new Error("Invalid encrypted payload.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivHex, "hex"),
  );

  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(valueHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
