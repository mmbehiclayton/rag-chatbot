import { DocumentListPage } from "@/components/documents/document-list-page";

export default function LessonPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <DocumentListPage type="lessons" searchParams={searchParams} />;
}
