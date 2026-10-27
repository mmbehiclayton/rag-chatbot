import HTMLtoDOCX from "@turbodocx/html-to-docx";

export const DOCX_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const TH = "background-color: #f0f0f0; border: 1px solid #bbbbbb;";
const TD = "border: 1px solid #cccccc;";

/** Word reads column widths from the header cells, not from <colgroup>. */
function colWidthsToHeader(html: string) {
  return html.replace(
    /<colgroup>([\s\S]*?)<\/colgroup>(\s*<thead>\s*<tr>)([\s\S]*?<\/tr>)/g,
    (_, cols: string, open: string, row: string) => {
      const widths = [...cols.matchAll(/width:\s*([\d.]+%)/g)].map((m) => m[1]);
      let i = 0;
      return (
        open +
        row.replace(/<th(?=[\s>])/g, (th) => {
          const w = widths[i++];
          return w ? `${th} style="width: ${w};"` : th;
        })
      );
    },
  );
}

/**
 * Turns a print page from /api/export into a Word file, so teachers can adjust it or take it to
 * the cyber. Word ignores the page's CSS, so the few things it carries (borders, shading,
 * centring, page breaks, blank lines to write on) are put back inline first.
 */
export async function htmlToDocx(html: string, landscape = false) {
  const title = (html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "Elimu document")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
  const body = colWidthsToHeader(
    (html.match(/<body>([\s\S]*)<\/body>/)?.[1] ?? html)
      .replace(/<button class="print-btn"[\s\S]*?<\/button>/g, "")
      .replace(/<style>[\s\S]*?<\/style>/g, ""),
  )
    .replace(
      /<div class="page-break"><\/div>/g,
      '<div style="page-break-after: always;"></div>',
    )
    .replace(
      /<div class="blank"><\/div>/g,
      "<p>________________________________________</p>",
    )
    .replace(/<div class="center">/g, '<div style="text-align: center;">')
    .replace(/<h1>/g, '<h1 style="text-align: center;">')
    .replace(/<p class="doc-detail">/g, '<p style="text-align: center;">')
    .replace(/<p class="draft">/g, '<p style="text-align: right;">')
    // A line break inside a cell ends the table in the converter; a new paragraph doesn't.
    .replace(
      /<td([^>]*)>([\s\S]*?)<\/td>/g,
      (_, attrs: string, inner: string) =>
        inner.includes("<br")
          ? `<td${attrs}><p>${inner.replace(/<br\s*\/?>/g, "</p><p>")}</p></td>`
          : `<td${attrs}>${inner}</td>`,
    )
    .replace(/<th style="/g, `<th style="${TH} `)
    .replace(/<th(?=[\s>])(?! style)/g, `<th style="${TH}"`)
    .replace(/<td style="/g, `<td style="${TD} `)
    .replace(/<td(?=[\s>])(?! style)/g, `<td style="${TD}"`);

  // Twips: 1 mm is about 56.7. The print pages use 16 mm margins, 12 mm in landscape.
  const margin = landscape ? 680 : 907;
  const file = await HTMLtoDOCX(body, null, {
    orientation: landscape ? "landscape" : "portrait",
    // A4 in twips, given upright: the converter turns it for landscape.
    pageSize: { width: 11906, height: 16838 },
    margins: { top: margin, right: margin, bottom: margin, left: margin },
    title,
    creator: "Elimu",
    font: "Georgia",
    fontSize: landscape ? 18 : 22,
    heading: {
      heading1: { fontSize: 32, bold: true },
      heading2: {
        fontSize: 26,
        bold: true,
        spacing: { before: 240, after: 80 },
      },
      heading3: {
        fontSize: 23,
        bold: true,
        spacing: { before: 160, after: 40 },
      },
    },
    table: { row: { cantSplit: true } },
    pageNumber: true,
    footer: true,
    lang: "en-KE",
  });
  return {
    title,
    data:
      file instanceof Blob
        ? new Uint8Array(await file.arrayBuffer())
        : new Uint8Array(file as ArrayBuffer),
  };
}
