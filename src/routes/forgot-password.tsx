import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/app/AuthShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — CareerOS" },
      { name: "description", content: "Reset your CareerOS password." },
      { property: "og:title", content: "Forgot password — CareerOS" },
      { property: "og:description", content: "Reset your CareerOS password." },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    setSent(true);
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we'll send you a secure reset link.">
      {sent ? (
        <div className="space-y-4">
          <p className="rounded-md bg-success-soft px-3 py-3 text-sm text-success">If an account exists for that email, a reset link is on its way.</p>
          <Link to="/login" className="text-sm font-medium text-primary hover:underline">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
          <Link to="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">Back to sign in</Link>
        </form>
      )}
    </AuthShell>
  );
}
