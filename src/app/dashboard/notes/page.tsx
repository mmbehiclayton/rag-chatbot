import { DocumentListPage } from "@/components/documents/document-list-page";

export default function LessonNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <DocumentListPage type="notes" searchParams={searchParams} />;
}
