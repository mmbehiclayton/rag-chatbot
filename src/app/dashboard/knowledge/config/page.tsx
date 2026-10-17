import { redirect } from "next/navigation";

// Grades and learning areas are managed on the Curriculum structure page.
export default function CBCConfigPage() {
  redirect("/dashboard/structure");
}
