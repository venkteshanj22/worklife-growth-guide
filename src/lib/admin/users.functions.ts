import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePermission, getAdmin, writeAudit, BAN_FOREVER } from "./authz.server";

const statusEnum = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]);

export const userInputSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(120),
  user_code: z.string().trim().min(1, "User ID is required").max(40),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(255),
  mobile: z.string().trim().max(30).optional().default(""),
  role_id: z.string().uuid("Select a role"),
  status: statusEnum,
});
export type UserInput = z.infer<typeof userInputSchema>;

export interface UserRow {
  id: string;
  full_name: string;
  user_code: string;
  email: string;
  mobile: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  last_login_at: string | null;
  created_at: string;
  role_id: string | null;
  role_name: string | null;
  role_key: string | null;
}

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      search: z.string().max(100).default(""),
      roleId: z.string().default(""),
      status: z.string().default(""),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(5).max(100).default(10),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requirePermission(supabase, userId, "users.view");

    let q = supabase.from("profiles").select("*", { count: "exact" }).order("created_at", { ascending: false });
    const term = data.search.replace(/[,()%*]/g, " ").trim();
    if (term) q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,user_code.ilike.%${term}%`);
    if (data.status) q = q.eq("status", statusEnum.parse(data.status));
    if (data.roleId) {
      const { data: ur } = await supabase.from("user_roles").select("user_id").eq("role_id", data.roleId);
      const ids = (ur ?? []).map((r) => r.user_id);
      if (ids.length === 0) return { rows: [] as UserRow[], total: 0 };
      q = q.in("id", ids);
    }
    const from = (data.page - 1) * data.pageSize;
    const { data: profiles, count, error } = await q.range(from, from + data.pageSize - 1);
    if (error) throw new Error("Could not load users");

    const ids = (profiles ?? []).map((p) => p.id);
    const { data: urs } = ids.length
      ? await supabase.from("user_roles").select("user_id, role_id, roles(name, key)").in("user_id", ids)
      : { data: [] };
    const byUser = new Map((urs ?? []).map((r) => [r.user_id, r]));
    const rows: UserRow[] = (profiles ?? []).map((p) => {
      const r = byUser.get(p.id) as { role_id: string; roles: { name: string; key: string } | null } | undefined;
      return {
        id: p.id, full_name: p.full_name, user_code: p.user_code, email: p.email, mobile: p.mobile,
        status: p.status, last_login_at: p.last_login_at, created_at: p.created_at,
        role_id: r?.role_id ?? null, role_name: r?.roles?.name ?? null, role_key: r?.roles?.key ?? null,
      };
    });
    return { rows, total: count ?? 0 };
  });

async function assertUnique(admin: Awaited<ReturnType<typeof getAdmin>>, email: string, code: string, exceptId?: string) {
  const { data } = await admin.from("profiles").select("id, email, user_code")
    .or(`email.ilike.${email},user_code.ilike.${code}`);
  const clash = (data ?? []).filter((p) => p.id !== exceptId);
  if (clash.some((p) => p.email.toLowerCase() === email.toLowerCase())) throw new Error("A user with this email already exists.");
  if (clash.some((p) => p.user_code.toLowerCase() === code.toLowerCase())) throw new Error("This User ID is already in use.");
}

async function assertRoleAssignable(admin: Awaited<ReturnType<typeof getAdmin>>, roleId: string, actorRole: string | null) {
  const { data: role } = await admin.from("roles").select("id, key, name, is_active").eq("id", roleId).maybeSingle();
  if (!role) throw new Error("Role not found.");
  if (role.key === "super_admin" && actorRole !== "super_admin") throw new Error("Only a Super Admin can assign the Super Admin role.");
  return role;
}

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user: userInputSchema, origin: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, "users.create");
    const admin = await getAdmin();
    const u = data.user;
    await assertUnique(admin, u.email, u.user_code);
    const role = await assertRoleAssignable(admin, u.role_id, actor.roleKey);

    const origin = new URL(data.origin).origin;
    const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(u.email, {
      redirectTo: `${origin}/reset-password`,
      data: { full_name: u.full_name },
    });
    if (error || !invited.user) throw new Error(error?.message ?? "Could not create the account.");
    const id = invited.user.id;

    const { error: pErr } = await admin.from("profiles").insert({
      id, full_name: u.full_name, user_code: u.user_code, email: u.email, mobile: u.mobile || null,
      status: u.status, created_by: actor.id,
    });
    if (pErr) {
      await admin.auth.admin.deleteUser(id);
      throw new Error("Could not save the user profile.");
    }
    await admin.from("user_roles").insert({ user_id: id, role_id: u.role_id, created_by: actor.id });
    if (u.status !== "ACTIVE") await admin.auth.admin.updateUserById(id, { ban_duration: BAN_FOREVER });

    await writeAudit(admin, actor, {
      action: "User Created", target_type: "user", target_id: id, target_label: u.full_name,
      metadata: { email: u.email, user_code: u.user_code, role: role.name, status: u.status },
    });
    return { id };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), user: userInputSchema.omit({ status: true }) }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, "users.edit");
    const admin = await getAdmin();
    const u = data.user;
    const { data: before } = await admin.from("profiles").select("*").eq("id", data.id).maybeSingle();
    if (!before) throw new Error("User not found.");
    const { data: beforeRole } = await admin.from("user_roles").select("role_id, roles(key, name)").eq("user_id", data.id).maybeSingle();
    const prevRole = beforeRole as { role_id: string; roles: { key: string; name: string } | null } | null;

    if (prevRole?.roles?.key === "super_admin" && actor.roleKey !== "super_admin") throw new Error("Only a Super Admin can edit a Super Admin.");
    await assertUnique(admin, u.email, u.user_code, data.id);
    const role = await assertRoleAssignable(admin, u.role_id, actor.roleKey);
    const roleChanged = prevRole?.role_id !== u.role_id;
    if (roleChanged && data.id === actor.id) throw new Error("You cannot change your own role.");

    if (before.email.toLowerCase() !== u.email) {
      const { error } = await admin.auth.admin.updateUserById(data.id, { email: u.email, email_confirm: true });
      if (error) throw new Error("Could not update the sign-in email.");
    }
    const { error } = await admin.from("profiles").update({
      full_name: u.full_name, user_code: u.user_code, email: u.email, mobile: u.mobile || null,
    }).eq("id", data.id);
    if (error) throw new Error("Could not update the user.");

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const k of ["full_name", "user_code", "email", "mobile"] as const) {
      const prev = before[k] ?? ""; const next = (u as Record<string, unknown>)[k] ?? "";
      if (prev !== next) changes[k] = { from: prev, to: next };
    }
    if (Object.keys(changes).length) {
      await writeAudit(admin, actor, { action: "User Updated", target_type: "user", target_id: data.id, target_label: u.full_name, metadata: { changes } });
    }
    if (roleChanged) {
      await admin.from("user_roles").upsert({ user_id: data.id, role_id: u.role_id, created_by: actor.id }, { onConflict: "user_id" });
      await writeAudit(admin, actor, {
        action: "Role Changed", target_type: "user", target_id: data.id, target_label: u.full_name,
        metadata: { from: prevRole?.roles?.name ?? null, to: role.name },
      });
    }
    return { ok: true };
  });

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), status: statusEnum }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, "users.status");
    if (data.id === actor.id) throw new Error("You cannot change your own status.");
    const admin = await getAdmin();
    const { data: target } = await admin.from("profiles").select("full_name, status").eq("id", data.id).maybeSingle();
    if (!target) throw new Error("User not found.");
    const { data: tr } = await admin.from("user_roles").select("roles(key)").eq("user_id", data.id).maybeSingle();
    if ((tr as { roles: { key: string } | null } | null)?.roles?.key === "super_admin" && actor.roleKey !== "super_admin") {
      throw new Error("Only a Super Admin can change a Super Admin's status.");
    }
    if (target.status === data.status) return { ok: true };

    const { error: banErr } = await admin.auth.admin.updateUserById(data.id, {
      ban_duration: data.status === "ACTIVE" ? "none" : BAN_FOREVER,
    });
    if (banErr) throw new Error("Could not update sign-in access.");
    await admin.from("profiles").update({ status: data.status }).eq("id", data.id);

    const action = data.status === "ACTIVE" ? "User Activated" : data.status === "INACTIVE" ? "User Deactivated" : "User Suspended";
    await writeAudit(admin, actor, { action, target_type: "user", target_id: data.id, target_label: target.full_name, metadata: { from: target.status, to: data.status } });
    return { ok: true };
  });
