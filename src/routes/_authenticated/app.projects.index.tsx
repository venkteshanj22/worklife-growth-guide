import { createFileRoute } from "@tanstack/react-router";
import { requirePermission } from "@/lib/auth/guards";
import { candidateHead } from "@/lib/candidates/head";
import { ExecListPage } from "@/features/execution/ExecList";
import { execListQuery } from "@/features/execution/queries";

export const Route = createFileRoute("/_authenticated/app/projects/")({
  beforeLoad: requirePermission("project.view"),
  head: () => candidateHead("Projects", "Candidate project execution and review."),
  loader: ({ context }) => context.queryClient.ensureQueryData(execListQuery("PROJECT")),
  component: Page,
});
function Page() {
  return <ExecListPage kind="PROJECT" />;
}
