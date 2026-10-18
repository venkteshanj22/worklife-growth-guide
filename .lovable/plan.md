# Phase 6 — Candidate Roadmap & Progress

Build the execution layer only. A roadmap is a snapshot copy of an approved PCB; it never changes when the PCB or Master Track changes. Weekly reviews, project submissions, premium tasks, notifications and reports stay out of scope.

## What users get

- **Delivery → Roadmaps** (staff): a list you can search and filter (status, career path, consultant, dates, progress range, schedule health). A New Roadmap flow: pick a candidate, then their approved PCB, then a start date. You see a preview (duration, daily hours, weekly days, path, role, day count) before you create it.
- **Roadmap workspace**: Overview, Daily Roadmap, Resources, Progress, Activity tabs. Shows the current day, next and last activity, overdue badges, and an On Track / Attention / Behind badge with the reason. Also a "Weekly Reviews — Coming in Phase 7" placeholder, and planned projects shown as reference only.
- **Candidate 360 → Roadmap tab**: create (from the approved PCB) or open the roadmap. Also a "Create Roadmap" button on approved PCBs.
- **Candidate Portal → My Roadmap** (mobile first): summary and progress, a "Today / Current" card, and an expandable day list. Each day has Start, Mark Complete, own notes, resource links, and remarks the candidate is allowed to see.
- Staff actions, all with a confirmation and a reason where needed: Start (and offer to move the candidate to ROADMAP_ACTIVE), Pause/Resume, Cancel, Complete (offered only once every day is done), correct a day's status or reopen it, adjust a planned date, add a remark (candidate-visible or internal).
- Dashboard: small counts only (Active, Behind, Completed).

## Rules

- Create only from an APPROVED PCB version. One open roadmap per candidate (Not Started, Active or Paused), enforced by the database. ID `RM-<candidate code>` (e.g. RM-C361-2026-0001). The exact PCB and version are stored.
- Roadmap statuses: Not Started, Active, Paused, Completed, Cancelled. Day statuses: Pending, In Progress, Completed. Started At is set the first time a day moves to In Progress; Completed At is set on completion. Reopening keeps the history.
- Planned dates: learning days are filled in order from the start date using the PCB's weekly days (6 → Mon–Sat, 5 → Mon–Fri, 7 → every day). The target end date is the planned date of the last day. Times and dates use Kolkata time.
- Overdue = planned date before today and not completed. Schedule health: Behind when 3 or more days are overdue or the oldest overdue day is more than 3 learning days late. Attention when anything is overdue. Otherwise On Track. The reason is shown.
- Progress = completed days / total days, capped at 100%. Progress is also shown per phase and per module.
- Candidates can only start or complete their own days and edit their own notes, and only while the roadmap is Active. They never see internal remarks. Cancelled and Completed roadmaps are read-only.
- Updates carry a lock version. If someone else changed the item first, the stale save is rejected with a message.

## Permissions (new rows, default grants per spec)

roadmap.view, create, start, edit, status, progress, notes, internal_notes, pause, cancel, complete, reopen. Defaults:
- Super Admin, Director, Ops Manager: all.
- Consultant: view, start, status, progress, notes, reopen.
- Tech Reviewer and Placement: view, progress.
- Accounts: none.

Access always follows Candidate Master assignment scope.

## Technical section

- Migration `0006_candidate_roadmap.sql`:
  - Tables: `candidate_roadmaps` (candidate_id, pcb_id, pcb_version_id, code, status, dates, started/paused/resumed/completed/cancelled by and at, reasons, snapshot of duration/hours/days/path/role, lock_version), `candidate_roadmap_phases`, `_modules`, `_items` (source_* ids, planned_date, status, started_at, completed_at, candidate_notes, lock_version), `_resources`, `_resource_mappings`, `_remarks` (is_internal), `_status_history`, `_item_status_history`, `_activity`.
  - A partial unique index for the one-open-roadmap rule. GRANTs and RLS on every table.
  - `can_read_roadmap(id)`, which reuses `can_read_pcb_candidate` / candidate scope plus the candidate's own portal link. Internal remarks are gated by roadmap.internal_notes.
  - Security-definer RPCs: `roadmap_create` (approved check, deep copy in one transaction, date generation), `roadmap_set_status`, `roadmap_item_set_status` (candidate self or staff, with history), `roadmap_item_notes`, `roadmap_add_remark`, `roadmap_set_planned_date`, and `roadmap_portal`. Activity and audit are written in the same transaction; note text never goes to audit.
- Code layout:
  - Code safe to load in the browser lives in `src/lib/roadmaps/` (`model.ts` for scheduling, health and progress, plus `roadmaps.functions.ts`).
  - Screens live in `src/features/roadmaps/`.
  - Routes: `app.roadmaps.index`, `app.roadmaps.new`, `app.roadmaps.$id`, `portal.roadmap`.
  - Nav changes go in `nav.ts`, plus a Roadmap tab in CandidateDetailPage and a button in PcbEditor.
- Whole roadmaps load in a single nested select (no per-day queries).
- Tests in `model.test.ts`: date generation for 6/5/7 days, target end date, overdue, health thresholds, progress cap, current day.
- Updates to AGENTS.md, memory and roadmap.md. Verified in the browser: create from an approved PCB, start, execute a day as the candidate, and confirm the roadmap is unchanged after PCB v2 is approved.

## Setup prerequisite

Testing requires an approved PCB, which in turn needs an Active Master Track and filled-in global content. A temporary test track and PCB will be created for verification and cleaned up afterwards.
