import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel, formatDate } from "@/components/app/shared";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { can } from "@/lib/rbac/permissions";
import { alabel, currentAssessment } from "@/lib/assessments/model";
import { createAssessment } from "@/lib/assessments/assessments.functions";
import { assessmentQuery, assessmentsQuery } from "./queries";
import { AssessmentSummary, StatusPill } from "./AssessmentSummary";

export function AssessmentTab({ candidateId }: { candidateId: string }) {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const create = useServerFn(createAssessment);
  const [busy, setBusy] = useState(false);
  const list = useQuery({ ...assessmentsQuery(candidateId), enabled: can(user, "assessment.view") });
  const current = currentAssessment(list.data ?? []);
  const detail = useQuery({ ...assessmentQuery(current?.id ?? ""), enabled: !!current });

  if (!can(user, "assessment.view"))
    return <p className="py-12 text-center text-sm text-muted-foreground">You do not have access to assessments.</p>;
  if (list.isLoading) return <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>;
  if (list.error) return <p className="py-12 text-center text-sm text-destructive">Could not load assessments.</p>;

  const rows = list.data ?? [];
  const canNew = rows.length ? can(user, "assessment.reassess") : can(user, "assessment.create");
  const start = async () => {
    setBusy(true);
    try {
      const { id } = await create({ data: { id: candidateId } });
      await qc.invalidateQueries({ queryKey: ["assessments", candidateId] });
      navigate({ to: "/app/candidates/$id/assessments/$aid", params: { id: candidateId, aid: id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create assessment");
    } finally {
      setBusy(false);
    }
  };

  if (!rows.length)
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <ClipboardCheck className="mb-4 size-7 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No Career Assessment has been recorded yet.</p>
        {canNew && (
          <Button className="mt-5" onClick={start} disabled={busy}>
            <Plus /> Create Assessment
          </Button>
        )}
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Career Assessment</h2>
        <div className="flex gap-2">
          {current && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/app/candidates/$id/assessments/$aid" params={{ id: candidateId, aid: current.id }}>
                Open {current.assessment_code}
              </Link>
            </Button>
          )}
          {canNew && (
            <Button size="sm" onClick={start} disabled={busy}>
              <Plus /> Create Reassessment
            </Button>
          )}
        </div>
      </div>
      <Panel className="p-5 sm:p-6">
        {detail.data ? (
          <AssessmentSummary a={detail.data} />
        ) : (
          <p className="text-sm text-muted-foreground">Loading summary…</p>
        )}
      </Panel>
      <div>
        <h3 className="mb-3 font-semibold">Assessment History</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                {["#", "Assessment ID", "Type", "Date", "Score", "Outcome", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.sequence}</td>
                  <td className="px-3 py-2">
                    <Link
                      className="font-medium text-primary hover:underline"
                      to="/app/candidates/$id/assessments/$aid"
                      params={{ id: candidateId, aid: r.id }}
                    >
                      {r.assessment_code}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{alabel(r.assessment_type)}</td>
                  <td className="px-3 py-2">{formatDate(r.assessment_date)}</td>
                  <td className="px-3 py-2 tabular-nums">{r.overall_score ?? "—"}</td>
                  <td className="px-3 py-2">{alabel(r.overall_outcome)}</td>
                  <td className="px-3 py-2">
                    <StatusPill status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
