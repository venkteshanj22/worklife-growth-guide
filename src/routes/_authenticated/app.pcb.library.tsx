import { createFileRoute } from "@tanstack/react-router";
import { requirePermission } from "@/lib/auth/guards";
import { candidateHead } from "@/lib/candidates/head";
import { PcbLibraryPage } from "@/features/pcb/PcbLists";
import { pcbListQuery } from "@/features/pcb/queries";

export const Route = createFileRoute("/_authenticated/app/pcb/library")({
  beforeLoad: requirePermission("pcb.view"),
  head: () => candidateHead("PCB Library", "Search and filter every Personal Career Blueprint you can access."),
  loader: ({ context }) => context.queryClient.ensureQueryData(pcbListQuery),
  component: PcbLibraryPage,
});
