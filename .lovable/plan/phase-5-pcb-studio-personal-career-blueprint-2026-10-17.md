# Phase 5 — PCB Studio (Personal Career Blueprint)

Scope: PCB Builder, PCB Library, Candidate 360° PCB tab, candidate portal "My PCB". No roadmap execution, AI, opportunities or finance. Phases 1–4 are not redesigned.

## What gets built

**Navigation**
- PCB Studio → PCB Builder (`/app/pcb`) and PCB Library (`/app/pcb/library`) become active; editor at `/app/pcb/$pcbId/v/$version`.
- Candidate 360° gets a PCB tab: current official PCB, actions and history.
- Portal gets "My PCB" for approved versions only.

**Identity and status**
- One PCB per candidate: `PCB-C361-2026-0001`. Versions V1, V2… show as `PCB-C361-2026-0001-V1`.
- Statuses: Draft, In Review, Changes Requested, Approved, Superseded, Cancelled. Only one version can be the current Approved one. Approving V2 makes V1 Superseded and keeps its data and PDF.

**Creation wizard (6 steps)**
1. Candidate: search by ID, name, mobile or email.
2. Assessment: uses the latest finalized one. If none exists, show a warning. Only users with the override permission can continue, and they must give a reason, which is logged.
3. Base Master Track: Active versions only. A Master Track mapped from the primary recommendation is preselected.
4. Optional extra content from other tracks.
5. Setup: choose what to copy (curriculum, resources, milestones, projects, weekly reviews, track content), plus duration and daily hours/weekly days.
6. Create Draft. Everything is copied into PCB-owned records with source metadata. Offer "Move candidate to PCB Preparation".

**Editor (12 tabs)**
Overview, Career Direction, Skill Gap, Target Capabilities, Curriculum, Resources, Milestones, Projects, Weekly Plan, PCB Content, Document Preview, Version History.
- Curriculum is an expandable Phase → Module → Day tree. Items can be kept, edited, removed, duplicated, reordered, added as custom, or added from another track. Includes "Recalculate Day Numbers" and a duration mismatch warning.
- "Add From Master Track" lets you browse any track version and pick phases, modules, day items, resources, milestones, projects, weekly reviews or content blocks. Picked items are copied in and labelled "Added from <track>".
- Subtle source badges appear in the editor only: Base Track, Added from X, Assessment, Consultant Custom, Global Content.
- Content Composer: a default structure of about 25 sections, which you can change. Sections are seeded from Global PCB Content and track content blocks. Each section can be included or excluded, edited as the candidate's copy, or reordered, and custom sections can be added. Controlled sections such as the No-Guarantee statement, disclaimer and commitment can only be edited with the controlled-content permission and can be fully locked.
- Safe editing: clear save status, a warning before leaving with unsaved changes, buttons disabled while saving, and visible errors. If someone else changed the draft in the meantime, show: "This PCB was modified by another user. Refresh before saving your changes."

**Review and approval**
- Actions: Save, Submit for Review, Request Changes, Approve, Cancel.
- Review notes (general or per section) can be Open or Resolved and are never overwritten.
- Before approval, a checklist must pass: assessment or override present, career path, target role, curriculum, skill gaps, capabilities, at least one project, duration mismatch acknowledged, and required controlled content present.
- Approval records who approved it, when, and remarks. The version then becomes read-only, its PDF is generated and stored, and you're offered "Move candidate to PCB Approved" (never moves a candidate backwards).
- "Create New Version" makes a full independent copy and asks for a reason.

**PDF**
- A4 corporate layout with a Coding361 cover, candidate name/ID, PCB ID/version and date, then sections in document order.
- Draft preview PDFs carry a DRAFT watermark. Approved PDFs are stored privately with generated-by/at and a checksum, and older ones are never overwritten.
- Source labels and internal notes are left out of the PDF.

**Library and Builder landing**
- Library: searchable and filterable table (status, career path, base track, created by, dates) with actions based on permission.
- Builder landing: New PCB button plus Draft, In Review, Changes Requested and Recently Approved queues.

**Permissions**
13 `pcb.*` permissions with the role defaults from the spec. Access follows candidate assignment through the existing candidate access rule, including for PDF downloads. Accounts and Candidate roles get no staff access.

**Audit and activity**
Concise entries (candidate ID, PCB ID, version, action) for every action listed in the spec. Full content is never written to the log.

## Technical details
- New tables, all child rows keyed by `version_id`: `candidate_pcbs`, `pcb_versions` (header, career direction, assessment snapshot JSON, `lock_version` for concurrency), `pcb_source_tracks`, `pcb_skill_gaps`, `pcb_target_capabilities`, `pcb_phases`, `pcb_modules`, `pcb_day_items`, `pcb_resources`, `pcb_resource_mappings`, `pcb_milestones`, `pcb_projects`, `pcb_weekly_reviews`, `pcb_weekly_review_items`, `pcb_content_blocks` (source_type, is_controlled, is_locked), `pcb_review_notes`, `pcb_documents`.
- Content rows carry `source_type` (MASTER_TRACK / OTHER_MASTER_TRACK / ASSESSMENT / GLOBAL / CUSTOM) plus source track code, version and entity ID, with no foreign keys to track rows, so there is no live dependency.
- Reads use RLS through `can_read_pcb(version)` → `can_read_candidate`. Portal access is a security-definer function that returns approved/superseded-free current-approved projections only.
- Writes go through security-definer RPCs: `pcb_create`, `pcb_import_from_track`, `pcb_new_version` (deep copy), `pcb_set_status`, `pcb_approve`, `pcb_recalculate_days`. Generic item save and delete run through `src/lib/pcb/pcb.functions.ts`, which checks the permission, candidate scope, Draft/Changes Requested status, `lock_version` and controlled rules, and writes audit/activity.
- PDF is built server-side with `pdf-lib` (works on the Worker runtime), stored in a private `pcb-documents` bucket, and served through signed URLs only after an authorization check.
- Code lives in `src/lib/pcb` and `src/features/pcb` with thin routes. AGENTS.md gets a rule for PCB snapshot/versioning, and memory gets PCB rules.
- Tests: model tests (validation checklist, day recalculation, duration mismatch, ID format, status transitions). Live checks: create from finalized assessment, hybrid import, snapshot independence (track change and V2 edit leave V1 unchanged), approve, PDF, V2 approval supersedes V1, portal visibility, consultant scope, unauthorized PDF access, and a Phase 1–4 smoke test.
