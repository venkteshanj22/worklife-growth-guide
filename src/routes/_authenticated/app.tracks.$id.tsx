import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { candidateHead } from "@/lib/candidates/head";
import { Panel } from "@/components/app/shared";
import { TrackEditor } from "@/features/tracks/TrackEditor";
import { trackQuery } from "@/features/tracks/queries";

export const Route = createFileRoute("/_authenticated/app/tracks/$id")({
  validateSearch: z.object({ v: z.string().uuid().optional() }),
  beforeLoad: requirePermission("tracks.view"),
  loaderDeps: ({ search }) => ({ v: search.v }),
  loader: ({ context, params, deps }) => context.queryClient.ensureQueryData(trackQuery(params.id, deps.v)),
  head: () => candidateHead("Master Track", "Edit a Master Track's curriculum, resources, projects and versions."),
  errorComponent: () => (
    <Panel className="p-8 text-center">
      <p className="font-medium">Track not found or access denied.</p>
      <Link to="/app/tracks" className="mt-2 inline-block text-sm text-primary hover:underline">Back to Master Tracks</Link>
    </Panel>
  ),
  component: TrackPage,
});

function TrackPage() {
  const { id } = Route.useParams();
  const { v } = Route.useSearch();
  return <TrackEditor id={id} v={v} />;
}
