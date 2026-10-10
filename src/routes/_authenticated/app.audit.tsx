import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, PageHeader, Panel, formatDate } from "@/components/app/shared";
import { supabase } from "@/integrations/supabase/client";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export const Route = createFileRoute("/_authenticated/app/audit")({
  beforeLoad: requirePermission(PERMISSIONS.auditView),
  head: () => ({ meta: [{ title: "Audit Log — CareerOS" }] }),
  component: AuditPage,
});

const ACTIONS = ["User Created", "User Updated", "Role Changed", "User Activated", "User Deactivated", "User Suspended", "Permission Changed", "Role Created", "Role Updated", "Settings Updated"];
const PAGE = 20;
const ALL = "__all";

function describe(meta: Record<string, unknown>) {
  if ("permission" in meta) return `${meta["permission"]} → ${meta["enabled"] ? "granted" : "revoked"}`;
  if ("from" in meta && "to" in meta) return `${meta["from"] ?? "—"} → ${meta["to"]}`;
  if ("changes" in meta && meta["changes"] && typeof meta["changes"] === "object") return `Changed: ${Object.keys(meta["changes"]).join(", ")}`;
  if ("role" in meta) return `Role: ${meta["role"]}`;
  return "";
}

function AuditPage() {
  const [action, setAction] = useState(ALL);
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["audit", action, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let query = supabase.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false });
      if (action !== ALL) query = query.eq("action", action);
      const from = (page - 1) * PAGE;
      const { data, count, error } = await query.range(from, from + PAGE - 1);
      if (error) throw error;
      return { rows: data, total: count ?? 0 };
    },
  });
  const pages = Math.max(1, Math.ceil((q.data?.total ?? 0) / PAGE));

  return (
    <>
      <PageHeader crumbs={["Admin", "Audit Log"]} title="Audit Log" description="A read-only record of important administrative actions." />
      <Panel>
        <div className="border-b p-4">
          <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All actions</SelectItem>
              {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {q.isError ? <ErrorState message="Could not load the audit log." /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
              <TableBody>
                {q.isLoading && Array.from({ length: 6 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5" /></TableCell></TableRow>)}
                {q.data?.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(r.created_at, true)}</TableCell>
                    <TableCell>{r.actor_name ?? "System"}</TableCell>
                    <TableCell><span className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{r.action}</span></TableCell>
                    <TableCell>{r.target_label ?? r.target_type}</TableCell>
                    <TableCell className="max-w-sm truncate text-muted-foreground">{describe((r.metadata ?? {}) as Record<string, unknown>)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {q.data?.rows.length === 0 && <EmptyState title="No audit entries yet" description="Administrative actions will appear here." />}
          </div>
        )}
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3 text-sm text-muted-foreground">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span>Page {page} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </Panel>
    </>
  );
}
