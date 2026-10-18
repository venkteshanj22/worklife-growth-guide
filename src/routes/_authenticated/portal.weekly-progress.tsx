import { createFileRoute } from "@tanstack/react-router";
import { candidateHead } from "@/lib/candidates/head";
import { MyWeeklyPage } from "@/features/execution/Portal";
import { myWeeklyQuery } from "@/features/execution/queries";

export const Route = createFileRoute("/_authenticated/portal/weekly-progress")({
  head: () => candidateHead("Weekly Progress", "Your weekly reviews and feedback from your Coding361 consultant."),
  loader: ({ context }) => context.queryClient.ensureQueryData(myWeeklyQuery),
  component: MyWeeklyPage,
});
