import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePermission, getAdmin, writeAudit } from "./authz.server";

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ values: z.record(z.string().trim().min(1, "Value is required").max(200)) }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, "settings.edit");
    const admin = await getAdmin();
    const { data: existing } = await admin.from("app_settings").select("key, value");
    const changes: Record<string, { from: string; to: string }> = {};
    for (const row of existing ?? []) {
      const next = data.values[row.key];
      if (next !== undefined && next !== row.value) {
        await admin.from("app_settings").update({ value: next, updated_by: actor.id, updated_at: new Date().toISOString() }).eq("key", row.key);
        changes[row.key] = { from: row.value, to: next };
      }
    }
    if (Object.keys(changes).length) {
      await writeAudit(admin, actor, { action: "Settings Updated", target_type: "settings", metadata: { changes } });
    }
    return { ok: true };
  });
