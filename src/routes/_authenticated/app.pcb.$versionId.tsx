import { createFileRoute, Link } from "@tanstack/react-router";
import { requirePermission } from "@/lib/auth/guards";
import { candidateHead } from "@/lib/candidates/head";
import { Panel } from "@/components/app/shared";
import { PcbEditor } from "@/features/pcb/PcbEditor";
import { pcbQuery } from "@/features/pcb/queries";

export const Route = createFileRoute("/_authenticated/app/pcb/$versionId")({
  beforeLoad: requirePermission("pcb.view"),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(pcbQuery(params.versionId)),
  head: () => candidateHead("PCB Editor", "Personalize, review and approve a candidate's Personal Career Blueprint."),
  errorComponent: () => (
    <Panel className="p-8 text-center">
      <p className="font-medium">PCB not found or access denied.</p>
      <Link to="/app/pcb/library" className="mt-2 inline-block text-sm text-primary hover:underline">Back to PCB Library</Link>
    </Panel>
  ),
  component: () => <PcbEditor versionId={Route.useParams().versionId} />,
});
