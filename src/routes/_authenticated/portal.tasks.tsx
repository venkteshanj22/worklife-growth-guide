import { createFileRoute } from "@tanstack/react-router";
import { candidateHead } from "@/lib/candidates/head";
import { MyWorkPage } from "@/features/execution/Portal";
import { myWorkQuery } from "@/features/execution/queries";

export const Route = createFileRoute("/_authenticated/portal/tasks")({
  head: () => candidateHead("My Tasks", "Your Premium support tasks and feedback."),
  loader: ({ context }) => context.queryClient.ensureQueryData(myWorkQuery("TASK")),
  component: Page,
});
function Page() {
  return <MyWorkPage kind="TASK" />;
}
