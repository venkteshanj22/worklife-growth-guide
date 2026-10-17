import { formatDate } from "@/components/app/shared";
import { pcbDisplayId, plannedDays } from "@/lib/pcb/model";
import type { PcbDetail } from "@/lib/pcb/pcb.functions";

const lbl = (s?: string | null) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "");

/** Readable document-order preview. No source labels or internal data. */
export function PcbPreview({ d }: { d: PcbDetail }) {
  const v = d.version, c = d.candidate;
  const snap = (v.assessment_snapshot ?? {}) as { assessment_id?: string; assessment_date?: string; overall_score?: number; outcome?: string; strengths?: string[]; development_areas?: string[]; summary?: string };
  const kv = (pairs: [string, unknown][]) => (
    <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-[180px_1fr]">
      {pairs.filter(([, x]) => x != null && x !== "").map(([k, x]) => <><dt key={`${k}-k`} className="text-xs font-medium text-muted-foreground">{k}</dt><dd key={`${k}-v`} className="text-sm">{String(x)}</dd></>)}
    </dl>
  );
  const data = (code: string) => {
    switch (code) {
      case "DATA_CANDIDATE": return kv([["Name", c.full_name], ["Candidate ID", c.candidate_code], ["Education", c.education.join("; ")], ["Employment status", lbl(c.employment_status)], ["Current / last role", c.last_designation], ["Existing skills", c.existing_skills], ["Preferred location", v.preferred_location]]);
      case "DATA_ASSESSMENT": return snap.assessment_id ? <>{kv([["Assessment date", formatDate(snap.assessment_date)], ["Overall score", snap.overall_score != null ? `${snap.overall_score} / 100` : ""], ["Outcome", lbl(snap.outcome)], ["Strengths", snap.strengths?.join(", ")], ["Development areas", snap.development_areas?.join(", ")]])}{snap.summary && <p className="mt-2 text-sm">{snap.summary}</p>}</> : <p className="text-sm text-muted-foreground">Prepared without a finalized assessment.</p>;
      case "DATA_DIRECTION": return kv([["Transition goal", v.transition_goal], ["Primary path", v.primary_career_path], ["Primary role", v.primary_target_role], ["Alternative path", v.alt_career_path], ["Alternative role", v.alt_target_role], ["Target industry", v.target_industry], ["Expected outcome", v.expected_outcome], ["Rationale", v.rationale]]);
      case "DATA_SKILL_GAPS": return <ul className="space-y-1 text-sm">{v.pcb_skill_gaps.map((g) => <li key={g.id}><b>{g.skill}</b> — {lbl(g.current_level)} → {lbl(g.target_level)} ({lbl(g.priority)}){g.action && `. ${g.action}`}</li>)}</ul>;
      case "DATA_CAPABILITIES": return <ul className="space-y-1 text-sm">{v.pcb_target_capabilities.map((x) => <li key={x.id}><b>{x.title}</b>{x.description && ` — ${x.description}`}{x.evidence && <span className="text-muted-foreground"> (Evidence: {x.evidence})</span>}</li>)}</ul>;
      case "DATA_RESOURCES": return <ul className="space-y-1 text-sm">{v.pcb_resources.map((r) => <li key={r.id}><b>{r.name}</b> {r.provider && `· ${r.provider}`} · {r.is_paid ? "Paid" : "Free"}</li>)}</ul>;
      case "DATA_CURRICULUM": return (
        <div className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground">{plannedDays(v.pcb_day_items)} planned days · {v.daily_hours ?? "—"} h/day · {v.weekly_days ?? "—"} days/week</p>
          {v.pcb_phases.map((p) => (
            <div key={p.id}>
              <p className="font-semibold text-primary">{p.name}</p>
              {v.pcb_modules.filter((m) => m.phase_id === p.id).map((m) => (
                <div key={m.id} className="ml-3 mt-1">
                  <p className="font-medium">{m.name}</p>
                  <ul className="ml-3 text-xs">{v.pcb_day_items.filter((i) => i.module_id === m.id).map((i) => <li key={i.id}>{i.day_number ? `Day ${i.day_number}: ` : ""}{i.title}</li>)}</ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
      case "DATA_MILESTONES": return <ul className="space-y-1 text-sm">{v.pcb_milestones.map((m) => <li key={m.id}>{m.target_day ? `Day ${m.target_day} — ` : ""}<b>{m.name}</b></li>)}</ul>;
      case "DATA_PROJECTS": return <div className="space-y-3">{v.pcb_projects.map((p) => <div key={p.id}><p className="font-medium">{p.name} <span className="text-xs text-muted-foreground">({lbl(p.project_type)})</span></p>{kv([["Scenario", p.scenario], ["Technologies", p.technologies], ["Deliverables", p.deliverables], ["Why this project", p.selection_reason]])}</div>)}</div>;
      case "DATA_WEEKLY": return <ul className="space-y-1 text-sm">{v.pcb_weekly_reviews.map((w) => <li key={w.id}><b>{w.week_number ? `Week ${w.week_number}: ` : ""}{w.title}</b>{w.expected_progress && ` — ${w.expected_progress}`}</li>)}</ul>;
      default: return null;
    }
  };
  return (
    <article className="mx-auto max-w-3xl rounded-md border bg-card p-8 shadow-sm">
      <header className="mb-8 border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Coding361</p>
        <h1 className="mt-2 text-2xl font-semibold">Personal Career Blueprint</h1>
        <p className="mt-3 text-lg">{c.full_name}</p>
        <p className="text-sm text-muted-foreground">{c.candidate_code} · {pcbDisplayId(d.pcb.pcb_code, v.version)} · {v.status === "APPROVED" ? `Approved ${formatDate(v.approved_at)}` : "Draft preview"}</p>
      </header>
      {v.pcb_content_blocks.filter((b) => b.is_included && b.code !== "DATA_COVER" && (b.block_type === "DATA" || (b.content ?? "").trim())).map((b) => (
        <section key={b.id} className="mb-7">
          <h2 className="mb-2 border-l-2 border-primary pl-2 font-semibold">{b.title}</h2>
          {b.content?.trim() && <p className="mb-2 whitespace-pre-wrap text-sm">{b.content}</p>}
          {b.block_type === "DATA" && b.code && data(b.code)}
        </section>
      ))}
    </article>
  );
}
