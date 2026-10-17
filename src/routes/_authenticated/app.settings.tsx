import { candidateHead } from "@/lib/candidates/head";
import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, PageHeader, Panel } from "@/components/app/shared";
import { supabase } from "@/integrations/supabase/client";
import { updateSettings } from "@/lib/admin/settings.functions";
import { requirePermission } from "@/lib/auth/guards";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export const Route = createFileRoute("/_authenticated/app/settings")({
  beforeLoad: requirePermission(PERMISSIONS.settingsView),
  head: () => candidateHead("Settings", "Organization and application settings for CareerOS."),
  component: SettingsPage,
});

function SettingsPage() {
  const { can } = useCurrentUser();
  const editable = can(PERMISSIONS.settingsEdit);
  const qc = useQueryClient();
  const saveFn = useServerFn(updateSettings);
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("key, label, value").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => { if (q.data) setValues(Object.fromEntries(q.data.map((s) => [s.key, s.value]))); }, [q.data]);

  const m = useMutation({
    mutationFn: () => saveFn({ data: { values } }),
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e) => toast.error(e.message.includes("required") ? "All fields are required." : e.message),
  });

  function onSubmit(e: FormEvent) { e.preventDefault(); m.mutate(); }

  return (
    <>
      <PageHeader crumbs={["Admin", "Settings"]} title="Settings" description="Organization and application details." />
      <Panel className="max-w-2xl">
        {q.isError ? <ErrorState message="Could not load settings." /> : !q.data ? (
          <div className="space-y-4 p-6">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="space-y-5 p-6">
              <h2 className="text-sm font-semibold">General</h2>
              {q.data.map((s) => (
                <div key={s.key} className="space-y-1.5">
                  <Label htmlFor={s.key}>{s.label}</Label>
                  <Input id={s.key} disabled={!editable} value={values[s.key] ?? ""} onChange={(e) => setValues({ ...values, [s.key]: e.target.value })} />
                </div>
              ))}
            </div>
            {editable && (
              <div className="flex justify-end border-t px-6 py-4">
                <Button type="submit" disabled={m.isPending}>{m.isPending ? "Saving…" : "Save changes"}</Button>
              </div>
            )}
          </form>
        )}
      </Panel>
    </>
  );
}
