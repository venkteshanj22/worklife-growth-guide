import { createFileRoute } from "@tanstack/react-router";
import { requirePermission } from "@/lib/auth/guards";
import { candidateHead } from "@/lib/candidates/head";
import { GlobalContentPage } from "@/features/tracks/GlobalContentPage";
import { globalContentQuery } from "@/features/tracks/queries";

export const Route = createFileRoute("/_authenticated/app/pcb-content")({
  beforeLoad: requirePermission("global_pcb_content.view"),
  head: () => candidateHead("Global PCB Content", "Reusable, versioned content shared across all future Personal Career Blueprints."),
  loader: ({ context }) => context.queryClient.ensureQueryData(globalContentQuery),
  component: GlobalContentPage,
});
