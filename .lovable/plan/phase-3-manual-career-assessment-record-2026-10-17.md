# Phase 3 — Manual Career Assessment Record

Build only the Assessment tab inside Candidate 360°. No tests, question banks, AI, Master Tracks, PCB or roadmap. Phase 1/2 screens stay as they are.

## What staff will see
- Candidate 360° → **Assessment** tab (replaces its Coming Soon placeholder).
  - No assessment: "No Career Assessment has been recorded yet." + **Create Assessment**.
  - Otherwise: summary card of the current official assessment (latest Finalized, else latest), score bars per dimension, strengths, development areas, skill gaps, recommendation, consultant summary, documents, plus **Assessment History** list (#, type, date, score, outcome, status).
- **Assessment editor** (own page per assessment) split into 12 sections with a side stepper: Snapshot (read-only from Candidate Master), Scores, Strengths & Development Areas, Technical Knowledge, Career Preferences (prefilled from Candidate Master, never written back), Career Gap (only if candidate has a gap), Recommendation (outcome, primary/alternative path & role, rationale, not-recommended paths), Skill Gaps, Development Summary, Consultant Summary + Internal Notes, Documents, Review & Finalize.
- Actions: **Save Draft**, **Complete Assessment**, **Finalize Assessment** (confirmation dialog with the spec wording). After finalizing, if the candidate is Enrolled, offer **Move Candidate to Assessment Completed** — never automatic, never backwards.
- **Reassessment** creates a new record; old ones remain untouched.
- Assessment IDs like `ASM-C361-2026-0001-01`.
- Overall score totals automatically; score cannot exceed the dimension maximum (checked in form and database).
- Internal Notes hidden unless the user has `assessment.view_internal`.
- Finalized assessments are read-only except for Super Admin correction.

## Candidate portal
Shows only "Career Assessment — Status: Completed" once completed/finalized. No scores, notes, remarks, documents.

## Permissions
New keys `assessment.view/create/edit/complete/finalize/reassess/documents/view_internal`, with the defaults from the spec, appearing in the existing permission matrix. All access additionally requires being able to read the candidate (assigned-only rules carry over, including documents).

## Activity & audit
Candidate activity events: Created, Updated, Completed, Finalized, Reassessment Created, Document Uploaded. Global audit entries carry only candidate ID, assessment ID, action, actor, time.

## Dashboard
Unchanged (Active Candidates only; others Coming Soon).

## Technical details
- Tables: `assessment_dimensions` (configurable: key, label, max_score, sort, active; seeded with the 7 dimensions totalling 100), `candidate_assessments` (header, sequence per candidate, type, status, assessed_by, overall_score, outcome, preference fields, gap impact/notes/mitigation, summary, `internal_notes` stored in separate `candidate_assessment_internal` table so RLS can hide it), child tables for dimension scores (snapshot of label/max at time of scoring), strengths, development areas, technical skills, skill gaps, recommendations (kind primary/alternative + nullable future `master_track_id`), not-recommended paths, development plan, documents.
- All tables: grants + RLS reading via `can_read_assessment` = `can_read_candidate` + `assessment.view`; no client write policies.
- Writes via security-definer RPCs in one transaction each (`assessment_create`, `assessment_save`, `assessment_set_status`, `assessment_add_document`), enforcing permission, candidate scope, status rules (finalized edit only for super_admin), score bounds, and writing activity + audit.
- Private storage bucket `assessment-documents` (10 MB, PDF/DOC(X)/XLS(X)/JPG/PNG); storage policies tied to assessment access; downloads via short-lived signed URLs.
- Portal summary RPC extended with assessment status only.
- Code in `src/lib/assessments` (model, validation, server functions) and `src/features/assessments`; thin routes `app.candidates.$id.assessment.*`.
- Tests: score-cap and total calculation, status transition rules, permission defaults. Browser check of create → complete → finalize → status prompt, consultant blocked from unassigned candidate's assessment by URL, candidate portal shows status only.
