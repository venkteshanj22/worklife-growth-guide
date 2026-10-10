import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createUser, updateUser, userInputSchema, type UserRow } from "@/lib/admin/users.functions";

export interface RoleOption { id: string; name: string; key: string; is_active: boolean }

const empty = { full_name: "", user_code: "", email: "", mobile: "", role_id: "", status: "ACTIVE" as const };

export function UserFormDialog({ open, onOpenChange, user, roles, canAssignSuperAdmin }: {
  open: boolean; onOpenChange: (o: boolean) => void; user: UserRow | null; roles: RoleOption[]; canAssignSuperAdmin: boolean;
}) {
  const qc = useQueryClient();
  const createFn = useServerFn(createUser);
  const updateFn = useServerFn(updateUser);
  const [form, setForm] = useState<typeof empty | (Omit<typeof empty, "status"> & { status: UserRow["status"] })>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(user ? { full_name: user.full_name, user_code: user.user_code, email: user.email, mobile: user.mobile ?? "", role_id: user.role_id ?? "", status: user.status } : empty);
  }, [open, user]);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = userInputSchema.safeParse(form);
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
        setErrors(errs);
        throw new Error("validation");
      }
      if (user) {
        const { status: _s, ...rest } = parsed.data;
        return updateFn({ data: { id: user.id, user: rest } });
      }
      return createFn({ data: { user: parsed.data, origin: window.location.origin } });
    },
    onSuccess: () => {
      toast.success(user ? "User updated" : "User created — an invitation email has been sent.");
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["roles"] });
      onOpenChange(false);
    },
    onError: (e) => { if (e.message !== "validation") toast.error(e.message); },
  });

  const set = (k: keyof typeof empty) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const assignable = roles.filter((r) => (r.is_active || r.id === form.role_id) && (r.key !== "super_admin" || canAssignSuperAdmin || r.id === form.role_id));

  function onSubmit(e: FormEvent) { e.preventDefault(); setErrors({}); mutation.mutate(); }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? "Edit user" : "Create user"}</DialogTitle>
          <DialogDescription>{user ? "Update this user's details and role." : "The user will receive an email invitation to set their password."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Full name" error={errors["full_name"]} className="sm:col-span-2"><Input value={form.full_name} onChange={(e) => set("full_name")(e.target.value)} /></Field>
          <Field label="User ID" error={errors["user_code"]}><Input placeholder="EMP001" value={form.user_code} onChange={(e) => set("user_code")(e.target.value)} /></Field>
          <Field label="Mobile" error={errors["mobile"]}><Input type="tel" value={form.mobile} onChange={(e) => set("mobile")(e.target.value)} /></Field>
          <Field label="Email" error={errors["email"]} className="sm:col-span-2"><Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} /></Field>
          <Field label="Role" error={errors["role_id"]}>
            <Select value={form.role_id} onValueChange={set("role_id")}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>{assignable.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {!user && (
            <Field label="Status">
              <Select value={form.status} onValueChange={set("status")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : user ? "Save changes" : "Create user"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, className, children }: { label: string; error?: string | undefined; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
