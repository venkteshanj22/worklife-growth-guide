# Phase 7 — Weekly Reviews, Project Execution & Premium Tasks

Three separate execution modules on top of the Phase 6 roadmap. Phases 1–6 are not redesigned. No AI, scoring, sandbox, readiness gate or Phase 8.

## What gets built

### A. Weekly Reviews (Delivery → Weekly Reviews)
- Staff schedule a review for a candidate's roadmap (week number, period, scheduled date, reviewer). Checklist items are seeded from the PCB weekly-review template when one exists, otherwise from the 8 standard items (Days Completed, Topics Completed, Practice Completed, Project Updated, GitHub Updated, Understood Topics, Needs Help, Roadmap On Schedule) as Yes/No.
- ID `WR-<candidate code>-NN`, sequential per candidate.
- Flow: Scheduled → In Progress → Completed, or Missed (reason required) or Cancelled.
- Details: key progress, strengths, improvement areas, topics to clarify, roadblocks, consultant remarks, candidate-visible feedback, next week plan, reviewer-chosen result (On Track / Attention / Behind). Internal notes kept separately.
- On completion, roadmap progress %, completed / in-progress / pending / overdue days and schedule health are frozen into the review. Completed reviews are read-only. Corrections need a separate permission and a reason, and are audited with history.
- List with search, filters and an overdue flag (scheduled date passed, still Scheduled). Nothing is auto-marked Missed.

### B. Candidate Projects (Delivery → Projects)
- Staff initialize projects from the roadmap's approved PCB projects: details are copied, source PCB / version / project IDs are kept, and the same source project cannot be initialized twice.
- ID `PRJ-<candidate code>-NN`; project types reuse the existing PCB types.
- Candidate: Start → Submit (GitHub URL, optional Live URL, notes) → Resubmit after changes are requested. Every submission is stored as its own history row.
- Reviewer: Request Changes (candidate feedback required) or Complete, with simple ratings (Excellent / Good / Satisfactory / Needs Improvement) on 5 areas, plus strengths and improvement areas. Staff can Cancel with a reason.
- Overdue flag when the due date has passed and the project is not Completed or Cancelled.
- No file uploads in this phase. Links only, which keeps file access safe.

### C. Premium Tasks (Delivery → Premium Tasks)
- Only allowed when the candidate's current Program Plan is Premium. Otherwise creation is blocked with "Premium Tasks are not included in this candidate's current plan." The database enforces this.
- ID `PT-<candidate code>-NNN`. Flow: Assigned → In Progress → Submitted → Changes Requested ↔ Resubmitted → Completed, or Cancelled. Submission and review history is kept.
- If a candidate moves to Standard, past tasks stay visible and new ones are blocked.

### Candidate 360 and Portal
- Candidate 360 gets Weekly Reviews, Projects and Tasks tabs, each listing current and past records with the relevant actions.
- Portal (mobile-first): Weekly Progress (read-only, safe fields only), Projects (start / submit / resubmit, feedback) and My Tasks. My Tasks is hidden from the menu for Standard candidates. If opened directly, it shows the "not included in your plan" message.
- Candidate pages are fed by server code that never selects internal notes.

### Phase 6 fixes
- A warning appears when a new planned date puts the day sequence out of order: "This planned date causes the Roadmap day sequence to be out of order." Staff must confirm before saving, and days are never reordered.
- Every candidate button (Start Day, Mark Complete, Save Note, and the project and task actions) shows a pending state and is disabled until the server confirms.

## Rules enforced
- Access follows the candidate's assignment scope (same as roadmaps). Accounts gets nothing by default, and candidates only see their own records.
- Every record update checks a version number. A stale save is rejected with "This record was changed by someone else. Refresh and review the latest version."
- Activity timeline gets one entry per meaningful event. The audit log holds staff actions only, with IDs and codes and never feedback or notes.
- 22 new permissions with the role defaults from the spec (Super Admin all; Director and Ops Manager full; Consultant handles reviews plus view projects and create/edit tasks; Technical Reviewer handles project review plus view reviews and review tasks; Placement view-only; Accounts none).

## Technical details
- One migration: `candidate_weekly_reviews` (+ `_items`, `_history`, `_internal`), `candidate_projects` (+ `_submissions`, `_reviews`, `_history`, `_internal`), `candidate_premium_tasks` (+ `_submissions`, `_reviews`, `_history`, `_internal`), and per-candidate counters for the IDs. Internal notes live in separate `_internal` tables gated by `*.view_internal`. Each table has RLS through `can_read_candidate`. There are no client write policies, and there is a premium-entitlement trigger.
- Code in `src/lib/execution/` (pure model and tests, `*.functions.ts`, `*.server.ts`) and `src/features/{reviews,projects,tasks}/`. Routes: `app.reviews.*`, `app.projects.*`, `app.tasks.*`, `portal.weekly-progress`, `portal.projects`, `portal.tasks` (these replace the Coming Soon slugs).
- Writes go through server functions: caller-session permission + scope check, then the admin client, with lock_version, activity and audit. Lists are paginated.
- Tests: transitions, overdue rules, entitlement, ID formatting and the date-order warning detector. Then a live walkthrough of the spec's validation scenarios across roles, cleaning up the test data afterwards.
