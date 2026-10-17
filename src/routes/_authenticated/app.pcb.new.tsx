import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { candidateHead } from "@/lib/candidates/head";
import { PcbWizard } from "@/features/pcb/PcbWizard";

export const Route = createFileRoute("/_authenticated/app/pcb/new")({
  validateSearch: z.object({ candidate: z.string().uuid().optional() }),
  beforeLoad: requirePermission("pcb.create"),
  head: () => candidateHead("New PCB", "Create a Personal Career Blueprint from a candidate's assessment and Master Tracks."),
  component: NewPcb,
});

function NewPcb() {
  const { candidate } = Route.useSearch();
  return <PcbWizard initialCandidate={candidate} />;
}
