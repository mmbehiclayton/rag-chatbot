import { DocumentListPage } from "@/components/documents/document-list-page";

export default function AssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <DocumentListPage type="assessments" searchParams={searchParams} />;
}
