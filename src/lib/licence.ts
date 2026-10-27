import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db, withDbRetry } from "@/lib/db";

/**
 * Every downloaded or printed document carries the name of the teacher it was made for and a
 * reference code logged against their account. It can't stop a copy being shared, but a shared
 * copy shows whose account it came from, and staff can look the code up on the Pilot page.
 */
export type Licence = { code: string; text: string };

// Same alphabet as invite codes: no 0/O or 1/I/L, so a code read off paper is typed right.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Logs the download and returns the line to print on it. */
export async function licenceFor(
  userId: string,
  doc: { type: string; id?: string | null; title?: string | null },
  format: "print" | "docx",
): Promise<Licence> {
  const user = await withDbRetry(() =>
    db.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        schoolName: true,
        tenant: { select: { name: true } },
      },
    }),
  );
  const who = [
    user?.name || user?.email,
    user?.schoolName || user?.tenant?.name,
  ]
    .filter(Boolean)
    .join(", ");
  const date = new Date().toLocaleDateString("en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = Array.from(
      { length: 8 },
      () => ALPHABET[randomInt(ALPHABET.length)],
    ).join("");
    try {
      await db.downloadLog.create({
        data: {
          code,
          userId,
          docType: doc.type,
          docId: doc.id ?? null,
          title: doc.title?.slice(0, 200) ?? null,
          format,
        },
      });
      return {
        code,
        text: `Licensed to ${who} for their own teaching · ${date} · Ref ${code} · Elimu`,
      };
    } catch (e) {
      if (
        !(
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        )
      )
        throw e;
    }
  }
  throw new Error("Couldn't make a download code");
}

const escHTML = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escCSS = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

/**
 * Puts the licence line in the bottom margin of every printed page, and at the end of each sheet
 * on screen so the teacher sees it. Printed, the end line could spill onto a sheet of its own.
 */
export function stampHTML(html: string, licence: Licence) {
  const css = `
  .licence { margin: 24px 0 0; padding-top: 6px; border-top: 1px solid #ccc; font-size: 9px; color: #555; }
  @media print { .licence { display: none; } }
  @page { @bottom-center { content: "${escCSS(licence.text)}"; font-family: Georgia, serif; font-size: 8px; color: #555; } }
`;
  const line = `<p class="licence">${escHTML(licence.text)}</p>`;
  return html
    .replace("</style>", `${css}</style>`)
    .replace(/<\/div>(?=<div class="page|<\/body>)/g, `${line}</div>`);
}
