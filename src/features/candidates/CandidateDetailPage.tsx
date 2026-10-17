import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, UserRound, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader, formatDate } from "@/components/app/shared";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { can } from "@/lib/rbac/permissions";
import {
  personalFields,
  educationFields,
  employmentFields,
  gapFields,
  careerFields,
  programFields,
  ASSIGNMENT_TYPES,
  label,
  type FieldSpec,
} from "@/lib/candidates/model";
import { detailQuery, optionsQuery } from "./queries";
import { Badge } from "./Fields";
import { CandidateActions, type ActionKind } from "./CandidateActions";
import { AssessmentTab } from "@/features/assessments/AssessmentTab";
const FUTURE = [
  "PCB",
  "Roadmap",
  "Weekly Reviews",
  "Projects",
  "Tasks",
  "Resume",
  "Openings",
  "Documents",
  "Finance",
];
export function CandidateDetailPage({ id }: { id: string }) {
  const { data: d } = useSuspenseQuery(detailQuery(id));
  const { data: options } = useSuspenseQuery(optionsQuery);
  const { user } = useCurrentUser();
  const [action, setAction] = useState<ActionKind | null>(null);
  const c = d.candidate;
  return (
    <>
      <PageHeader
        crumbs={["Candidates", c.candidate_code]}
        title={c.full_name}
        actions={
          <>
            <Button variant="outline" size="icon" asChild title="Back to candidates">
              <Link to="/app/candidates" aria-label="Back to candidates">
                <ArrowLeft />
              </Link>
            </Button>
            {can(user, "candidates.edit") && (
              <Button asChild>
                <Link to="/app/candidates/$id/edit" params={{ id }}>
                  <Pencil />
                  Edit Candidate
                </Link>
              </Button>
            )}
          </>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-b pb-6">
        <div className="flex items-center gap-3">
          {c.profile_photo ? (
            <img
              src={c.profile_photo}
              alt={c.full_name}
              className="size-14 rounded-md object-cover"
            />
          ) : (
            <div className="grid size-14 place-items-center rounded-md bg-accent text-accent-foreground">
              <UserRound className="size-6" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{c.candidate_code}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {options.plans.find((p) => p.key === c.program_plan)?.name ??
                c.program_plan ??
                "No program plan"}
            </p>
          </div>
        </div>
        <Badge value={c.journey_status} />
        <Badge value={c.portal_status} />
        <div>
          <p className="text-xs text-muted-foreground">Career consultant</p>
          <p className="mt-1 text-sm">
            {options.staff.find(
              (s) =>
                s.id ===
                d.assignments.find((a) => a.assignment_type === "career_consultant")?.user_id,
            )?.full_name ?? "Unassigned"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Enrollment date</p>
          <p className="mt-1 text-sm">{formatDate(c.enrollment_date)}</p>
        </div>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["status", "Change Status"],
            ["assign", "Assign Staff"],
            ["portal", "Portal Access"],
          ] as const
        )
          .filter(([k]) => can(user, `candidates.${k}`))
          .map(([k, t]) => (
            <Button key={k} variant="outline" size="sm" onClick={() => setAction(k)}>
              {t}
            </Button>
          ))}
      </div>
      <Tabs defaultValue="Overview">
        <div className="overflow-x-auto border-b">
          <TabsList className="h-auto w-max justify-start rounded-none bg-transparent p-0">
            {["Overview", "Assessment", ...FUTURE, "Activity"].map((t) => (
              <TabsTrigger
                key={t}
                value={t}
                className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="Overview" className="mt-6">
          <div className="space-y-8">
            <Info
              title="Personal Information"
              fields={personalFields.filter(
                (f) =>
                  !f.key.includes("email") &&
                  !f.key.includes("mobile") &&
                  f.key !== "profile_photo",
              )}
              value={c}
            />
            <Info
              title="Contact Information"
              fields={personalFields.filter(
                (f) => f.key.includes("email") || f.key.includes("mobile"),
              )}
              value={c}
            />
            <Records title="Education" records={d.education} fields={educationFields} />
            <Records title="Employment History" records={d.employment} fields={employmentFields} />
            <Info title="Career Gap" fields={gapFields} value={c} />
            <Info title="Career Profile" fields={careerFields} value={c} />
            <Info title="Program Information" fields={programFields} value={c} />
            <section className="border-t pt-6">
              <h2 className="mb-4 text-base font-semibold">Assigned Team</h2>
              <dl className="grid gap-5 sm:grid-cols-3">
                {ASSIGNMENT_TYPES.map((t) => {
                  const a = d.assignments.find((a) => a.assignment_type === t);
                  return (
                    <div key={t}>
                      <dt className="text-xs text-muted-foreground">{label(t)}</dt>
                      <dd className="mt-1 text-sm">
                        {options.staff.find((s) => s.id === a?.user_id)?.full_name ??
                          (a?.user_id ? "Inactive staff (assignment retained)" : "Unassigned")}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
            <section className="border-t pt-6">
              <h2 className="mb-4 font-semibold">Portal Access</h2>
              <Badge value={c.portal_status} />
              {d.portal && (
                <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">Linked user</dt>
                    <dd className="mt-1 break-all text-sm">{d.portal.user_id}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Activated</dt>
                    <dd className="mt-1 text-sm">{formatDate(d.portal.activated_at, true)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Disabled</dt>
                    <dd className="mt-1 text-sm">{formatDate(d.portal.disabled_at, true)}</dd>
                  </div>
                </dl>
              )}
            </section>
            <Info
              title="System Information"
              fields={[
                { key: "created_at", title: "Created at" },
                { key: "updated_at", title: "Updated at" },
                { key: "created_by", title: "Created by" },
                { key: "updated_by", title: "Updated by" },
              ]}
              value={{
                created_at: formatDate(c.created_at, true),
                updated_at: formatDate(c.updated_at, true),
                created_by:
                  options.staff.find((s) => s.id === c.created_by)?.full_name ?? c.created_by,
                updated_by:
                  options.staff.find((s) => s.id === c.updated_by)?.full_name ?? c.updated_by,
              }}
            />
          </div>
        </TabsContent>
        <TabsContent value="Assessment" className="mt-6">
          <AssessmentTab candidateId={id} />
        </TabsContent>
        {FUTURE.map((t) => (
          <TabsContent key={t} value={t}>
            <div className="flex flex-col items-center py-16 text-center">
              <Clock className="mb-4 size-7 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{t} — Coming Soon</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This module will be activated in a future CareerOS phase.
              </p>
            </div>
          </TabsContent>
        ))}
        <TabsContent value="Activity" className="mt-6">
          <h2 className="mb-5 font-semibold">Candidate Activity</h2>
          {!d.activity.length ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ol className="ml-2 border-l">
              {d.activity.map((a) => (
                <li key={a.id} className="relative ml-6 pb-7">
                  <CheckCircle2 className="absolute -left-8 top-0 size-4 bg-background text-primary" />
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="text-sm font-medium">{a.event}</p>
                    <time className="text-xs text-muted-foreground">
                      {formatDate(a.created_at, true)}
                    </time>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.actor_name}</p>
                  {a.remarks && <p className="mt-2 whitespace-pre-wrap text-sm">{a.remarks}</p>}
                </li>
              ))}
            </ol>
          )}
          <h3 className="mb-4 mt-6 border-t pt-5 font-semibold">Status History</h3>
          {d.status_history.map((h) => (
            <p key={h.id} className="mb-3 text-sm">
              <span className="font-medium">
                {h.old_status ? label(h.old_status) : "Created"} → {label(h.new_status)}
              </span>
              <span className="ml-3 text-muted-foreground">{formatDate(h.changed_at, true)}</span>
              {h.remarks && <span className="ml-3">{h.remarks}</span>}
            </p>
          ))}
          <h3 className="mb-4 mt-6 border-t pt-5 font-semibold">Assignment History</h3>
          {!d.assignment_history.length && (
            <p className="text-sm text-muted-foreground">No assignment changes yet.</p>
          )}
          {d.assignment_history.map((h) => (
            <div key={h.id} className="mb-4 text-sm">
              <p className="font-medium">{label(h.assignment_type)}</p>
              <p className="mt-1 break-words text-muted-foreground">
                {options.staff.find((s) => s.id === h.previous_user)?.full_name ??
                  h.previous_user ??
                  "Unassigned"}{" "}
                →{" "}
                {options.staff.find((s) => s.id === h.new_user)?.full_name ??
                  h.new_user ??
                  "Unassigned"}{" "}
                · {formatDate(h.changed_at, true)}
              </p>
              {h.remarks && <p className="mt-1">{h.remarks}</p>}
            </div>
          ))}
        </TabsContent>
      </Tabs>
      {action && (
        <CandidateActions
          key={action}
          kind={action}
          id={id}
          status={c.journey_status}
          options={options}
          detail={d}
          onClose={() => setAction(null)}
        />
      )}
    </>
  );
}
function Info({
  title,
  fields,
  value,
}: {
  title: string;
  fields: FieldSpec[];
  value: Record<string, unknown>;
}) {
  const visible = fields.filter(
    (f) =>
      value[f.key] !== null &&
      value[f.key] !== undefined &&
      value[f.key] !== "" &&
      !(f.key.startsWith("gap_") && !value["has_career_gap"]),
  );
  return (
    <section className="border-t pt-6">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {!visible.length ? (
        <p className="text-sm text-muted-foreground">No information added yet.</p>
      ) : (
        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((f) => (
            <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2 lg:col-span-3" : ""}>
              <dt className="text-xs text-muted-foreground">{f.title}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-sm">
                {typeof value[f.key] === "boolean"
                  ? value[f.key]
                    ? "Yes"
                    : "No"
                  : f.options
                    ? label(String(value[f.key]))
                    : String(value[f.key])}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
function Records({
  title,
  fields,
  records,
}: {
  title: string;
  fields: FieldSpec[];
  records: Record<string, unknown>[];
}) {
  return (
    <section className="border-t pt-6">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {records.length ? (
        records.map((r, i) => (
          <div key={String(r["id"])} className="mb-4">
            <Info title={`${title} ${i + 1}`} fields={fields} value={r} />
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">No information added yet.</p>
      )}
    </section>
  );
}
