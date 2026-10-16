import { redirect } from "next/navigation";

// Lists now live in the Library; keep this route so old links still work.
export default function Page() {
  redirect("/dashboard/library?type=lessons");
}
