import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdmin, writeAudit } from "./authz.server";

// Public by design: only usable while no Super Admin exists (first-run bootstrap).
async function superAdminExists(admin: Awaited<ReturnType<typeof getAdmin>>) {
  const { data: role } = await admin.from("roles").select("id").eq("key", "super_admin").single();
  const { count } = await admin.from("user_roles").select("id", { count: "exact", head: true }).eq("role_id", role!.id);
  return { exists: (count ?? 0) > 0, roleId: role!.id };
}

export const getSetupStatus = createServerFn({ method: "GET" }).handler(async () => {
  const admin = await getAdmin();
  const { exists } = await superAdminExists(admin);
  return { needsSetup: !exists };
});

export const bootstrapSuperAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      full_name: z.string().trim().min(1).max(120),
      user_code: z.string().trim().min(1).max(40),
      email: z.string().trim().toLowerCase().email(),
      password: z.string().min(10, "Use at least 10 characters").max(72),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await getAdmin();
    const { exists, roleId } = await superAdminExists(admin);
    if (exists) throw new Error("Setup has already been completed.");
    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true, user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create account.");
    const id = created.user.id;
    await admin.from("profiles").insert({ id, full_name: data.full_name, user_code: data.user_code, email: data.email, status: "ACTIVE" });
    await admin.from("user_roles").insert({ user_id: id, role_id: roleId });
    await writeAudit(admin, { id, name: data.full_name, roleKey: "super_admin" }, {
      action: "User Created", target_type: "user", target_id: id, target_label: data.full_name, metadata: { bootstrap: true, role: "Super Admin" },
    });
    return { ok: true };
  });
