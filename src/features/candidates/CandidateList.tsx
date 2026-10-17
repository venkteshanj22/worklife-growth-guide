import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { PageHeader, EmptyState, formatDate } from "@/components/app/shared";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { can } from "@/lib/rbac/permissions";
import { STATUSES, ACTIVE_STATUSES, label } from "@/lib/candidates/model";
import { listSchema } from "@/lib/candidates/candidates.functions";
import { candidatesQuery, optionsQuery } from "./queries";
import { Badge, Choice } from "./Fields";
import { CandidateActions, type ActionKind } from "./CandidateActions";
export function CandidateList({ active = false }: { active?: boolean }) {
  const { user } = useCurrentUser();
  const { data: options } = useSuspenseQuery(optionsQuery);
  const [filters, setFilters] = useState(() => listSchema.parse({ active }));
  const { data } = useSuspenseQuery(candidatesQuery(filters));
  const [term, setTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [action, setAction] = useState<{ id: string; status: string; kind: ActionKind } | null>(
    null,
  );
  const set = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  const pages = Math.max(1, Math.ceil(data.total / filters.pageSize));
  function sort(column: typeof filters.sort) {
    setFilters((f) => ({
      ...f,
      sort: column,
      ascending: f.sort === column ? !f.ascending : true,
      page: 1,
    }));
  }
  return (
    <>
      <PageHeader
        crumbs={["Candidates", active ? "Active" : "All Candidates"]}
        title={active ? "Active Candidates" : "All Candidates"}
        description={`${data.total} candidate${data.total === 1 ? "" : "s"}`}
        actions={
          can(user, "candidates.create") ? (
            <Button asChild>
              <Link to="/app/candidates/new">
                <Plus />
                Add Candidate
              </Link>
            </Button>
          ) : undefined
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <form
          className="flex w-full max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            set("search", term);
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              aria-label="Search candidates"
              placeholder="Search ID, name, mobile or email"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" type="submit">
            Search
          </Button>
        </form>
        <div className="flex gap-2">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal />
            Filters
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setFilters(listSchema.parse({ active }));
              setTerm("");
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>
      {showFilters && (
        <div className="mb-5 grid gap-4 border-y py-5 sm:grid-cols-2 xl:grid-cols-4">
          <Choice
            title="Journey status"
            value={filters.status}
            onChange={(v) => set("status", v)}
            empty="All statuses"
            items={STATUSES.filter((s) => !active || ACTIVE_STATUSES.includes(s)).map((s) => ({
              value: s,
              label: label(s),
            }))}
          />
          <Choice
            title="Program plan"
            value={filters.plan}
            onChange={(v) => set("plan", v)}
            empty="All plans"
            items={options.plans.map((p) => ({ value: p.key, label: p.name }))}
          />
          <Choice
            title="Employment status"
            value={filters.employment}
            onChange={(v) => set("employment", v)}
            empty="All employment"
            items={["FRESHER", "EMPLOYED", "UNEMPLOYED", "SELF_EMPLOYED", "CAREER_BREAK"].map(
              (s) => ({ value: s, label: label(s) }),
            )}
          />
          <Choice
            title="Career consultant"
            value={filters.consultant}
            onChange={(v) => set("consultant", v)}
            empty="All consultants"
            items={options.staff
              .filter((s) => s.role_key === "career_consultant")
              .map((s) => ({ value: s.id, label: s.full_name }))}
          />
          <Choice
            title="Portal status"
            value={filters.portal}
            onChange={(v) => set("portal", v)}
            empty="All portals"
            items={["NOT_ACTIVATED", "ACTIVE", "DISABLED"].map((s) => ({
              value: s,
              label: label(s),
            }))}
          />
          <div>
            <label htmlFor="enrollment-from" className="mb-1.5 block text-sm font-medium">
              Enrolled from
            </label>
            <Input
              id="enrollment-from"
              type="date"
              value={filters.from}
              onChange={(e) => set("from", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="enrollment-until" className="mb-1.5 block text-sm font-medium">
              Enrolled until
            </label>
            <Input
              id="enrollment-until"
              type="date"
              value={filters.until}
              onChange={(e) => set("until", e.target.value)}
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              {[
                ["Candidate ID", "candidate_code"],
                ["Candidate Name", "full_name"],
                ["Mobile", ""],
                ["Email", ""],
                ["Employment", ""],
                ["Program Plan", ""],
                ["Career Consultant", ""],
                ["Journey Status", ""],
                ["Enrollment", "enrollment_date"],
                ["Portal", ""],
                ["Actions", ""],
              ].map(([t, k]) => (
                <th key={t} className="whitespace-nowrap px-4 py-3 font-medium">
                  {k ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => sort(k as typeof filters.sort)}
                      className="h-auto px-0 text-xs"
                    >
                      {t}
                      <ArrowUpDown className="size-3" />
                    </Button>
                  ) : (
                    t
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.rows.map((c) => (
              <tr key={c.id} className="hover:bg-muted/30">
                <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">
                  {c.candidate_code}
                </td>
                <td className="min-w-44 px-4 py-4">
                  <Link
                    className="font-medium text-primary hover:underline"
                    to="/app/candidates/$id"
                    params={{ id: c.id }}
                  >
                    {c.full_name}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-4">{c.primary_mobile}</td>
                <td className="px-4 py-4">{c.personal_email}</td>
                <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                  {label(c.employment_status)}
                </td>
                <td className="px-4 py-4">
                  {options.plans.find((p) => p.key === c.program_plan)?.name ??
                    c.program_plan ??
                    "—"}
                </td>
                <td className="min-w-40 px-4 py-4 text-muted-foreground">
                  {options.staff.find(
                    (s) =>
                      s.id ===
                      c.candidate_assignments.find((a) => a.assignment_type === "career_consultant")
                        ?.user_id,
                  )?.full_name ??
                    (c.candidate_assignments.find((a) => a.assignment_type === "career_consultant")
                      ?.user_id
                      ? "Inactive staff"
                      : "Unassigned")}
                </td>
                <td className="px-4 py-4">
                  <Badge value={c.journey_status} />
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                  {formatDate(c.enrollment_date)}
                </td>
                <td className="px-4 py-4">
                  <Badge value={c.portal_status} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-1">
                    <Button asChild variant="ghost" size="icon" title="View Candidate">
                      <Link
                        to="/app/candidates/$id"
                        params={{ id: c.id }}
                        aria-label={`View ${c.full_name}`}
                      >
                        <Eye className="size-4" />
                      </Link>
                    </Button>
                    {can(user, "candidates.edit") && (
                      <Button asChild variant="ghost" size="icon" title="Edit Candidate">
                        <Link
                          to="/app/candidates/$id/edit"
                          params={{ id: c.id }}
                          aria-label={`Edit ${c.full_name}`}
                        >
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${c.full_name}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(
                          [
                            ["status", "Change Status"],
                            ["assign", "Assign Staff"],
                            ["portal", "Portal Access"],
                          ] as const
                        )
                          .filter(([k]) => can(user, `candidates.${k}`))
                          .map(([k, t]) => (
                            <DropdownMenuItem
                              key={k}
                              onClick={() =>
                                setAction({ id: c.id, status: c.journey_status, kind: k })
                              }
                            >
                              {t}
                            </DropdownMenuItem>
                          ))}
                        {!["status", "assign", "portal"].some((k) =>
                          can(user, `candidates.${k}`),
                        ) && (
                          <DropdownMenuItem asChild>
                            <Link to="/app/candidates/$id" params={{ id: c.id }}>
                              View Candidate
                            </Link>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.rows.length && (
          <EmptyState
            title="No candidates found"
            description={
              filters.search
                ? "Try another search or clear your filters."
                : "No candidate records match this view."
            }
          />
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          {data.total
            ? `${(filters.page - 1) * filters.pageSize + 1}–${Math.min(filters.page * filters.pageSize, data.total)} of ${data.total}`
            : "0 candidates"}
        </span>
        <div className="flex items-center gap-3">
          <span>
            Page {filters.page} of {pages}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous page"
            disabled={filters.page <= 1}
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next page"
            disabled={filters.page >= pages}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      {action && (
        <CandidateActions
          key={`${action.id}-${action.kind}`}
          id={action.id}
          status={action.status}
          kind={action.kind}
          options={options}
          onClose={() => setAction(null)}
        />
      )}
    </>
  );
}
