import { createFileRoute } from "@tanstack/react-router";
import { requirePermission } from "@/lib/auth/guards";
import { candidateHead } from "@/lib/candidates/head";
import { TrackList } from "@/features/tracks/TrackList";
import { tracksQuery } from "@/features/tracks/queries";

export const Route = createFileRoute("/_authenticated/app/tracks/")({
  beforeLoad: requirePermission("tracks.view"),
  head: () => candidateHead("Master Tracks", "Reusable Coding361 career-track templates for future Personal Career Blueprints."),
  loader: ({ context }) => context.queryClient.ensureQueryData(tracksQuery),
  component: TrackList,
});
