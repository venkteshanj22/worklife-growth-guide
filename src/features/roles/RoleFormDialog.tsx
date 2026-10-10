import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createRole, updateRole, type RoleRow } from "@/lib/admin/roles.functions";

export function RoleFormDialog({ open, onOpenChange, role }: { open: boolean; onOpenChange: (o: boolean) => void; role: RoleRow | null }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createRole);
  const updateFn = useServerFn(updateRole);
  const [form, setForm] = useState({ name: "", description: "", is_staff: true, is_active: true });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(role ? { name: role.name, description: role.description ?? "", is_staff: role.is_staff, is_active: role.is_active } : { name: "", description: "", is_staff: true, is_active: true });
  }, [open, role]);

  const m = useMutation({
    mutationFn: async (): Promise<unknown> => (role ? updateFn({ data: { ...form, id: role.id } }) : createFn({ data: form })),
    onSuccess: () => { toast.success(role ? "Role updated" : "Role created"); qc.invalidateQueries({ queryKey: ["roles"] }); onOpenChange(false); },
    onError: (e) => toast.error(e.message),
  });

  const system = !!role?.is_system;
  const locked = role?.key === "super_admin";
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError("Name is required.");
    m.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{role ? "Edit role" : "Create role"}</DialogTitle>
          <DialogDescription>{system ? "System roles keep their name and type; you can update the description." : "Custom roles start with no permissions. Assign them in the matrix."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Name</Label><Input disabled={system} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />{error && <p className="text-xs text-destructive">{error}</p>}</div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <label className="flex items-center justify-between rounded-md border p-3">
            <span><span className="block text-sm font-medium">Staff role</span><span className="text-xs text-muted-foreground">Staff use the admin app; others use the candidate portal.</span></span>
            <Switch disabled={system} checked={form.is_staff} onCheckedChange={(v) => setForm({ ...form, is_staff: v })} />
          </label>
          <label className="flex items-center justify-between rounded-md border p-3">
            <span><span className="block text-sm font-medium">Active</span><span className="text-xs text-muted-foreground">Inactive roles grant no permissions.</span></span>
            <Switch disabled={locked} checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={m.isPending}>{m.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
