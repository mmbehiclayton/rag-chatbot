import { DocumentListPage } from "@/components/documents/document-list-page";

export default function SchemesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <DocumentListPage type="schemes" searchParams={searchParams} />;
}
