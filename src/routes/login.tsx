import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/app/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { currentUserQuery } from "@/lib/auth/current-user";
import { homePathFor, isSignInAllowed, type CurrentUser } from "@/lib/rbac/permissions";
import { getSetupStatus } from "@/lib/admin/setup.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — CareerOS" },
      { name: "description", content: "Sign in to CareerOS by Coding361." },
      { property: "og:title", content: "Sign in — CareerOS" },
      { property: "og:description", content: "Sign in to CareerOS by Coding361." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setupFn = useServerFn(getSetupStatus);
  const setup = useQuery({ queryKey: ["setup-status"], queryFn: () => setupFn() });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authErr) {
        setError(/banned/i.test(authErr.message) ? "Your account is inactive or suspended. Contact your administrator." : "Incorrect email or password.");
        return;
      }
      const { data } = await supabase.rpc("current_user_context");
      const user = data as unknown as CurrentUser | null;
      if (!user || !isSignInAllowed(user.status) || !user.role_key) {
        await supabase.auth.signOut();
        setError(!user || !user.role_key ? "Your account is not fully set up. Contact your administrator." : "Your account is inactive or suspended. Contact your administrator.");
        return;
      }
      await supabase.rpc("record_login");
      queryClient.setQueryData(currentUserQuery.queryKey, user);
      navigate({ to: homePathFor(user), replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Sign in" subtitle="Welcome to CareerOS. Use the credentials provided by your administrator.">
      {setup.data?.needsSetup && (
        <div className="mb-6 rounded-md border border-primary/30 bg-accent p-3 text-sm text-accent-foreground">
          No administrator exists yet. <Link to="/setup" className="font-semibold underline">Complete first-time setup</Link>.
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
    </AuthShell>
  );
}
