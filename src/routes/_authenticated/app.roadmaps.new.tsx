import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { candidateHead } from "@/lib/candidates/head";
import { NewRoadmapPage } from "@/features/roadmaps/NewRoadmap";

export const Route = createFileRoute("/_authenticated/app/roadmaps/new")({
  validateSearch: z.object({ candidate: z.string().uuid().optional() }),
  beforeLoad: requirePermission("roadmap.create"),
  head: () => candidateHead("New Roadmap", "Create an execution roadmap from an approved Personal Career Blueprint."),
  component: Page,
});
function Page() {
  const { candidate } = Route.useSearch();
  return <NewRoadmapPage candidate={candidate} />;
}
