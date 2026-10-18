import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, formatDate } from "@/components/app/shared";
import { createRoadmap, roadmapCreatePreview, searchRoadmapCandidates } from "@/lib/roadmaps/roadmaps.functions";
import { todayIST } from "@/lib/roadmaps/model";
import { useRefreshRoadmaps } from "./parts";

export function NewRoadmapPage({ candidate }: { candidate?: string | undefined }) {
  const [cid, setCid] = useState(candidate ?? "");
  const [q, setQ] = useState("");
  const [start, setStart] = useState(todayIST());
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const refresh = useRefreshRoadmaps();
  useEffect(() => { if (candidate) setCid(candidate); }, [candidate]);
  const search = useQuery({ queryKey: ["rm-cand-search", q], queryFn: () => searchRoadmapCandidates({ data: { q } }), enabled: !cid });
  const preview = useQuery({ queryKey: ["rm-preview", cid, start], queryFn: () => roadmapCreatePreview({ data: { candidateId: cid, startDate: start } }), enabled: !!cid && /^\d{4}-\d{2}-\d{2}$/.test(start) });
  const p = preview.data;
  return (
    <>
      <PageHeader crumbs={["Delivery", "Roadmaps", "New"]} title="New Roadmap" description="Create an execution roadmap from a candidate's approved PCB." />
      <div className="max-w-3xl space-y-4">
        <Panel className="p-5">
          <h2 className="mb-3 font-semibold">1. Candidate</h2>
          {cid ? (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span>{p ? <><b>{p.candidate.full_name}</b> · {p.candidate.candidate_code}</> : "Loading…"}</span>
              {!candidate && <Button size="sm" variant="ghost" onClick={() => setCid("")}>Change</Button>}
            </div>
          ) : (
            <>
              <Input placeholder="Search by candidate ID or name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search candidates" />
              <p className="mt-2 text-xs text-muted-foreground">Only candidates with an approved PCB are listed.</p>
              <ul className="mt-3 divide-y rounded-md border">
                {(search.data ?? []).map((c) => (
                  <li key={c.id}><button type="button" className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => setCid(c.id)}><span>{c.full_name}</span><span className="text-muted-foreground">{c.candidate_code}</span></button></li>
                ))}
                {search.data?.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted-foreground">No matching candidates with an approved PCB.</li>}
              </ul>
            </>
          )}
        </Panel>
        {cid && (
          <Panel className="p-5">
            <h2 className="mb-3 font-semibold">2. Approved PCB & start date</h2>
            {preview.error && <p className="text-sm text-destructive">{(preview.error as Error).message}</p>}
            {p && !p.pcb && <p className="text-sm text-muted-foreground">This candidate has no approved PCB yet. A roadmap can only be created from an Approved PCB.</p>}
            {p?.open && <p className="mb-3 rounded-md bg-danger-soft p-3 text-sm text-destructive">This candidate already has an open roadmap ({p.open.code}). <Link to="/app/roadmaps/$id" params={{ id: p.open.id }} className="underline">Open it</Link></p>}
            {p?.pcb && p.preview && (
              <>
                <p className="mb-3 text-sm">Source: <b>{p.pcb.code} · V{p.pcb.version}</b> (approved {formatDate(p.pcb.approved_at)})</p>
                <label className="text-sm">Roadmap start date<Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 w-48" /></label>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  {[["Career path", p.preview.career_path ?? "—"], ["Target role", p.preview.target_role ?? "—"], ["Duration", `${p.preview.duration_days} days`],
                    ["Daily hours", p.preview.daily_hours ?? "—"], ["Learning days / week", p.preview.weekly_days], ["Target end date", formatDate(p.preview.target_end_date)],
                    ["Phases", p.preview.phases], ["Modules", p.preview.modules], ["Day items", `${p.preview.day_items} (${p.preview.learning_days} learning days)`], ["Resources", p.preview.resources]].map(([k, v]) => (
                    <div key={String(k)}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{String(v)}</dd></div>
                  ))}
                </dl>
                <p className="mt-4 text-xs text-muted-foreground">The PCB content is copied into the roadmap. Later PCB or Master Track changes will not change this roadmap.</p>
                <Button className="mt-4" disabled={busy || !!p.open || p.preview.day_items === 0} onClick={async () => {
                  setBusy(true);
                  try {
                    const r = await createRoadmap({ data: { candidateId: cid, pcbVersionId: p.pcb!.version_id, startDate: start } });
                    toast.success(`Roadmap ${r.code} created`); await refresh();
                    nav({ to: "/app/roadmaps/$id", params: { id: r.id } });
                  } catch (e) { toast.error(e instanceof Error ? e.message : "Could not create roadmap"); } finally { setBusy(false); }
                }}>{busy ? "Creating…" : "Create Roadmap"}</Button>
              </>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}
