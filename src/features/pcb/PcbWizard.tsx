import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Check, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Panel, formatDate } from "@/components/app/shared";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { can } from "@/lib/rbac/permissions";
import { createPcb, pcbTrackContent, pcbWizardContext, searchPcbCandidates } from "@/lib/pcb/pcb.functions";
import { CAN_MOVE_TO_PREPARATION } from "@/lib/pcb/model";
import { Field } from "./parts";
import { TrackPicker, emptySel, selCount, type Sel } from "./ImportDialog";
import { JourneyOffer } from "./JourneyOffer";

const STEPS = ["Candidate", "Assessment", "Base Master Track", "Additional Content", "PCB Setup", "Create Draft"];
const lbl = (s?: string | null) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "");

export function PcbWizard({ initialCandidate }: { initialCandidate?: string | undefined }) {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [step, setStep] = useState(initialCandidate ? 1 : 0);
  const [candidateId, setCandidateId] = useState(initialCandidate ?? "");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => { const t = setTimeout(() => setTerm(q), 300); return () => clearTimeout(t); }, [q]);
  const search = useQuery({ queryKey: ["pcb-cand-search", term], queryFn: () => searchPcbCandidates({ data: { q: term } }), enabled: step === 0 });
  const ctx = useQuery({ queryKey: ["pcb-wizard", candidateId], queryFn: () => pcbWizardContext({ data: { candidateId } }), enabled: !!candidateId });
  const [override, setOverride] = useState("");
  const [trackVersion, setTrackVersion] = useState("");
  const [include, setInclude] = useState({ curriculum: true, resources: true, milestones: true, projects: true, weekly: true, content: true });
  const [extraTv, setExtraTv] = useState("");
  const [extras, setExtras] = useState<Record<string, Sel>>({});
  const extraContent = useQuery({ queryKey: ["pcb-track-content", extraTv], queryFn: () => pcbTrackContent({ data: { trackVersionId: extraTv } }), enabled: !!extraTv });
  const [setup, setSetup] = useState({ target_duration_days: 60, daily_hours: "" as string | number, weekly_days: "" as string | number, target_completion_window: "" });
  const [busy, setBusy] = useState(false);
  const [offer, setOffer] = useState<{ candidateId: string; status: "PCB_PREPARATION" } | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const d = ctx.data;
  const active = useMemo(() => (d?.tracks ?? []).filter((t) => t.status === "ACTIVE"), [d]);
  // Preselect the track mapped from the primary recommendation.
  useEffect(() => {
    if (!d || trackVersion) return;
    const mapped = d.assessment?.primary.master_track_id;
    const tv = active.find((t) => t.track_id === mapped);
    if (tv) setTrackVersion(tv.id);
  }, [d, active, trackVersion]);
  const base = active.find((t) => t.id === trackVersion);
  useEffect(() => {
    if (base) setSetup((s) => ({ ...s, target_duration_days: base.duration_days, daily_hours: base.daily_hours ?? "", weekly_days: base.weekly_days ?? "" }));
  }, [base]);

  const blocked = d && !d.assessment && (!can(user, "pcb.override_assessment") || override.trim().length < 5);
  const canNext = [!!candidateId && !!d && !d.existing, !blocked, !!base, true, setup.target_duration_days > 0, true][step];

  const submit = async () => {
    setBusy(true);
    try {
      const r = await createPcb({ data: {
        candidateId, trackVersionId: trackVersion, include,
        extra: Object.entries(extras).filter(([, s]) => selCount(s)).map(([trackVersionId, selection]) => ({ trackVersionId, selection })),
        target_duration_days: Number(setup.target_duration_days), daily_hours: setup.daily_hours === "" ? null : Number(setup.daily_hours),
        weekly_days: setup.weekly_days === "" ? null : Number(setup.weekly_days), target_completion_window: setup.target_completion_window || null,
        overrideReason: d?.assessment ? null : override,
      } });
      toast.success(`${r.pcbCode}-V${r.version} created`);
      if (CAN_MOVE_TO_PREPARATION.includes(r.journey) && can(user, "candidates.status")) { setCreatedId(r.versionId); setOffer({ candidateId, status: "PCB_PREPARATION" }); }
      else navigate({ to: "/app/pcb/$versionId", params: { versionId: r.versionId } });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not create PCB"); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader crumbs={["PCB Studio", "PCB Builder", "New PCB"]} title="New Personal Career Blueprint" description="Build a candidate-specific blueprint from their assessment and Master Track content." />
      <ol className="mb-6 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className={cn("flex items-center gap-2 rounded-full border px-3 py-1 text-xs", i === step ? "border-primary bg-primary text-primary-foreground" : i < step ? "bg-muted" : "text-muted-foreground")}>
            {i < step ? <Check className="size-3" /> : <span>{i + 1}</span>} {s}
          </li>
        ))}
      </ol>
      <Panel className="p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search by candidate ID, name, mobile or email" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <ul className="divide-y rounded-md border">
              {(search.data ?? []).map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setCandidateId(c.id)} className={cn("flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-muted", candidateId === c.id && "bg-accent")}>
                    <span><span className="font-medium">{c.full_name}</span> <span className="ml-2 text-muted-foreground">{c.candidate_code}</span></span>
                    <span className="text-xs text-muted-foreground">{lbl(c.journey_status)}</span>
                  </button>
                </li>
              ))}
              {search.data?.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">No candidates you can access match.</li>}
            </ul>
            {d?.existing && <p className="text-sm text-destructive">This candidate already has {d.existing.pcb_code}. Open it from the candidate's PCB tab or the PCB Library.</p>}
          </div>
        )}
        {ctx.isLoading && <p className="text-sm text-muted-foreground">Loading candidate…</p>}
        {ctx.error && <p className="text-sm text-destructive">{ctx.error.message}</p>}
        {step >= 1 && d && step < 5 && (
          <div className="mb-5 rounded-md bg-muted/50 px-4 py-3 text-sm"><span className="font-medium">{d.candidate.full_name}</span> <span className="ml-2 text-muted-foreground">{d.candidate.candidate_code}</span></div>
        )}
        {step === 1 && d && (
          <div className="space-y-5">
            <h2 className="font-semibold">Candidate snapshot</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Education">{d.candidate.education.join("; ")}</Field>
              <Field label="Employment status">{lbl(d.candidate.employment_status)}</Field>
              <Field label="Experience">{d.candidate.total_experience != null ? `${d.candidate.total_experience} yrs` : ""}</Field>
              <Field label="Current / last role">{d.candidate.last_designation}</Field>
              <Field label="Career gap">{d.candidate.has_career_gap ? d.candidate.gap_duration || "Yes" : "No"}</Field>
              <Field label="Existing skills">{d.candidate.existing_skills}</Field>
              <Field label="Preferred role">{d.candidate.candidate_preferred_role}</Field>
              <Field label="Preferred location">{d.candidate.preferred_locations}</Field>
              <Field label="Expected CTC">{d.candidate.expected_ctc}</Field>
              <Field label="Program plan">{lbl(d.candidate.program_plan)}</Field>
              <Field label="Enrollment date">{formatDate(d.candidate.enrollment_date)}</Field>
            </div>
            <h2 className="border-t pt-5 font-semibold">Assessment</h2>
            {d.assessment ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Assessment">{d.assessment.assessment_code} · {formatDate(d.assessment.assessment_date)}</Field>
                <Field label="Overall score">{d.assessment.overall_score != null ? `${d.assessment.overall_score} / 100` : ""}</Field>
                <Field label="Outcome">{lbl(d.assessment.outcome)}</Field>
                <Field label="Primary recommendation">{d.assessment.primary.career_path} {d.assessment.primary.target_role && `→ ${d.assessment.primary.target_role}`}</Field>
                <Field label="Alternative">{d.assessment.alternative.career_path} {d.assessment.alternative.target_role && `→ ${d.assessment.alternative.target_role}`}</Field>
                <Field label="Skill gaps">{d.assessment.skill_gaps.map((g) => g.skill).join(", ")}</Field>
                <Field label="Strengths">{d.assessment.strengths.join(", ")}</Field>
                <Field label="Development areas">{d.assessment.development_areas.join(", ")}</Field>
                <Field label="Consultant summary">{d.assessment.summary}</Field>
              </div>
            ) : (
              <div className="rounded-md border border-destructive/40 bg-danger-soft p-4 text-sm">
                <p className="flex items-center gap-2 font-medium text-destructive"><AlertTriangle className="size-4" /> This candidate does not have a finalized Career Assessment.</p>
                {can(user, "pcb.override_assessment") ? (
                  <div className="mt-3">
                    <Label htmlFor="ov" className="text-xs">Override reason (required, recorded in audit)</Label>
                    <Textarea id="ov" rows={2} value={override} onChange={(e) => setOverride(e.target.value)} />
                  </div>
                ) : <p className="mt-2 text-muted-foreground">Finalize the assessment first, or ask an Operations Manager to override.</p>}
              </div>
            )}
          </div>
        )}
        {step === 2 && d && (
          <div className="space-y-3">
            <h2 className="font-semibold">Choose the base Master Track</h2>
            {d.assessment?.primary.master_track_id && <p className="text-xs text-muted-foreground">The track mapped from the primary recommendation is preselected.</p>}
            {!active.length && <p className="text-sm text-muted-foreground">No Master Track is Active yet. Activate one in Master Tracks first.</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {active.map((t) => (
                <button key={t.id} type="button" onClick={() => setTrackVersion(t.id)} className={cn("rounded-md border p-4 text-left text-sm hover:border-primary", trackVersion === t.id && "border-primary ring-1 ring-primary")}>
                  <p className="font-medium">{t.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.code} · v{t.version} · {t.duration_days} days{t.primary_role ? ` · ${t.primary_role}` : ""}</p>
                  {t.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>}
                </button>
              ))}
            </div>
            {base && (
              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-medium">Copy from {base.code}</p>
                <div className="flex flex-wrap gap-4">
                  {([["curriculum", "Curriculum"], ["resources", "Resources"], ["milestones", "Milestones"], ["projects", "Projects"], ["weekly", "Weekly review templates"], ["content", "Track PCB content"]] as const).map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2 text-sm"><Checkbox checked={include[k]} onCheckedChange={(c) => setInclude({ ...include, [k]: c === true })} />{l}</label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {step === 3 && d && (
          <div className="space-y-3">
            <h2 className="font-semibold">Optional: add content from other Master Tracks</h2>
            <p className="text-xs text-muted-foreground">Pick modules, items or resources from any track version. You can also do this later in the editor.</p>
            <select aria-label="Track version" value={extraTv} onChange={(e) => setExtraTv(e.target.value)} className="h-9 w-full max-w-md rounded-md border bg-background px-2 text-sm">
              <option value="">Choose a track…</option>
              {d.tracks.filter((t) => t.id !== trackVersion).map((t) => <option key={t.id} value={t.id}>{t.code} — {t.name} v{t.version} ({t.status.toLowerCase()})</option>)}
            </select>
            {extraContent.data && <TrackPicker content={extraContent.data} sel={extras[extraTv] ?? emptySel()} setSel={(s) => setExtras({ ...extras, [extraTv]: s })} />}
            {Object.entries(extras).filter(([, s]) => selCount(s)).map(([id, s]) => (
              <p key={id} className="text-xs text-muted-foreground">{d.tracks.find((t) => t.id === id)?.code}: {selCount(s)} selected</p>
            ))}
          </div>
        )}
        {step === 4 && (
          <div className="grid max-w-xl gap-4 sm:grid-cols-2">
            <div><Label className="text-xs">Target duration (days)</Label><Input type="number" value={setup.target_duration_days} onChange={(e) => setSetup({ ...setup, target_duration_days: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Recommended daily hours</Label><Input type="number" value={setup.daily_hours} onChange={(e) => setSetup({ ...setup, daily_hours: e.target.value })} /></div>
            <div><Label className="text-xs">Recommended weekly days</Label><Input type="number" value={setup.weekly_days} onChange={(e) => setSetup({ ...setup, weekly_days: e.target.value })} /></div>
            <div><Label className="text-xs">Target completion window</Label><Input placeholder="e.g. Dec 2026 – Feb 2027" value={setup.target_completion_window} onChange={(e) => setSetup({ ...setup, target_completion_window: e.target.value })} /></div>
          </div>
        )}
        {step === 5 && d && base && (
          <div className="space-y-3 text-sm">
            <h2 className="font-semibold">Ready to create the draft</h2>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>Candidate: {d.candidate.full_name} ({d.candidate.candidate_code})</li>
              <li>Assessment: {d.assessment ? d.assessment.assessment_code : "None — override with reason"}</li>
              <li>Base track: {base.code} v{base.version} ({Object.entries(include).filter(([, v]) => v).map(([k]) => k).join(", ")})</li>
              <li>Additional selections: {Object.values(extras).reduce((n, s) => n + selCount(s), 0)}</li>
              <li>Duration: {setup.target_duration_days} days</li>
            </ul>
            <p className="text-xs text-muted-foreground">All content is copied into the PCB. Later changes to Master Tracks will not affect it.</p>
          </div>
        )}
        <div className="mt-8 flex justify-between border-t pt-4">
          {step === 0 ? <Button variant="outline" asChild><Link to="/app/pcb">Cancel</Link></Button> : <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
          {step < 5 ? <Button disabled={!canNext || ctx.isFetching} onClick={() => setStep(step + 1)}>Continue</Button> : <Button disabled={busy} onClick={submit}>{busy ? "Creating…" : "Create Draft PCB"}</Button>}
        </div>
      </Panel>
      <JourneyOffer offer={offer} onClose={() => { setOffer(null); if (createdId) navigate({ to: "/app/pcb/$versionId", params: { versionId: createdId } }); }} />
    </>
  );
}
