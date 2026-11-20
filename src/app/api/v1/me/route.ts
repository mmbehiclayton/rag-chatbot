import { NextResponse } from "next/server";
import { getAllowance } from "@/lib/allowance";
import { getAccess } from "@/lib/plans";
import { serviceCaller } from "@/lib/service-auth";

/**
 * Who the teacher is on Elimu and what their plan allows. `linked: false` means they have no
 * Elimu account yet. Called from EduPro's server only (see src/lib/service-auth.ts).
 */
export async function GET(req: Request) {
  const result = await serviceCaller(req);
  if ("response" in result) return result.response;
  const { user } = result.caller;
  if (!user)
    return NextResponse.json({ success: true, data: { linked: false } });

  const access = await getAccess(user.id);
  const allowance = await getAllowance(user.id, user.role, access);
  return NextResponse.json({
    success: true,
    data: {
      linked: true,
      teacher: {
        name: user.name,
        email: user.email,
        schoolName: user.schoolName,
        grades: user.gradesTaught,
        subjects: user.subjectsTaught,
      },
      plan: {
        kind: access.kind, // "free" | "paid" | "unlimited"
        term: access.term.label,
        price: access.price,
        pass: access.pass
          ? { status: access.pass.status, amount: access.pass.amount }
          : null,
      },
      allowance: allowance
        ? {
            used: allowance.used,
            limit: allowance.limit,
            resetsOn: allowance.resetsOn.toISOString(),
            paidLimit: allowance.paidLimit,
          }
        : null,
    },
  });
}
