import { redirect } from "next/navigation";
import { isDocType } from "@/lib/doc-lists";

// Each document type now has its own page; keep this route so old links still work.
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const type = [params.type].flat()[0];
  const q = [params.q].flat()[0];
  redirect(
    `/dashboard/${isDocType(type) ? type : "lessons"}${q ? `?${new URLSearchParams({ q })}` : ""}`,
  );
}
