import type { NextRequest } from "next/server";

/**
 * Where a new teacher first came from. The proxy notes it on their first visit, and the register
 * action saves it on the account, so staff can see which channels bring teachers in.
 */
export const SOURCE_COOKIE = "elimu_ref";
export const SOURCE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const KNOWN_SITES: [RegExp, string][] = [
  [/(^|\.)google\./, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)whatsapp\.(com|net)$|^wa\.me$/, "whatsapp"],
  [/(^|\.)facebook\.com$|^fb\.me$|^l\.facebook\.com$/, "facebook"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(t\.co|x\.com|twitter\.com)$/, "x"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)youtube\.com$/, "youtube"],
  [/(^|\.)linkedin\.com$/, "linkedin"],
];

function clean(value: string, max: number) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\-_/.:]/g, "")
    .slice(0, max);
}

/** The cookie value for a first visit: "source|path", e.g. "whatsapp|/designs/grade-7/english". */
export function firstTouch(request: NextRequest) {
  const { searchParams, pathname, host } = request.nextUrl;
  let source =
    searchParams.get("ref") ?? searchParams.get("utm_source") ?? undefined;
  if (!source) {
    const referrer = request.headers.get("referer");
    let refHost = "";
    try {
      refHost = referrer
        ? new URL(referrer).hostname.replace(/^www\./, "")
        : "";
    } catch {}
    if (refHost && refHost !== host.split(":")[0])
      source =
        KNOWN_SITES.find(([pattern]) => pattern.test(refHost))?.[1] ?? refHost;
  }
  return `${clean(source ?? "direct", 40) || "direct"}|${clean(pathname, 80)}`;
}

/** Reads the cookie back into the two fields stored on the user. */
export function parseSource(value: string | undefined) {
  if (!value) return { signupSource: null, signupPath: null };
  const [source, path] = value.split("|");
  return {
    signupSource: clean(source ?? "", 40) || null,
    signupPath: clean(path ?? "", 80) || null,
  };
}
