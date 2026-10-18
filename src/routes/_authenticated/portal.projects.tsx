import { createFileRoute } from "@tanstack/react-router";
import { candidateHead } from "@/lib/candidates/head";
import { MyWorkPage } from "@/features/execution/Portal";
import { myWorkQuery } from "@/features/execution/queries";

export const Route = createFileRoute("/_authenticated/portal/projects")({
  head: () => candidateHead("Projects", "Your Coding361 portfolio projects, submissions and feedback."),
  loader: ({ context }) => context.queryClient.ensureQueryData(myWorkQuery("PROJECT")),
  component: Page,
});
function Page() {
  return <MyWorkPage kind="PROJECT" />;
}
