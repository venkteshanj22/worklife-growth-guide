import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/app/AuthShell";
import { bootstrapSuperAdmin, getSetupStatus } from "@/lib/admin/setup.functions";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "First-time setup — CareerOS" },
      { name: "description", content: "Create the first CareerOS Super Admin account." },
      { property: "og:title", content: "First-time setup — CareerOS" },
      { property: "og:description", content: "Create the first CareerOS Super Admin account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const statusFn = useServerFn(getSetupStatus);
  const bootstrapFn = useServerFn(bootstrapSuperAdmin);
  const status = useQuery({ queryKey: ["setup-status"], queryFn: () => statusFn() });
  const [form, setForm] = useState({ full_name: "", user_code: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 10) return setError("Password must be at least 10 characters.");
    setBusy(true);
    try {
      await bootstrapFn({ data: form });
      toast.success("Super Admin created. Please sign in.");
      navigate({ to: "/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed.");
    } finally {
      setBusy(false);
    }
  }

  if (status.isLoading) return <AuthShell title="First-time setup"><p className="text-sm text-muted-foreground">Checking…</p></AuthShell>;
  if (!status.data?.needsSetup)
    return (
      <AuthShell title="Setup complete" subtitle="CareerOS already has an administrator.">
        <Link to="/login" className="text-sm font-medium text-primary hover:underline">Go to sign in</Link>
      </AuthShell>
    );

  return (
    <AuthShell title="First-time setup" subtitle="Create the first Super Admin. This page closes permanently once done.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="n">Full name</Label><Input id="n" required value={form.full_name} onChange={set("full_name")} /></div>
        <div className="space-y-1.5"><Label htmlFor="c">User ID</Label><Input id="c" required placeholder="EMP001" value={form.user_code} onChange={set("user_code")} /></div>
        <div className="space-y-1.5"><Label htmlFor="e">Email</Label><Input id="e" type="email" required value={form.email} onChange={set("email")} /></div>
        <div className="space-y-1.5"><Label htmlFor="p">Password</Label><Input id="p" type="password" autoComplete="new-password" required value={form.password} onChange={set("password")} /></div>
        {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create Super Admin"}</Button>
      </form>
    </AuthShell>
  );
}
