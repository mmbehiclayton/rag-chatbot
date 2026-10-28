import { redirect } from "next/navigation";
import { DownloadChoices } from "@/components/download/download-choices";
import { allowances } from "@/lib/allowance";
import { auth } from "@/lib/auth";
import {
  docPagePath,
  downloadAccess,
  exportQuery,
  findDoc,
  parseDocRef,
} from "@/lib/downloads";
import { paystackOn } from "@/lib/paystack";

/**
 * Where /api/export sends a teacher whose download still needs paying for: their free download,
 * paying for this one document, or a term pass.
 */
export default async function DownloadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const params = await searchParams;
  const query = exportQuery(params);
  const ref = parseDocRef(params);
  const doc = ref && (await findDoc(session.userId, ref));
  if (!ref || !doc) redirect("/dashboard");

  const state = await downloadAccess(session.userId, ref);
  if (state.open) redirect(`/api/export?${query}`);
  const { price, freeLeft, access } = state;
  const payment = params.payment;
  const online = paystackOn();
  const { paid: passDocs } = await allowances();

  return (
    <DownloadChoices
      backHref={docPagePath(params)}
      title={doc.title}
      payment={typeof payment === "string" ? payment : undefined}
      query={query}
      freeLeft={freeLeft}
      price={price}
      online={online}
      pass={{ price: access.price, term: access.term.label, docs: passDocs }}
    />
  );
}
