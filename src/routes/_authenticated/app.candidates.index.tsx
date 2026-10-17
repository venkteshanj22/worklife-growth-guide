import { createFileRoute } from "@tanstack/react-router";
import { CandidateList } from "@/features/candidates/CandidateList";
import { candidatesQuery, optionsQuery } from "@/features/candidates/queries";
import { candidateHead } from "@/lib/candidates/head";
export const Route = createFileRoute("/_authenticated/app/candidates/")({
  head: () =>
    candidateHead(
      "All Candidates",
      "Candidate Master records, contacts, programs and journey statuses in CareerOS.",
    ),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(candidatesQuery()),
      context.queryClient.ensureQueryData(optionsQuery),
    ]),
  component: CandidateList,
});
