import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

/**
 * Locks API keys before they go into the database, so a copy of the database alone can't use
 * them. The lock comes from ELIMU_SECRETS_KEY, or JWT_SECRET_KEY when that isn't set. If that
 * value changes, saved keys can't be read any more and need saving again.
 */
function lockKey(): Buffer {
  const secret =
    process.env.ELIMU_SECRETS_KEY?.trim() ||
    process.env.JWT_SECRET_KEY ||
    "development_secret_do_not_use_in_prod";
  return createHash("sha256").update(`elimu-secrets:${secret}`).digest();
}

/** AES-256-GCM. The result is "iv.tag.data", each part base64url. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", lockKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data]
    .map((b) => b.toString("base64url"))
    .join(".");
}

/** The saved value, or null when it can't be read (wrong lock or damaged). */
export function decryptSecret(sealed: string): string | null {
  try {
    const [iv, tag, data] = sealed
      .split(".")
      .map((p) => Buffer.from(p, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", lockKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return null;
  }
}
