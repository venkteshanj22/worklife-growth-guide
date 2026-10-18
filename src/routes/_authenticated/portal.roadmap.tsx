import { createFileRoute } from "@tanstack/react-router";
import { candidateHead } from "@/lib/candidates/head";
import { MyRoadmapPage } from "@/features/roadmaps/MyRoadmap";
import { myRoadmapQuery } from "@/features/roadmaps/queries";

export const Route = createFileRoute("/_authenticated/portal/roadmap")({
  head: () => candidateHead("My Roadmap", "Your daily Coding361 learning roadmap and progress."),
  loader: ({ context }) => context.queryClient.ensureQueryData(myRoadmapQuery),
  component: MyRoadmapPage,
});
