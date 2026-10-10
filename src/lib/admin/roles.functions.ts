import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePermission, getAdmin, writeAudit } from "./authz.server";

export interface RoleRow {
  id: string; key: string; name: string; description: string | null;
  is_system: boolean; is_staff: boolean; is_active: boolean; user_count: number;
}

export const listRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePermission(context.supabase, context.userId, "roles.view");
    const admin = await getAdmin();
    const [{ data: roles }, { data: urs }] = await Promise.all([
      admin.from("roles").select("*").order("sort_order").order("name"),
      admin.from("user_roles").select("role_id"),
    ]);
    const counts = new Map<string, number>();
    for (const r of urs ?? []) counts.set(r.role_id, (counts.get(r.role_id) ?? 0) + 1);
    return (roles ?? []).map((r): RoleRow => ({
      id: r.id, key: r.key, name: r.name, description: r.description,
      is_system: r.is_system, is_staff: r.is_staff, is_active: r.is_active, user_count: counts.get(r.id) ?? 0,
    }));
  });

const roleInput = z.object({
  name: z.string().trim().min(2, "Name is required").max(60),
  description: z.string().trim().max(300).default(""),
  is_staff: z.boolean(),
  is_active: z.boolean(),
});

export const createRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => roleInput.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, "roles.create");
    const admin = await getAdmin();
    const key = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const { data: role, error } = await admin.from("roles").insert({
      key, name: data.name, description: data.description || null, is_staff: data.is_staff, is_active: data.is_active, created_by: actor.id,
    }).select("id").single();
    if (error) throw new Error(error.code === "23505" ? "A role with this name already exists." : "Could not create role.");
    await writeAudit(admin, actor, { action: "Role Created", target_type: "role", target_id: role.id, target_label: data.name, metadata: data });
    return { id: role.id };
  });

export const updateRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => roleInput.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, "roles.edit");
    const admin = await getAdmin();
    const { data: before } = await admin.from("roles").select("*").eq("id", data.id).maybeSingle();
    if (!before) throw new Error("Role not found.");
    const patch = before.is_system
      ? { description: data.description || null, ...(before.key === "super_admin" ? {} : { is_active: data.is_active }) }
      : { name: data.name, description: data.description || null, is_staff: data.is_staff, is_active: data.is_active };
    const { error } = await admin.from("roles").update(patch).eq("id", data.id);
    if (error) throw new Error(error.code === "23505" ? "A role with this name already exists." : "Could not update role.");
    await writeAudit(admin, actor, { action: "Role Updated", target_type: "role", target_id: data.id, target_label: before.name, metadata: { changes: patch } });
    return { ok: true };
  });

export const setRolePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ roleId: z.string().uuid(), permissionId: z.string().uuid(), enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, "roles.permissions");
    const admin = await getAdmin();
    const [{ data: role }, { data: perm }] = await Promise.all([
      admin.from("roles").select("key, name").eq("id", data.roleId).maybeSingle(),
      admin.from("permissions").select("key").eq("id", data.permissionId).maybeSingle(),
    ]);
    if (!role || !perm) throw new Error("Role or permission not found.");
    if (role.key === "super_admin") throw new Error("Super Admin always has every permission.");
    if (data.enabled) {
      await admin.from("role_permissions").upsert({ role_id: data.roleId, permission_id: data.permissionId, created_by: actor.id });
    } else {
      await admin.from("role_permissions").delete().eq("role_id", data.roleId).eq("permission_id", data.permissionId);
    }
    await writeAudit(admin, actor, {
      action: "Permission Changed", target_type: "role", target_id: data.roleId, target_label: role.name,
      metadata: { permission: perm.key, enabled: data.enabled },
    });
    return { ok: true };
  });
