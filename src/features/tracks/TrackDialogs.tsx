import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RowDialog } from "./RowDialog";
import { CATEGORIES, suggestNextVersion, validateNextVersion } from "@/lib/tracks/model";
import { createTrack, createTrackVersion, duplicateTrack } from "@/lib/tracks/tracks.functions";

const err = (e: unknown) => { toast.error(e instanceof Error ? e.message : "Something went wrong"); throw e; };

export function useTrackDialogs() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [state, setState] = useState<null | { kind: "create" } | { kind: "version"; versionId: string; trackId: string; versions: string[] } | { kind: "duplicate"; versionId: string; name: string }>(null);
  const close = () => setState(null);
  const refresh = () => qc.invalidateQueries({ predicate: (q) => ["tracks", "track", "track-options"].includes(String(q.queryKey[0])) });

  const dialog = state?.kind === "create" ? (
    <RowDialog open title="New Master Track" onClose={close} initial={{ category: "DEVELOPMENT", duration_days: 60 }}
      fields={[
        { key: "code", label: "Track code (e.g. PY-FS-GAI)", required: true },
        { key: "name", label: "Track name", required: true },
        { key: "category", label: "Category", type: "select", options: CATEGORIES, required: true },
        { key: "duration_days", label: "Duration (days)", type: "number", required: true },
      ]}
      onSave={async (r) => {
        const res = await createTrack({ data: r as never }).catch(err);
        toast.success("Track created as Draft v1.0");
        await refresh();
        nav({ to: "/app/tracks/$id", params: { id: res.id } });
      }} />
  ) : state?.kind === "version" ? (
    <RowDialog open title="Create new version" onClose={close} initial={{ version: suggestNextVersion(state.versions) }}
      fields={[{ key: "version", label: "New version number", required: true }, { key: "summary", label: "Change summary", type: "textarea" }]}
      onSave={async (r) => {
        const msg = validateNextVersion(String(r.version ?? ""), state.versions);
        if (msg) err(new Error(msg));
        const res = await createTrackVersion({ data: { versionId: state.versionId, version: String(r.version), summary: (r.summary as string) ?? null } }).catch(err);
        toast.success(`Draft v${r.version} created. Previous version is unchanged.`);
        await refresh();
        nav({ to: "/app/tracks/$id", params: { id: state.trackId }, search: { v: res.versionId } });
      }} />
  ) : state?.kind === "duplicate" ? (
    <RowDialog open title="Duplicate track" onClose={close} initial={{ name: `${state.name} (copy)` }}
      fields={[{ key: "code", label: "New track code", required: true }, { key: "name", label: "New track name", required: true }]}
      onSave={async (r) => {
        const res = await duplicateTrack({ data: { versionId: state.versionId, code: String(r.code), name: String(r.name) } }).catch(err);
        toast.success("Independent draft copy created");
        await refresh();
        nav({ to: "/app/tracks/$id", params: { id: res.id } });
      }} />
  ) : null;

  return {
    dialog,
    openCreate: () => setState({ kind: "create" }),
    openVersion: (trackId: string, versionId: string, versions: string[]) => setState({ kind: "version", trackId, versionId, versions }),
    openDuplicate: (versionId: string, name: string) => setState({ kind: "duplicate", versionId, name }),
  };
}
