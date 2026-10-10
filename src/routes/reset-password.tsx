import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/app/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { signOutEverywhere } from "@/lib/auth/current-user";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — CareerOS" },
      { name: "description", content: "Choose a new password for your CareerOS account." },
      { property: "og:title", content: "Set a new password — CareerOS" },
      { property: "og:description", content: "Choose a new password for your CareerOS account." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    const t = setTimeout(async () => {
      const { data: s } = await supabase.auth.getSession();
      setReady((r) => r ?? !!s.session);
    }, 1200);
    return () => { data.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 10) return setError("Use at least 10 characters.");
    if (pw !== pw2) return setError("Passwords do not match.");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) return setError(err.message);
    toast.success("Password updated. Please sign in.");
    await signOutEverywhere(queryClient);
    navigate({ to: "/login", replace: true });
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password you haven't used elsewhere.">
      {ready === null ? (
        <p className="text-sm text-muted-foreground">Verifying your link…</p>
      ) : !ready ? (
        <div className="space-y-4">
          <p className="rounded-md bg-danger-soft px-3 py-3 text-sm text-destructive">This link is invalid or has expired.</p>
          <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">Request a new link</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="pw">New password</Label><Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="pw2">Confirm password</Label><Input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
          {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save password"}</Button>
        </form>
      )}
    </AuthShell>
  );
}
