# Phase 4 — Master Track Library

Build reusable career track templates under PCB Studio → Master Tracks. PCB Builder and PCB Library stay Coming Soon. No candidate roadmaps or PCBs get built in this phase.

## What you will get
- **Master Tracks list**: shows code, name, category, target role, duration, version, status, last updated and updated by. You can search and filter it. Each track has View, Edit, Duplicate, Archive and Create New Version actions.
- **Track editor with tabs**: Overview, Outcomes, Prerequisites, Curriculum, Resources, Milestones, Projects, Weekly Reviews, PCB Content and Version History.
- **Curriculum builder**: Phase → Module → Day item, which you can expand or collapse. Each level has Add, Edit, Duplicate, Deactivate and Move Up/Down controls. Total planned days are shown, with a warning if they don't match the track duration. The warning never blocks saving.
- **Resource library**: one list of resources per version. A resource can be linked to the track, a phase, a module or a day item, and reused in many places.
- **Milestones, project templates (practice, mini and capstone) and weekly review templates** with checklist items.
- **PCB content blocks** per track, using the 10 block types in your spec.
- **Global PCB content library**: content with its own version history, seeded with the 11 placeholder titles as Draft.
- **Versioning**: "Create New Version" copies everything into a new Draft (for example 1.0 → 1.1), along with a change summary. Older versions stay as they are. Activating a version makes it the active one, and the previously active version becomes Inactive.
- **Duplicate track**: creates a fully separate Draft track with a new code.
- **Statuses**: Draft, Active, Inactive and Archived. Only Active tracks are marked available for future PCB use. Published or historical content is never hard-deleted.
- **Optional assessment link**: on a finalized or editable assessment, a staff member can link the primary or alternative recommendation to a Master Track. Nothing is mapped automatically.
- **Permissions and audit**: the 10 new permissions are added, with role defaults exactly as in your spec. Candidates have no access. All 9 audit events are recorded with track code and version only, never the curriculum content itself.
- **Sample shells**: 6 Draft tracks (PY-FS-GAI, JAVA-FS-GAI, AUTO-QA, DEVOPS, DATA-ENG, AI-ML) with header details only. One of them has a single small phase, module and day item to show the builder works. No invented curriculum.

## Technical details
- Tables: `master_tracks` (code unique, category, current pointer) and `master_track_versions`, which owns the header, version, created_from, change_summary, effective date and status. All curriculum and content tables reference `version_id`:
  - outcomes, prerequisites, phases → modules → roadmap_items
  - resources and resource_mappings (polymorphic target type + id)
  - milestones, project_templates
  - weekly_review_templates and their items
  - content_blocks
- Also: `global_pcb_content` and `global_pcb_content_versions`. Every row has its own UUID, so future PCB hybridization can copy single units.
- Categories, resource types and block types are stored as lookup rows, so new values can be added without code changes.
- Track code is locked once the track has an active version.
- Reads are allowed via `has_permission('tracks.view')` or `track_content.view`. Writes go through security-definer RPCs: `track_create`, `track_save_header`, `track_save_section` (per tab, transactional), `track_reorder`, `track_new_version` (deep copy that remaps ids), `track_duplicate`, `track_set_status` and `global_content_save`. Each one checks permissions and writes to `audit_logs`.
- Only non-active Draft versions can be edited. Active, Inactive and Archived versions are read-only, and changes require a new version.
- Assessment mapping uses the existing nullable `master_track_id` on recommendations and not-recommended paths, set through a new `assessment_map_track` RPC. This needs `assessment.edit` and `tracks.view`.
- Code lives in `src/lib/tracks` and `src/features/tracks`. Routes are `/app/tracks`, `/app/tracks/$id` (with a version picker), and `/app/pcb-content` for global content. Nav entries are updated.
- Tests cover version-number validation, the duration mismatch calculation and the permission defaults. Browser checks cover create, version, duplicate, status changes and candidate denial, plus a Phase 1–3 regression smoke test.
- When finished, the completion summary will follow the 17 points in section 40, and then work stops.
