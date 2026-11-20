import { NextResponse } from "next/server";
import { fail, requireTeacher } from "@/lib/service-auth";
import { readJob } from "@/lib/service-jobs";

/** How a document that EduPro asked for is getting on. Only the teacher who asked can see it. */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const result = await requireTeacher(req);
  if ("response" in result) return result.response;
  const job = readJob(id, result.teacher.id);
  if (!job) return fail(404, "That job isn't there any more. Start it again.");
  return NextResponse.json({ success: true, data: job });
}
