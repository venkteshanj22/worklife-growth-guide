import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

export interface Actor {
  id: string;
  name: string;
  roleKey: string | null;
}

/** Server-side permission check using the caller's own session (RLS-scoped). Throws when denied. */
export async function requirePermission(supabase: Client, userId: string, key: string): Promise<Actor> {
  const { data: allowed, error } = await supabase.rpc("has_permission", { _uid: userId, _key: key });
  if (error) throw new Error("Could not verify permissions");
  if (!allowed) throw new Error("You do not have permission to perform this action.");
  const { data: ctx } = await supabase.rpc("current_user_context");
  const c = (ctx ?? {}) as { full_name?: string; role_key?: string | null };
  return { id: userId, name: c.full_name ?? "Unknown", roleKey: c.role_key ?? null };
}

export async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function writeAudit(
  admin: Client,
  actor: Actor | null,
  entry: { action: string; target_type: string; target_id?: string | null; target_label?: string | null; metadata?: Record<string, unknown> },
) {
  await admin.from("audit_logs").insert({
    actor_id: actor?.id ?? null,
    actor_name: actor?.name ?? "System",
    action: entry.action,
    target_type: entry.target_type,
    target_id: entry.target_id ?? null,
    target_label: entry.target_label ?? null,
    metadata: (entry.metadata ?? {}) as never,
  });
}

export const BAN_FOREVER = "876000h";
