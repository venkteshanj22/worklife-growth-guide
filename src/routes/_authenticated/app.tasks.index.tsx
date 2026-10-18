import { createFileRoute } from "@tanstack/react-router";
import { requirePermission } from "@/lib/auth/guards";
import { candidateHead } from "@/lib/candidates/head";
import { ExecListPage } from "@/features/execution/ExecList";
import { execListQuery } from "@/features/execution/queries";

export const Route = createFileRoute("/_authenticated/app/tasks/")({
  beforeLoad: requirePermission("premium_task.view"),
  head: () => candidateHead("Premium Tasks", "Premium candidate task assignments and review."),
  loader: ({ context }) => context.queryClient.ensureQueryData(execListQuery("TASK")),
  component: Page,
});
function Page() {
  return <ExecListPage kind="TASK" />;
}
