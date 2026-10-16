import fs from "fs/promises";
import path from "path";

/**
 * Where curriculum design PDFs live. New uploads go to UploadThing (fileUrl is an https URL).
 * Older ones were saved to public/uploads on the machine that handled the upload, which the
 * live site never has, so those need uploading again.
 */
export const MISSING_FILE =
  "The PDF isn't stored online (it was saved on the computer it was uploaded from). Upload it again with Upload design and choose Replace.";

const UPLOAD_HOSTS = [/\.ufs\.sh$/, /^utfs\.io$/, /\.utfs\.io$/];

export function isStoredUploadUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && UPLOAD_HOSTS.some((h) => h.test(u.hostname));
  } catch {
    return false;
  }
}

/** The PDF's bytes, or null when the file can't be found. */
export async function readCurriculumFile(fileUrl: string): Promise<Buffer | null> {
  if (/^https?:\/\//.test(fileUrl)) {
    if (!isStoredUploadUrl(fileUrl)) return null;
    const res = await fetch(fileUrl, { cache: "no-store" });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }
  const local = path.resolve(process.cwd(), "public", fileUrl.replace(/^\//, ""));
  return fs.readFile(local).catch(() => null);
}

/** Cheap check before starting a re-index, so a missing file fails straight away. */
export async function curriculumFileExists(fileUrl: string) {
  if (/^https?:\/\//.test(fileUrl)) return isStoredUploadUrl(fileUrl);
  const local = path.resolve(process.cwd(), "public", fileUrl.replace(/^\//, ""));
  return fs.access(local).then(() => true, () => false);
}
