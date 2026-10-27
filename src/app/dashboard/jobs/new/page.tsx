import { PageHeader } from "@/components/shared/page-header";
import { JobForm } from "@/components/staffroom/job-form";

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Post a job"
        description="Know of a teaching job? Share it with teachers on Elimu."
      />
      <JobForm />
    </div>
  );
}
