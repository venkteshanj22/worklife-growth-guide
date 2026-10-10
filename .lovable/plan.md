# CareerOS — Phase 1 Plan (Shell, Auth, Users, RBAC)

Scope is strictly the Phase 1 brief: application shell, sign-in, user management, roles and permissions, audit log, settings, candidate portal shell. No business modules.

## What gets built

**Sign-in (no public signup)**
- `/login` (email + password), `/forgot-password`, `/reset-password`, sign-out, `/access-denied`.
- Inactive/suspended users are blocked at login and on every protected request.
- After login: staff go to `/app/dashboard`, candidates go to `/portal`.

**Staff application (`/app/...`)**
- Left sidebar exactly as specified; items filtered by the user's permissions. Future modules open a shared "Coming Soon" page.
- Top bar with breadcrumbs, user menu, sign-out. Desktop-first, collapsible on smaller screens.
- Dashboard: "CareerOS / Career Journey Management Platform", welcome, role, today's date, 8 placeholder cards clearly marked "Coming soon" (no numbers).
- Admin > Users: table (name, user ID, email, mobile, role, status, last login, created), search, role/status filters, pagination; View, Edit, Activate/Deactivate/Suspend with confirmation dialogs. Create/Edit form with uniqueness and required-field validation. No delete.
- Admin > Roles & Permissions: role list (name, description, user count, status), create/edit custom roles, plus the Permission Matrix (rows = permissions grouped by module, columns = roles, toggles saved immediately). Super Admin role is locked to all permissions.
- Admin > Audit Log: read-only, filterable list (actor, action, target, time, details).
- Admin > Settings: Organization Name, Application Name, Subtitle (editable key/value settings).

**Candidate portal (`/portal/...`)**
- Separate mobile-first layout (top bar + bottom/drawer nav): Home, My PCB, My Roadmap, Weekly Progress, Projects, My Tasks, My Resume, My Openings, Documents, Payments.
- Home shows welcome + the specified activation message; other items are Coming Soon.

**Look and feel**
- Light, premium enterprise style: neutral warm-gray surfaces, deep ink text, a single restrained teal accent; distinctive type pairing (e.g. Sora headings / Manrope body). Cards, clean tables, status badges, toasts, loading/empty/error states. No heavy gradients or animation.

## Seed data
- 8 roles, the Phase 1 permissions below, and default role-permission assignments.
- Settings defaults (Coding361 / CareerOS / subtitle).
- No fake users or statistics.

**Permissions:** dashboard.view, users.view, users.create, users.edit, users.status, roles.view, roles.create, roles.edit, roles.permissions, audit.view, settings.view, settings.edit, candidate.self.view. Future-module sidebar items are tied to permission keys (e.g. candidates.view, pcb.view, finance.view) registered now but with no module behind them, so they stay hidden until granted.

**Defaults:** Super Admin = all. Director = dashboard.view + read of future modules. Other staff roles = dashboard.view (+ relevant future view keys). Candidate = candidate.self.view only.

## Assumptions (tell me if any are wrong)
1. **First Super Admin:** you create an account once via a one-time bootstrap: the first user to sign in with an email you give me is promoted to Super Admin. I'll ask for that email when building.
2. **New user passwords:** when an admin creates a user, the system sends them an email invite to set their own password (no admin-chosen passwords).
3. One role per user (simpler to manage; schema allows changing later).
4. User ID is free text entered by the admin (e.g. EMP001 / CND001), unique.

## Technical details
- Enable Lovable Cloud (database + auth), email/password only, signups disabled at the auth level; auto-confirm off; leaked-password check on.
- Tables: `profiles` (id = auth user, full_name, user_code unique, email unique, mobile, status enum ACTIVE/INACTIVE/SUSPENDED, last_login_at, created_by, timestamps), `roles` (key, name, description, is_system, is_active), `permissions` (key `module.resource.action`, module, description), `user_roles` (user_id, role_id), `role_permissions`, `audit_logs` (actor_id, action, target_type, target_id, metadata jsonb, created_at; insert-only, no update/delete policies), `app_settings` (key, value jsonb). All with GRANTs + RLS.
- Security-definer SQL functions: `has_permission(uid, key)`, `is_active_user(uid)`; every RLS policy uses them (e.g. profiles: own row, or `users.view`). Candidates can only read their own profile.
- Admin actions (create user/invite, change status, change role, toggle permission) run in authenticated server functions that check `has_permission` server-side, use the admin client only after the check, and write audit rows. Status changes to inactive/suspended also revoke sessions.
- Routes: `_authenticated` managed gate; `/app/*` guarded by a staff check and per-page permission checks redirecting to `/access-denied`; `/portal/*` guarded for candidates. Sidebar config is a declarative list `{label, path, permission}`.
- Code split: `lib/auth` (session, permission hook), `lib/rbac` (permission keys, nav config), `features/users`, `features/roles`, `features/audit`, `features/settings` (server functions + components), shared UI in `components/`.
- Vitest tests for permission rules: candidate lacks admin permissions, inactive/suspended blocked, Super Admin has all.
- Record structure rules in AGENTS.md.
