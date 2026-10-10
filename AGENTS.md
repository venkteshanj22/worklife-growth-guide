<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules (CareerOS)
- Authorization lives in the database: `has_permission(uid, key)` backs every RLS policy and every privileged server function; UI checks (`can()` in `src/lib/rbac/permissions.ts`) are cosmetic only. Why: hiding menus is not security.
- Permission keys use `module.resource.action` and are seeded in the `permissions` table; new modules add rows, not code branches. Why: roles stay data-driven.
- All admin writes (users, roles, permissions, settings) go through `src/lib/admin/*.functions.ts`, which verify the permission with the caller's session before using the admin client and always write `audit_logs`. Why: one enforced, audited path; clients have no write policies.
- `audit_logs` is append-only (no update/delete policies, inserts only via server). Why: tamper-resistant history.
- Route gating: `_authenticated` gate → `/app/*` (staff, `roles.is_staff`) or `/portal/*` (candidates); each page uses `requirePermission()` in `beforeLoad`. Why: role-specific shells.
- Sidebar is declarative config in `src/lib/rbac/nav.ts`; future modules render the shared Coming Soon route until built. Why: no fake features.
- Inactive/suspended users are banned in auth and blocked by `is_active_user`. Why: status must stop access, not just login.
- Features live in `src/features/<module>`; routes stay thin. Why: avoid giant components.
