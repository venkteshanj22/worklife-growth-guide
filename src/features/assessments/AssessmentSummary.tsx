import { useState } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/components/app/shared";
import { alabel, maxTotal } from "@/lib/assessments/model";
import type { AssessmentDetail } from "@/lib/assessments/assessments.functions";

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "FINALIZED"
      ? "bg-primary text-primary-foreground"
      : status === "COMPLETED"
        ? "bg-accent text-accent-foreground"
        : "bg-muted text-muted-foreground";
  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${tone}`}>{alabel(status)}</span>;
}

export function ScoreBars({ scores }: { scores: AssessmentDetail["assessment_dimension_scores"] }) {
  const total = scores.reduce((t, s) => t + Number(s.score ?? 0), 0);
  return (
    <div className="space-y-3">
      {scores.map((s) => (
        <div key={s.id} className="grid grid-cols-[minmax(0,10rem)_1fr_4rem] items-center gap-3 text-sm">
          <span className="truncate">{s.label}</span>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${(Number(s.score ?? 0) / s.max_score) * 100}%` }}
            />
          </div>
          <span className="text-right tabular-nums">
            {s.score ?? "—"} / {s.max_score}
          </span>
        </div>
      ))}
      <div className="grid grid-cols-[minmax(0,10rem)_1fr_4rem] gap-3 border-t pt-3 text-sm font-semibold">
        <span>Total</span>
        <span />
        <span className="text-right tabular-nums">
          {total} / {maxTotal(scores)}
        </span>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t pt-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}
const List = ({ items }: { items: string[] }) =>
  items.length ? (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((i, n) => (
        <li key={n}>{i}</li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-muted-foreground">None recorded.</p>
  );

export function DocumentLink({ path, name }: { path: string; name: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      onClick={async () => {
        setBusy(true);
        const { data, error } = await supabase.storage
          .from("assessment-documents")
          .createSignedUrl(path, 60);
        setBusy(false);
        if (error || !data) { toast.error("Could not open this document"); return; }
        window.open(data.signedUrl, "_blank", "noopener");
      }}
    >
      <FileText className="size-4" />
      {name}
    </button>
  );
}

export function AssessmentSummary({ a }: { a: AssessmentDetail }) {
  const primary = a.assessment_recommendations.find((r) => r.kind === "PRIMARY");
  const alt = a.assessment_recommendations.find((r) => r.kind === "ALTERNATIVE");
  const max = maxTotal(a.assessment_dimension_scores);
  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Overall Score</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {a.overall_score ?? "—"} <span className="text-base text-muted-foreground">/ {max}</span>
          </p>
        </div>
        {[
          ["Outcome", alabel(a.overall_outcome)],
          ["Primary Recommendation", primary?.career_path || "—"],
          ["Target Role", primary?.target_role || "—"],
          ["Alternative", alt?.career_path || "—"],
          ["Assessment Date", formatDate(a.assessment_date)],
          ["Assessed By", (a.assessed_by && a.names[a.assessed_by]) || "—"],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="mt-1 text-sm font-medium">{v}</p>
          </div>
        ))}
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="mt-1">
            <StatusPill status={a.status} />
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Outcome refers to career-path readiness. It is not a job or employment guarantee.
      </p>
      <Section title="Dimension Score Breakdown">
        <ScoreBars scores={a.assessment_dimension_scores} />
      </Section>
      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Strengths">
          <List items={a.assessment_strengths.map((s) => s.item)} />
        </Section>
        <Section title="Development Areas">
          <List items={a.assessment_development_areas.map((s) => s.item)} />
        </Section>
      </div>
      <Section title="Skill Gaps">
        {a.assessment_skill_gaps.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Skill</th>
                  <th className="pr-3 font-medium">Current</th>
                  <th className="pr-3 font-medium">Required</th>
                  <th className="font-medium">Priority</th>
                </tr>
              </thead>
              <tbody>
                {a.assessment_skill_gaps.map((g) => (
                  <tr key={g.id} className="border-t">
                    <td className="py-2 pr-3">{g.skill}</td>
                    <td className="pr-3">{g.current_level || "—"}</td>
                    <td className="pr-3">{g.required_level || "—"}</td>
                    <td>{alabel(g.priority)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">None recorded.</p>
        )}
      </Section>
      <Section title="Career Recommendation">
        <div className="grid gap-4 text-sm md:grid-cols-2">
          {[primary, alt].map((r, i) => (
            <div key={i}>
              <p className="text-xs text-muted-foreground">{i ? "Alternative" : "Primary"}</p>
              <p className="mt-1 font-medium">{r?.career_path || "—"}</p>
              <p className="text-muted-foreground">
                {[r?.target_role, r?.technology_direction].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
          ))}
        </div>
        {primary?.rationale && <p className="mt-3 whitespace-pre-line text-sm">{primary.rationale}</p>}
        {a.assessment_not_recommended_paths.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">Not Recommended Currently</p>
            <ul className="mt-1 space-y-1 text-sm">
              {a.assessment_not_recommended_paths.map((p) => (
                <li key={p.id}>
                  <span className="font-medium">{p.path}</span>
                  {p.reason && <span className="text-muted-foreground"> — {p.reason}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>
      <Section title="Consultant Summary">
        <p className="whitespace-pre-line text-sm">{a.assessor_summary || "Not written yet."}</p>
      </Section>
      {a.internal_notes && (
        <Section title="Internal Notes (staff only)">
          <p className="whitespace-pre-line text-sm">{a.internal_notes}</p>
        </Section>
      )}
      <Section title="Documents">
        {a.assessment_documents.length ? (
          <ul className="space-y-2">
            {a.assessment_documents.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-3 text-sm">
                <DocumentLink path={d.storage_path} name={d.document_name} />
                <span className="text-xs text-muted-foreground">
                  {d.document_type} · {(d.uploaded_by && a.names[d.uploaded_by]) || "—"} ·{" "}
                  {formatDate(d.uploaded_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No documents uploaded.</p>
        )}
      </Section>
    </div>
  );
}
