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

- Candidate Master uses normalized business tables independent from profiles; client-safe modules live in src/lib/candidates and screens in src/features/candidates. Why: portal identity and business records have different lifecycles.
- Candidate mutations use authenticated database RPC transactions with permission and row-scope checks, activity and audit in the same transaction. Why: prevent partial saves and missing history.
- Candidate record access uses can_read_candidate with view_all or applicable assignments; portal summaries expose an explicit four-field projection only. Why: least-privilege personal data access.
- Career Assessments are child records of a candidate (src/lib/assessments, src/features/assessments); reads inherit can_read_candidate via can_read_candidate_assessments, internal notes live in a separate table gated by assessment.view_internal, and writes go through assessment_* RPCs that log activity/audit. Why: assessment privacy must follow candidate assignment and hide internal notes at the database.
- Assessment dimensions are configurable rows; scores snapshot label/max per assessment, and recommendations carry a nullable master_track_id for future linking. Why: dimensions and Master Tracks will evolve without rewriting past records.
- Master Tracks (src/lib/tracks, src/features/tracks): every curriculum/content row carries version_id and belongs to exactly one master_track_versions row; only DRAFT versions are editable, new versions and duplicates are deep copies via service-only track_copy_version. Why: published versions and future PCB snapshots must never change underneath.
- Track writes go through tracks.functions.ts (permission check, draft check, admin client, audit_logs with code/version only). Why: one audited write path, no client write policies.
