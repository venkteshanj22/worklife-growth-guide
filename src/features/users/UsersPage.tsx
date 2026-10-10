import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, PageHeader, Panel, StatusBadge, formatDate } from "@/components/app/shared";
import { listUsers, setUserStatus, type UserRow } from "@/lib/admin/users.functions";
import { listRoles } from "@/lib/admin/roles.functions";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { PERMISSIONS, SUPER_ADMIN_ROLE, type UserStatus } from "@/lib/rbac/permissions";
import { UserFormDialog } from "./UserFormDialog";

const PAGE_SIZE = 10;
const ALL = "__all";
const statusAction: Record<UserStatus, string> = { ACTIVE: "Activate", INACTIVE: "Deactivate", SUSPENDED: "Suspend" };

export function UsersPage() {
  const { user: me, can } = useCurrentUser();
  const qc = useQueryClient();
  const listFn = useServerFn(listUsers);
  const rolesFn = useServerFn(listRoles);
  const statusFn = useServerFn(setUserStatus);
  const [search, setSearch] = useState("");
  const [roleId, setRoleId] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<UserRow | null>(null);
  const [confirm, setConfirm] = useState<{ user: UserRow; status: UserStatus } | null>(null);

  const filters = { search, roleId: roleId === ALL ? "" : roleId, status: status === ALL ? "" : status, page, pageSize: PAGE_SIZE };
  const users = useQuery({ queryKey: ["users", filters], queryFn: () => listFn({ data: filters }), placeholderData: keepPreviousData });
  const roles = useQuery({ queryKey: ["roles"], queryFn: () => rolesFn(), enabled: can(PERMISSIONS.rolesView) || can(PERMISSIONS.usersCreate) || can(PERMISSIONS.usersEdit) });
  const roleOptions = roles.data ?? [];

  const statusMutation = useMutation({
    mutationFn: (v: { id: string; status: UserStatus }) => statusFn({ data: v }),
    onSuccess: (_d, v) => { toast.success(`User ${statusAction[v.status].toLowerCase()}d`); qc.invalidateQueries({ queryKey: ["users"] }); },
    onError: (e) => toast.error(e.message),
    onSettled: () => setConfirm(null),
  });

  const total = users.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isSA = me.role_key === SUPER_ADMIN_ROLE;
  const canManageTarget = (u: UserRow) => u.id !== me.id && (u.role_key !== SUPER_ADMIN_ROLE || isSA);

  return (
    <>
      <PageHeader
        crumbs={["Admin", "Users"]}
        title="Users"
        description="Manage staff and candidate accounts. Accounts are invitation-only."
        actions={can(PERMISSIONS.usersCreate) && <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus />Create user</Button>}
      />
      <Panel>
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search name, email or user ID" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={roleId} onValueChange={(v) => { setRoleId(v); setPage(1); }}>
            <SelectTrigger className="md:w-48"><SelectValue placeholder="All roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All roles</SelectItem>
              {roleOptions.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="md:w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {users.isError ? <ErrorState message={(users.error as Error).message} /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead><TableHead>User ID</TableHead><TableHead>Email</TableHead><TableHead>Mobile</TableHead>
                  <TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Last login</TableHead><TableHead>Created</TableHead>
                  <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 9 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))}
                {users.data?.rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}{u.id === me.id && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}</TableCell>
                    <TableCell className="font-mono text-xs">{u.user_code}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">{u.mobile || "—"}</TableCell>
                    <TableCell>{u.role_name ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={u.status} /></TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(u.last_login_at, true)}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${u.full_name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewing(u)}>View</DropdownMenuItem>
                          {can(PERMISSIONS.usersEdit) && (u.role_key !== SUPER_ADMIN_ROLE || isSA) && (
                            <DropdownMenuItem onClick={() => { setEditing(u); setFormOpen(true); }}>Edit</DropdownMenuItem>
                          )}
                          {can(PERMISSIONS.usersStatus) && canManageTarget(u) && (
                            <>
                              <DropdownMenuSeparator />
                              {(["ACTIVE", "INACTIVE", "SUSPENDED"] as const).filter((s) => s !== u.status).map((s) => (
                                <DropdownMenuItem key={s} onClick={() => setConfirm({ user: u, status: s })} className={s === "SUSPENDED" ? "text-destructive" : ""}>{statusAction[s]}</DropdownMenuItem>
                              ))}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {users.data && users.data.rows.length === 0 && (
              <EmptyState title="No users found" description={search || roleId !== ALL || status !== ALL ? "Try adjusting your search or filters." : "Create the first user to get started."} />
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span>{total} user{total === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span>Page {page} of {pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      </Panel>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} roles={roleOptions} canAssignSuperAdmin={isSA} />

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewing?.full_name}</DialogTitle></DialogHeader>
          {viewing && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {[
                ["User ID", viewing.user_code], ["Email", viewing.email], ["Mobile", viewing.mobile || "—"], ["Role", viewing.role_name ?? "—"],
                ["Last login", formatDate(viewing.last_login_at, true)], ["Created", formatDate(viewing.created_at)],
              ].map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-0.5 break-all">{v}</dd></div>)}
              <div><dt className="text-xs text-muted-foreground">Status</dt><dd className="mt-1"><StatusBadge status={viewing.status} /></dd></div>
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm && `${statusAction[confirm.status]} ${confirm.user.full_name}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.status === "ACTIVE" ? "This user will be able to sign in again." : "This user will be signed out and blocked from signing in until reactivated."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={statusMutation.isPending} onClick={(e) => { e.preventDefault(); if (confirm) statusMutation.mutate({ id: confirm.user.id, status: confirm.status }); }}>
              {confirm && statusAction[confirm.status]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
