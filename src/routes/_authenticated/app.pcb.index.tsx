import { createFileRoute } from "@tanstack/react-router";
import { requirePermission } from "@/lib/auth/guards";
import { candidateHead } from "@/lib/candidates/head";
import { PcbBuilderPage } from "@/features/pcb/PcbLists";
import { pcbListQuery } from "@/features/pcb/queries";

export const Route = createFileRoute("/_authenticated/app/pcb/")({
  beforeLoad: requirePermission("pcb.view"),
  head: () => candidateHead("PCB Builder", "Working queue of Personal Career Blueprints in draft, review and approval."),
  loader: ({ context }) => context.queryClient.ensureQueryData(pcbListQuery),
  component: PcbBuilderPage,
});
