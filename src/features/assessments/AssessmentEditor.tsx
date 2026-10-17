import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader, Panel, formatDate } from "@/components/app/shared";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { can } from "@/lib/rbac/permissions";
import { label as clabel } from "@/lib/candidates/model";
import { changeCandidateStatus } from "@/lib/candidates/candidates.functions";
import {
  DOCUMENT_TYPES,
  GAP_IMPACTS,
  OUTCOMES,
  PRIORITIES,
  RATINGS,
  SKILL_LEVELS,
  fileError,
  maxTotal,
  nextActions,
  opts,
  readyToClose,
  scoreError,
  totalScore,
  type SaveAssessment,
} from "@/lib/assessments/model";
import {
  addAssessmentDocument,
  saveAssessment,
  setAssessmentStatus,
  type AssessmentDetail,
} from "@/lib/assessments/assessments.functions";
import { detailQuery } from "@/features/candidates/queries";
import { Choice } from "@/features/candidates/Fields";
import { assessmentQuery } from "./queries";
import { AssessmentSummary, DocumentLink, ScoreBars, StatusPill } from "./AssessmentSummary";

type RowKey = "item"|"skill"|"level"|"remarks"|"current_level"|"required_level"|"priority"|"kind"|"career_path"|"target_role"|"technology_direction"|"rationale"|"path"|"reason"|"area"|"recommendation"|"estimated_focus";
type Row = Partial<Record<RowKey, string>>;
type Header = Partial<Record<string, string>> & { overall_outcome?: string; gap_impact?: string };
const SECTIONS = [
  "Candidate Snapshot",
  "Assessment Scores",
  "Strengths & Development Areas",
  "Technical Knowledge",
  "Career Preferences",
  "Career Gap",
  "Career Recommendation",
  "Skill Gaps",
  "Development Summary",
  "Consultant Summary",
  "Documents",
  "Review & Finalize",
];
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function init(a: AssessmentDetail) {
  const rec = (kind: string) => {
    const r = a.assessment_recommendations.find((x) => x.kind === kind);
    return {
      kind,
      career_path: s(r?.career_path),
      target_role: s(r?.target_role),
      technology_direction: s(r?.technology_direction),
      rationale: s(r?.rationale),
    };
  };
  return {
    header: {
      assessment_date: s(a.assessment_date),
      overall_outcome: s(a.overall_outcome),
      preferred_career: s(a.preferred_career),
      preferred_technology: s(a.preferred_technology),
      preferred_location: s(a.preferred_location),
      expected_ctc: s(a.expected_ctc),
      learning_hours_per_day: s(a.learning_hours_per_day),
      learning_days_per_week: s(a.learning_days_per_week),
      preferred_work_mode: s(a.preferred_work_mode),
      career_objective: s(a.career_objective),
      gap_impact: s(a.gap_impact),
      gap_notes: s(a.gap_notes),
      gap_mitigation: s(a.gap_mitigation),
      assessor_summary: s(a.assessor_summary),
    } as Header,
    relocation: a.open_to_relocation,
    scores: a.assessment_dimension_scores.map((d) => ({
      dimension_key: d.dimension_key,
      label: d.label,
      max_score: d.max_score,
      score: d.score === null ? null : Number(d.score),
      rating: s(d.rating),
      remarks: s(d.remarks),
    })),
    strengths: a.assessment_strengths.map((x) => ({ item: x.item })) as Row[],
    development_areas: a.assessment_development_areas.map((x) => ({ item: x.item })) as Row[],
    technical_skills: a.assessment_technical_skills.map((x) => ({
      skill: x.skill,
      level: x.level,
      remarks: s(x.remarks),
    })) as Row[],
    skill_gaps: a.assessment_skill_gaps.map((x) => ({
      skill: x.skill,
      current_level: s(x.current_level),
      required_level: s(x.required_level),
      priority: x.priority,
      remarks: s(x.remarks),
    })) as Row[],
    not_recommended: a.assessment_not_recommended_paths.map((x) => ({
      path: x.path,
      reason: s(x.reason),
    })) as Row[],
    development_plan: a.assessment_development_plan.map((x) => ({
      area: x.area,
      recommendation: s(x.recommendation),
      priority: x.priority,
      estimated_focus: s(x.estimated_focus),
    })) as Row[],
    recommendations: [rec("PRIMARY"), rec("ALTERNATIVE")] as Row[],
    internal: s(a.internal_notes),
  };
}
type FormState = ReturnType<typeof init>;
type ListKey = "strengths" | "development_areas" | "technical_skills" | "skill_gaps" | "not_recommended" | "development_plan";

