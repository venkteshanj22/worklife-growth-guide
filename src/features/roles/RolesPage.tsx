import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Lock, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, PageHeader, Panel } from "@/components/app/shared";
import { listRoles, type RoleRow } from "@/lib/admin/roles.functions";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { RoleFormDialog } from "./RoleFormDialog";
import { PermissionMatrix } from "./PermissionMatrix";

export function RolesPage() {
  const { can } = useCurrentUser();
  const listFn = useServerFn(listRoles);
  const roles = useQuery({ queryKey: ["roles", "list"], queryFn: () => listFn() });
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Admin", "Roles & Permissions"]}
        title="Roles & Permissions"
        description="Permissions are enforced by the server and database, not just the menu."
        actions={can(PERMISSIONS.rolesCreate) && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus />Create role</Button>}
      />
      <Tabs defaultValue="roles">
        <TabsList className="mb-4">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="matrix">Permission matrix</TabsTrigger>
        </TabsList>
        <TabsContent value="roles">
          <Panel>
            {roles.isError ? <ErrorState message={(roles.error as Error).message} /> : (
              <Table>
                <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Description</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Users</TableHead><TableHead>Status</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                <TableBody>
                  {roles.isLoading && Array.from({ length: 6 }).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5" /></TableCell></TableRow>)}
                  {roles.data?.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium"><span className="flex items-center gap-1.5">{r.name}{r.is_system && <Lock className="size-3 text-muted-foreground" aria-label="System role" />}</span></TableCell>
                      <TableCell className="max-w-md text-muted-foreground">{r.description || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.is_staff ? "Staff" : "Portal"}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.user_count}</TableCell>
                      <TableCell>
                        <span className={r.is_active ? "rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success" : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"}>{r.is_active ? "Active" : "Inactive"}</span>
                      </TableCell>
                      <TableCell>{can(PERMISSIONS.rolesEdit) && <Button variant="ghost" size="icon" aria-label={`Edit ${r.name}`} onClick={() => { setEditing(r); setOpen(true); }}><Pencil /></Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
        </TabsContent>
        <TabsContent value="matrix">
          {!can(PERMISSIONS.rolesPermissions) && <p className="mb-3 text-sm text-muted-foreground">You can view the matrix but not change it.</p>}
          {roles.data && <PermissionMatrix roles={roles.data} editable={can(PERMISSIONS.rolesPermissions)} />}
        </TabsContent>
      </Tabs>
      <RoleFormDialog open={open} onOpenChange={setOpen} role={editing} />
    </>
  );
}
