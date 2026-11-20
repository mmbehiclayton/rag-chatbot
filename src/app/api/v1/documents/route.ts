import { NextResponse } from "next/server";
import { withDbRetry } from "@/lib/db";
import { DOC_TYPES, isDocType, loadDocRows, PAGE_SIZE } from "@/lib/doc-lists";
import { requireTeacher } from "@/lib/service-auth";
import { getTeacherTerms } from "@/lib/term-pack-data";

/**
 * One page of the teacher's documents of a type, newest first.
 * GET /api/v1/documents?type=schemes|lessons|notes|assessments&q=&page=1
 */
export async function GET(req: Request) {
  const auth = await requireTeacher(req);
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "";
  if (!isDocType(type))
    return NextResponse.json(
      {
        success: false,
        error: `Choose a document type: ${Object.keys(DOC_TYPES).join(", ")}.`,
      },
      { status: 400 },
    );
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const page = Math.max(
    1,
    Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
  );

  const terms = await getTeacherTerms(auth.teacher.id);
  const [rows, total] = await withDbRetry(() =>
    loadDocRows(type, auth.teacher.id, {
      q,
      skip: (page - 1) * PAGE_SIZE,
      terms,
      only: null,
    }),
  );
  return NextResponse.json({
    success: true,
    data: {
      type,
      rows: rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })),
      total,
      page,
      pageSize: PAGE_SIZE,
    },
  });
}
