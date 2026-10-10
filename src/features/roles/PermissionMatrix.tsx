import { Fragment } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, Panel } from "@/components/app/shared";
import { supabase } from "@/integrations/supabase/client";
import { setRolePermission, type RoleRow } from "@/lib/admin/roles.functions";

const matrixKey = ["roles", "matrix"];

export function PermissionMatrix({ roles, editable }: { roles: RoleRow[]; editable: boolean }) {
  const qc = useQueryClient();
  const toggleFn = useServerFn(setRolePermission);
  const data = useQuery({
    queryKey: matrixKey,
    queryFn: async () => {
      const [p, rp] = await Promise.all([
        supabase.from("permissions").select("id, key, module, label").order("sort_order"),
        supabase.from("role_permissions").select("role_id, permission_id"),
      ]);
      if (p.error || rp.error) throw new Error("Could not load permissions");
      return { permissions: p.data, grants: new Set(rp.data.map((g) => `${g.role_id}:${g.permission_id}`)) };
    },
  });

  const m = useMutation({
    mutationFn: (v: { roleId: string; permissionId: string; enabled: boolean }) => toggleFn({ data: v }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: matrixKey });
      const prev = qc.getQueryData<typeof data.data>(matrixKey);
      if (prev) {
        const grants = new Set(prev.grants);
        const k = `${v.roleId}:${v.permissionId}`;
        if (v.enabled) grants.add(k); else grants.delete(k);
        qc.setQueryData(matrixKey, { ...prev, grants });
      }
      return { prev };
    },
    onError: (e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(matrixKey, ctx.prev); toast.error(e.message); },
    onSuccess: () => toast.success("Permission saved"),
  });

  if (data.isError) return <Panel><ErrorState message="Could not load the permission matrix." /></Panel>;
  if (!data.data) return <Panel className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</Panel>;

  const modules = [...new Set(data.data.permissions.map((p) => p.module))];
  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b">
            <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-medium text-muted-foreground">Permission</th>
            {roles.map((r) => <th key={r.id} className="px-2 py-3 text-center text-xs font-medium text-muted-foreground"><span className="block max-w-24 mx-auto leading-tight">{r.name}</span></th>)}
          </tr>
        </thead>
        <tbody>
          {modules.map((mod) => (
            <Fragment key={mod}>
              <tr className="bg-muted/50"><td colSpan={roles.length + 1} className="sticky left-0 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{mod}</td></tr>
              {data.data.permissions.filter((p) => p.module === mod).map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="sticky left-0 z-10 bg-card px-4 py-2.5">
                    <div className="font-medium">{p.label}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{p.key}</div>
                  </td>
                  {roles.map((r) => {
                    const sa = r.key === "super_admin";
                    const checked = sa || data.data.grants.has(`${r.id}:${p.id}`);
                    return (
                      <td key={r.id} className="px-2 py-2.5 text-center">
                        <Checkbox
                          aria-label={`${p.label} for ${r.name}`}
                          checked={checked}
                          disabled={!editable || sa}
                          onCheckedChange={(v) => m.mutate({ roleId: r.id, permissionId: p.id, enabled: v === true })}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