function F({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{title}</Label>
      {children}
    </div>
  );
}

export function AssessmentEditor({ candidateId, id }: { candidateId: string; id: string }) {
  const { data: a } = useSuspenseQuery(assessmentQuery(id));
  const { data: cand } = useSuspenseQuery(detailQuery(candidateId));
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const [f, setF] = useState<FormState>(() => init(a));
  const [step, setStep] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [offerMove, setOfferMove] = useState(false);
  const save = useServerFn(saveAssessment);
  const setStatus = useServerFn(setAssessmentStatus);
  const addDoc = useServerFn(addAssessmentDocument);
  const moveStatus = useServerFn(changeCandidateStatus);
  const c = cand.candidate;
  const actions = nextActions(a.status, user?.role_key === "super_admin");
  const editable = actions.canEdit && can(user, "assessment.edit");
  const showInternal = can(user, "assessment.view_internal");

  const update = (fn: (v: FormState) => FormState) => {
    setF(fn);
    setDirty(true);
  };
  const h = (k: string) => (v: string) => update((x) => ({ ...x, header: { ...x.header, [k]: v } }));
  const listSet = (k: ListKey, i: number, field: string, v: string) =>
    update((x) => ({ ...x, [k]: x[k].map((r, n) => (n === i ? { ...r, [field]: v } : r)) }));
  const listAdd = (k: ListKey, row: Row) => update((x) => ({ ...x, [k]: [...x[k], row] }));
  const listDel = (k: ListKey, i: number) => update((x) => ({ ...x, [k]: x[k].filter((_, n) => n !== i) }));

  const scoreErrors = f.scores.map((d) => scoreError(d.score, d.max_score));
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["assessment", id] }),
      qc.invalidateQueries({ queryKey: ["assessments", candidateId] }),
      qc.invalidateQueries({ queryKey: ["candidate", candidateId] }),
    ]);

  const doSave = async (quiet = false) => {
    if (scoreErrors.some(Boolean)) {
      toast.error("Fix the scores that exceed their maximum");
      setStep(1);
      return false;
    }
    const payload: SaveAssessment = {
      id,
      header: { ...f.header, open_to_relocation: f.relocation },
      children: {
        scores: f.scores.map((d) => ({
          dimension_key: d.dimension_key,
          score: d.score,
          rating: d.rating || null,
          remarks: d.remarks || null,
        })),
        strengths: f.strengths.map((r) => ({ item: r.item ?? "" })),
        development_areas: f.development_areas.map((r) => ({ item: r.item ?? "" })),
        technical_skills: f.technical_skills.map((r) => ({ skill: r.skill ?? "", level: r.level || "NONE", remarks: r.remarks || null })),
        skill_gaps: f.skill_gaps.map((r) => ({
          skill: r.skill ?? "",
          current_level: r.current_level || null,
          required_level: r.required_level || null,
          priority: r.priority || "MEDIUM",
          remarks: r.remarks || null,
        })),
        recommendations: f.recommendations.map((r) => ({
          kind: r.kind as "PRIMARY" | "ALTERNATIVE",
          career_path: r.career_path || null,
          target_role: r.target_role || null,
          technology_direction: r.technology_direction || null,
          rationale: r.rationale || null,
        })),
        not_recommended: f.not_recommended.map((r) => ({ path: r.path ?? "", reason: r.reason || null })),
        development_plan: f.development_plan.map((r) => ({
          area: r.area ?? "",
          recommendation: r.recommendation || null,
          priority: r.priority || "MEDIUM",
          estimated_focus: r.estimated_focus || null,
        })),
      },
      internal: showInternal ? f.internal : null,
    };
    setBusy(true);
    try {
      await save({ data: payload });
      setDirty(false);
      await refresh();
      if (!quiet) toast.success("Assessment saved");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const transition = async (status: "COMPLETED" | "FINALIZED") => {
    if (!readyToClose(f.scores, f.header.overall_outcome || null)) {
      toast.error("Enter every dimension score and the assessment outcome first");
      return;
    }
    if (editable && dirty && !(await doSave(true))) return;
    setBusy(true);
    try {
      await setStatus({ data: { id, status } });
      await refresh();
      if (status === "FINALIZED") {
        toast.success("Assessment finalized successfully.");
        if (c.journey_status === "ENROLLED" && can(user, "candidates.status")) setOfferMove(true);
      } else toast.success("Assessment marked completed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update status");
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };

  const edu = cand.education[cand.education.length - 1];
  const job = cand.employment.find((e) => e.currently_working) ?? cand.employment[cand.employment.length - 1];
  const total = totalScore(f.scores);

  const listRows = (k: ListKey, fields: { key: RowKey; title: string; options?: readonly string[]; wide?: boolean }[], blank: Row, addLabel: string) => (
    <div className="space-y-3">
      {f[k].map((r, i) => (
        <div key={i} className="flex flex-wrap items-end gap-3 rounded-md border p-3">
          {fields.map((fd) => (
            <div key={fd.key} className={fd.wide ? "min-w-[14rem] flex-[2]" : "min-w-[9rem] flex-1"}>
              {fd.options ? (
                <Choice title={fd.title} value={r[fd.key] ?? ""} onChange={(v) => listSet(k, i, fd.key, v)} items={opts(fd.options)} />
              ) : (
                <F title={fd.title}>
                  <Input disabled={!editable} value={r[fd.key] ?? ""} onChange={(e) => listSet(k, i, fd.key, e.target.value)} />
                </F>
              )}
            </div>
          ))}
          {editable && (
            <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => listDel(k, i)}>
              <Trash2 />
            </Button>
          )}
        </div>
      ))}
      {!f[k].length && <p className="text-sm text-muted-foreground">Nothing added yet.</p>}
      {editable && (
        <Button variant="outline" size="sm" onClick={() => listAdd(k, blank)}>
          <Plus /> {addLabel}
        </Button>
      )}
    </div>
  );
  const textField = (k: string, title: string, area = false, placeholder?: string) => (
    <F title={title}>
      {area ? (
        <Textarea disabled={!editable} rows={5} placeholder={placeholder} value={f.header[k] ?? ""} onChange={(e) => h(k)(e.target.value)} />
      ) : (
        <Input disabled={!editable} value={f.header[k] ?? ""} onChange={(e) => h(k)(e.target.value)} />
      )}
    </F>
  );
  const recField = (i: number, k: RowKey, title: string, area = false) => {
    const v = f.recommendations[i]?.[k] ?? "";
    const set = (val: string) =>
      update((x) => ({ ...x, recommendations: x.recommendations.map((r, n) => (n === i ? { ...r, [k]: val } : r)) }));
    return (
      <F title={title}>
        {area ? <Textarea disabled={!editable} rows={4} value={v} onChange={(e) => set(e.target.value)} /> : <Input disabled={!editable} value={v} onChange={(e) => set(e.target.value)} />}
      </F>
    );
  };

  const body = () => {
    switch (step) {
      case 0:
        return (
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Candidate Name", c.full_name],
              ["Candidate ID", c.candidate_code],
              ["Education", edu ? [edu.degree, edu.specialization, edu.institution].filter(Boolean).join(", ") : "—"],
              ["Employment Status", clabel(c.employment_status)],
              ["Total Experience", c.total_experience !== null ? `${c.total_experience} years` : "—"],
              ["Current / Last Role", c.last_designation || job?.designation || "—"],
              ["Career Gap", c.has_career_gap ? c.gap_duration || "Yes" : "No"],
              ["Existing Skills", c.existing_skills || "—"],
              ["Candidate Preferred Role", c.candidate_preferred_role || "—"],
              ["Preferred Location", c.preferred_locations || "—"],
              ["Expected CTC", c.expected_ctc || "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="mt-1 text-sm">{v}</dd>
              </div>
            ))}
            <p className="text-xs text-muted-foreground sm:col-span-full">Read-only — Candidate Master remains the source of truth.</p>
          </dl>
        );
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Consultant observations from the in-person assessment. This is not an IQ test.</p>
            {f.scores.map((d, i) => (
              <div key={d.dimension_key} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_7rem_10rem_2fr]">
                <div className="self-center text-sm font-medium">
                  {d.label}
                  <span className="ml-1 text-muted-foreground">/ {d.max_score}</span>
                </div>
                <F title="Score">
                  <Input
                    type="number"
                    min={0}
                    max={d.max_score}
                    step="0.5"
                    disabled={!editable}
                    aria-invalid={!!scoreErrors[i]}
                    value={d.score ?? ""}
                    onChange={(e) =>
                      update((x) => ({
                        ...x,
                        scores: x.scores.map((y, n) => (n === i ? { ...y, score: e.target.value === "" ? null : Number(e.target.value) } : y)),
                      }))
                    }
                  />
                  {scoreErrors[i] && <p className="text-xs text-destructive">{scoreErrors[i]}</p>}
                </F>
                <Choice
                  title="Rating"
                  value={d.rating}
                  items={opts(RATINGS)}
                  onChange={(v) => update((x) => ({ ...x, scores: x.scores.map((y, n) => (n === i ? { ...y, rating: v } : y)) }))}
                />
                <F title="Assessor Remarks">
                  <Input
                    disabled={!editable}
                    value={d.remarks}
                    onChange={(e) => update((x) => ({ ...x, scores: x.scores.map((y, n) => (n === i ? { ...y, remarks: e.target.value } : y)) }))}
                  />
                </F>
              </div>
            ))}
            <p className="text-right text-sm font-semibold">
              Overall Score: {total ?? "—"} / {maxTotal(f.scores)}
            </p>
          </div>
        );
      case 2:
        return (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 font-medium">Strengths</h3>
              {listRows("strengths", [{ key: "item", title: "Strength", wide: true }], { item: "" }, "Add strength")}
            </div>
            <div>
              <h3 className="mb-3 font-medium">Development Areas</h3>
              {listRows("development_areas", [{ key: "item", title: "Development area", wide: true }], { item: "" }, "Add area")}
            </div>
          </div>
        );
      case 3:
        return (
          <>
            <p className="mb-4 text-sm text-muted-foreground">Assessment-time observation. Candidate Master skills are not changed.</p>
            {listRows(
              "technical_skills",
              [
                { key: "skill", title: "Skill / Technology" },
                { key: "level", title: "Level", options: SKILL_LEVELS },
                { key: "remarks", title: "Remarks", wide: true },
              ],
              { skill: "", level: "NONE", remarks: "" },
              "Add skill",
            )}
          </>
        );
      case 4:
        return (
          <div className="grid gap-4 md:grid-cols-2">
            {textField("preferred_career", "Candidate Preferred Career")}
            {textField("preferred_technology", "Candidate Preferred Technology")}
            {textField("preferred_location", "Preferred Job Location")}
            {textField("expected_ctc", "Expected CTC")}
            {textField("learning_hours_per_day", "Available Learning Hours Per Day")}
            {textField("learning_days_per_week", "Available Learning Days Per Week")}
            {textField("preferred_work_mode", "Preferred Work Mode")}
            <div className="flex items-center gap-3 self-end pb-2">
              <Switch disabled={!editable} checked={f.relocation} onCheckedChange={(v) => update((x) => ({ ...x, relocation: v }))} id="reloc" />
              <Label htmlFor="reloc">Open to Relocation</Label>
            </div>
            <div className="md:col-span-2">{textField("career_objective", "Career Objective / Candidate Expectation", true)}</div>
            <p className="text-xs text-muted-foreground md:col-span-2">Prefilled from Candidate Master. Changes here do not update Candidate Master.</p>
          </div>
        );
      case 5:
        return !c.has_career_gap ? (
          <p className="text-sm text-muted-foreground">Candidate Master does not record a career gap.</p>
        ) : (
          <div className="space-y-4">
            <dl className="grid gap-3 rounded-md bg-muted/50 p-4 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-muted-foreground">Period</dt><dd>{formatDate(c.gap_start_date)} – {c.currently_in_gap ? "Present" : formatDate(c.gap_end_date)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Duration</dt><dd>{c.gap_duration || "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Reason</dt><dd>{c.gap_reason ? clabel(c.gap_reason) : "—"}</dd></div>
            </dl>
            <Choice title="Career Gap Impact" value={f.header.gap_impact ?? ""} onChange={h("gap_impact")} items={opts(GAP_IMPACTS)} />
            {textField("gap_notes", "Career Gap Discussion Notes", true)}
            {textField("gap_mitigation", "Recommended Mitigation", true, "e.g. strong project portfolio, updated skills, resume positioning")}
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <Choice title="Assessment Outcome" value={f.header.overall_outcome ?? ""} onChange={h("overall_outcome")} items={opts(OUTCOMES)} />
            <p className="-mt-4 text-xs text-muted-foreground">Career-path readiness only — not a job or employment guarantee.</p>
            <div className="grid gap-4 md:grid-cols-3">
              {recField(0, "career_path", "Primary Recommended Career Path")}
              {recField(0, "target_role", "Primary Target Role")}
              {recField(0, "technology_direction", "Recommended Technology Direction")}
              {recField(1, "career_path", "Alternative Career Path")}
              {recField(1, "target_role", "Alternative Target Role")}
            </div>
            {recField(0, "rationale", "Recommendation Rationale", true)}
            <div>
              <h3 className="mb-3 font-medium">Not Recommended Currently (optional)</h3>
              {listRows("not_recommended", [{ key: "path", title: "Career path" }, { key: "reason", title: "Reason", wide: true }], { path: "", reason: "" }, "Add path")}
            </div>
          </div>
        );
      case 7:
        return listRows(
          "skill_gaps",
          [
            { key: "skill", title: "Skill / Capability" },
            { key: "current_level", title: "Current Level" },
            { key: "required_level", title: "Required Level" },
            { key: "priority", title: "Priority", options: PRIORITIES },
            { key: "remarks", title: "Assessor Remarks", wide: true },
          ],
          { skill: "", current_level: "", required_level: "", priority: "MEDIUM", remarks: "" },
          "Add skill gap",
        );
      case 8:
        return (
          <>
            <p className="mb-4 text-sm text-muted-foreground">A summary only — the 60-day roadmap is created later.</p>
            {listRows(
              "development_plan",
              [
                { key: "area", title: "Area" },
                { key: "recommendation", title: "Recommendation", wide: true },
                { key: "priority", title: "Priority", options: PRIORITIES },
                { key: "estimated_focus", title: "Estimated Focus" },
              ],
              { area: "", recommendation: "", priority: "MEDIUM", estimated_focus: "" },
              "Add area",
            )}
          </>
        );
      case 9:
        return (
          <div className="space-y-4">
            {textField(
              "assessor_summary",
              "Assessor Summary",
              true,
              "Summarize the candidate's current position, career suitability, major strengths, limitations, recommended direction and important conditions for successful transition.",
            )}
            {showInternal && (
              <F title="Internal Notes (never visible to candidates)">
                <Textarea disabled={!editable} rows={4} value={f.internal} onChange={(e) => update((x) => ({ ...x, internal: e.target.value }))} />
              </F>
            )}
          </div>
        );
      case 10:
        return <Documents a={a} canUpload={can(user, "assessment.documents")} onAdd={addDoc} onDone={refresh} candidateId={candidateId} />;
      default:
        return (
          <div className="space-y-5">
            {dirty && <p className="rounded-md bg-muted p-3 text-sm">You have unsaved changes. Save them before reviewing.</p>}
            <AssessmentSummary a={a} />
          </div>
        );
    }
  };

  return (
    <>
      <PageHeader
        crumbs={["Candidates", c.candidate_code, "Assessment"]}
        title={a.assessment_code}
        description={`${a.assessment_type === "INITIAL" ? "Initial assessment" : "Reassessment"} · ${c.full_name}`}
        actions={
          <Button variant="outline" asChild>
            <Link to="/app/candidates/$id" params={{ id: candidateId }}>
              <ArrowLeft /> Candidate 360°
            </Link>
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <StatusPill status={a.status} />
        <span className="text-sm text-muted-foreground">Score {total ?? "—"} / {maxTotal(f.scores)}</span>
        {a.status === "FINALIZED" && !editable && <span className="text-sm text-muted-foreground">Finalized — use a reassessment for further changes.</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          {editable && (
            <Button variant="outline" onClick={() => doSave()} disabled={busy || !dirty}>
              Save Draft
            </Button>
          )}
          {actions.canComplete && can(user, "assessment.complete") && (
            <Button variant="outline" onClick={() => transition("COMPLETED")} disabled={busy}>
              Complete Assessment
            </Button>
          )}
          {actions.canFinalize && can(user, "assessment.finalize") && (
            <Button onClick={() => setConfirm(true)} disabled={busy}>
              Finalize Assessment
            </Button>
          )}
        </div>
      </div>
      {offerMove && (
        <Panel className="mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm">Assessment finalized successfully. The candidate is currently Enrolled.</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOfferMove(false)}>Not now</Button>
            <Button
              onClick={async () => {
                try {
                  await moveStatus({ data: { id: candidateId, status: "ASSESSMENT_COMPLETED", remarks: `Assessment ${a.assessment_code} finalized` } });
                  await refresh();
                  setOfferMove(false);
                  toast.success("Candidate moved to Assessment Completed");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not change status");
                }
              }}
            >
              Move Candidate to Assessment Completed
            </Button>
          </div>
        </Panel>
      )}
      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {SECTIONS.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setStep(i)}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-left text-sm ${step === i ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {i + 1}. {t}
            </button>
          ))}
        </nav>
        <Panel className="p-5 sm:p-6">
          <h2 className="mb-5 text-lg font-semibold">{SECTIONS[step]}</h2>
          {step === 1 && !editable ? <ScoreBars scores={a.assessment_dimension_scores} /> : body()}
          <div className="mt-6 flex justify-between border-t pt-4">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Previous</Button>
            <Button variant="ghost" disabled={step === SECTIONS.length - 1} onClick={() => setStep(step + 1)}>Next</Button>
          </div>
        </Panel>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize this Career Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              Once finalized, this assessment becomes the official input for career recommendation and PCB preparation. Future changes should be handled through reassessment or controlled authorized correction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void transition("FINALIZED"); }} disabled={busy}>
              Finalize
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Documents({
  a,
  canUpload,
  onAdd,
  onDone,
  candidateId,
}: {
  a: AssessmentDetail;
  canUpload: boolean;
  onAdd: (o: { data: { id: string; name: string; type: string; path: string; file: string; mime: string; size: number; remarks: string } }) => Promise<unknown>;
  onDone: () => Promise<unknown>;
  candidateId: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState(DOCUMENT_TYPES[0]!);
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const upload = async (): Promise<void> => {
    if (!file) { toast.error("Choose a file"); return; }
    const err = fileError(file.name, file.size);
    if (err) { toast.error(err); return; }
    setBusy(true);
    const safe = file.name.replace(/[^\w.-]+/g, "_");
    const path = `${candidateId}/${a.id}/${crypto.randomUUID()}-${safe}`;
    const { error } = await supabase.storage.from("assessment-documents").upload(path, file, { contentType: file.type });
    if (error) {
      setBusy(false);
      toast.error("Upload failed");
      return;
    }
    try {
      await onAdd({ data: { id: a.id, name: name || file.name, type, path, file: file.name, mime: file.type, size: file.size, remarks } });
      await onDone();
      setFile(null);
      setName("");
      setRemarks("");
      toast.success("Document uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save document");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      {a.assessment_documents.length ? (
        <ul className="divide-y rounded-md border">
          {a.assessment_documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
              <DocumentLink path={d.storage_path} name={d.document_name} />
              <span className="text-xs text-muted-foreground">
                {d.document_type} · {(d.uploaded_by && a.names[d.uploaded_by]) || "—"} · {formatDate(d.uploaded_at)}
              </span>
              {d.remarks && <span className="w-full text-xs text-muted-foreground">{d.remarks}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No documents uploaded.</p>
      )}
      {canUpload && (
        <div className="grid gap-3 rounded-md border p-4 md:grid-cols-2">
          <F title="Document Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></F>
          <Choice title="Document Type" value={type} onChange={(v) => setType(v || DOCUMENT_TYPES[0]!)} items={DOCUMENT_TYPES.map((t) => ({ value: t, label: t }))} />
          <F title="File (PDF, DOC/DOCX, XLS/XLSX, JPG, PNG · max 10 MB)">
            <Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </F>
          <F title="Remarks"><Input value={remarks} onChange={(e) => setRemarks(e.target.value)} /></F>
          <div className="md:col-span-2">
            <Button onClick={upload} disabled={busy}><Upload /> Upload Document</Button>
          </div>
        </div>
      )}
    </div>
  );
}
