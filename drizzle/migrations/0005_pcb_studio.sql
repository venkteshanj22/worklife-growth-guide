CREATE TABLE public.candidate_pcbs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 pcb_code text NOT NULL UNIQUE,
 candidate_id uuid NOT NULL UNIQUE REFERENCES public.candidates(id) ON DELETE CASCADE,
 current_approved_version_id uuid,
 created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.pcb_versions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 pcb_id uuid NOT NULL REFERENCES public.candidate_pcbs(id) ON DELETE CASCADE,
 version integer NOT NULL,
 status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','IN_REVIEW','CHANGES_REQUESTED','APPROVED','SUPERSEDED','CANCELLED')),
 assessment_id uuid, assessment_code text, assessment_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb, assessment_override boolean NOT NULL DEFAULT false,
 base_track_id uuid, base_track_version_id uuid, base_track_code text, base_track_version text, base_track_name text,
 target_duration_days integer NOT NULL DEFAULT 60, daily_hours numeric, weekly_days integer, target_completion_window text,
 current_profile_summary text, transition_goal text, primary_career_path text, primary_target_role text,
 alt_career_path text, alt_target_role text, target_industry text, preferred_location text, expected_outcome text, rationale text,
 duration_ack boolean NOT NULL DEFAULT false,
 created_from_version integer, change_reason text,
 created_by uuid, created_at timestamptz NOT NULL DEFAULT now(),
 submitted_by uuid, submitted_at timestamptz, reviewed_by uuid, reviewed_at timestamptz,
 approved_by uuid, approved_at timestamptz, approval_remarks text, cancelled_by uuid, cancelled_at timestamptz,
 lock_version integer NOT NULL DEFAULT 1, updated_by uuid, updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(pcb_id, version));
ALTER TABLE public.candidate_pcbs ADD CONSTRAINT candidate_pcbs_current_fk FOREIGN KEY (current_approved_version_id) REFERENCES public.pcb_versions(id);
CREATE UNIQUE INDEX pcb_one_approved ON public.pcb_versions(pcb_id) WHERE status='APPROVED';

CREATE TABLE public.pcb_version_internal(version_id uuid PRIMARY KEY REFERENCES public.pcb_versions(id) ON DELETE CASCADE, override_reason text, internal_notes text, updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.pcb_source_tracks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.pcb_versions(id) ON DELETE CASCADE, track_id uuid, track_version_id uuid, track_code text NOT NULL, track_version text NOT NULL, track_name text, role text NOT NULL DEFAULT 'ADDITIONAL', copied_at timestamptz NOT NULL DEFAULT now(), sort_order integer NOT NULL DEFAULT 0);

CREATE TABLE public.pcb_skill_gaps(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.pcb_versions(id) ON DELETE CASCADE, skill text NOT NULL, current_level text, target_level text, priority text NOT NULL DEFAULT 'MEDIUM', description text, action text, source_type text NOT NULL DEFAULT 'CUSTOM', source_track_code text, source_track_version text, source_entity_id uuid, copied_at timestamptz, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.pcb_target_capabilities(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.pcb_versions(id) ON DELETE CASCADE, title text NOT NULL, description text, evidence text, source_type text NOT NULL DEFAULT 'CUSTOM', source_track_code text, source_track_version text, source_entity_id uuid, copied_at timestamptz, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.pcb_phases(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.pcb_versions(id) ON DELETE CASCADE, phase_number integer, name text NOT NULL, short_description text, objective text, start_day integer, end_day integer, source_type text NOT NULL DEFAULT 'CUSTOM', source_track_code text, source_track_version text, source_entity_id uuid, copied_at timestamptz, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.pcb_modules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.pcb_versions(id) ON DELETE CASCADE, phase_id uuid NOT NULL REFERENCES public.pcb_phases(id) ON DELETE CASCADE, name text NOT NULL, description text, objective text, suggested_duration text, source_type text NOT NULL DEFAULT 'CUSTOM', source_track_code text, source_track_version text, source_entity_id uuid, copied_at timestamptz, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.pcb_day_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.pcb_versions(id) ON DELETE CASCADE, module_id uuid NOT NULL REFERENCES public.pcb_modules(id) ON DELETE CASCADE, day_number integer, title text NOT NULL, topic text, description text, objective text, learning_minutes integer, practice_minutes integer, activity text, expected_output text, notes text, source_type text NOT NULL DEFAULT 'CUSTOM', source_track_code text, source_track_version text, source_entity_id uuid, copied_at timestamptz, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.pcb_resources(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.pcb_versions(id) ON DELETE CASCADE, name text NOT NULL, provider text, resource_type text NOT NULL DEFAULT 'OTHER', url text, course_name text, section text, start_ref text, end_ref text, is_paid boolean NOT NULL DEFAULT false, estimated_cost numeric, notes text, source_type text NOT NULL DEFAULT 'CUSTOM', source_track_code text, source_track_version text, source_entity_id uuid, copied_at timestamptz, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.pcb_resource_mappings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.pcb_versions(id) ON DELETE CASCADE, resource_id uuid NOT NULL REFERENCES public.pcb_resources(id) ON DELETE CASCADE, phase_id uuid REFERENCES public.pcb_phases(id) ON DELETE CASCADE, module_id uuid REFERENCES public.pcb_modules(id) ON DELETE CASCADE, day_item_id uuid REFERENCES public.pcb_day_items(id) ON DELETE CASCADE, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.pcb_milestones(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.pcb_versions(id) ON DELETE CASCADE, name text NOT NULL, target_day integer, description text, evidence text, source_type text NOT NULL DEFAULT 'CUSTOM', source_track_code text, source_track_version text, source_entity_id uuid, copied_at timestamptz, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.pcb_projects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.pcb_versions(id) ON DELETE CASCADE, name text NOT NULL, project_type text NOT NULL DEFAULT 'MINI', scenario text, description text, technologies text, features text, deliverables text, start_day integer, end_day integer, difficulty text, selection_reason text, source_type text NOT NULL DEFAULT 'CUSTOM', source_track_code text, source_track_version text, source_entity_id uuid, copied_at timestamptz, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.pcb_weekly_reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.pcb_versions(id) ON DELETE CASCADE, week_number integer, title text NOT NULL, expected_progress text, guidance text, source_type text NOT NULL DEFAULT 'CUSTOM', source_track_code text, source_track_version text, source_entity_id uuid, copied_at timestamptz, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.pcb_weekly_review_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.pcb_versions(id) ON DELETE CASCADE, weekly_review_id uuid NOT NULL REFERENCES public.pcb_weekly_reviews(id) ON DELETE CASCADE, item text NOT NULL, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.pcb_content_blocks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.pcb_versions(id) ON DELETE CASCADE, code text, block_type text NOT NULL DEFAULT 'NARRATIVE', title text NOT NULL, content text, is_included boolean NOT NULL DEFAULT true, is_controlled boolean NOT NULL DEFAULT false, is_locked boolean NOT NULL DEFAULT false, source_type text NOT NULL DEFAULT 'CUSTOM', source_track_code text, source_track_version text, source_entity_id uuid, copied_at timestamptz, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.pcb_review_notes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.pcb_versions(id) ON DELETE CASCADE, section text NOT NULL DEFAULT 'GENERAL', comment text NOT NULL, status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED')), author_id uuid, author_name text, created_at timestamptz NOT NULL DEFAULT now(), resolved_by uuid, resolved_at timestamptz);
CREATE TABLE public.pcb_documents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.pcb_versions(id) ON DELETE CASCADE, storage_path text NOT NULL, file_name text NOT NULL, checksum text, size_bytes bigint, generated_by uuid, generated_at timestamptz NOT NULL DEFAULT now());

CREATE INDEX ON public.pcb_versions(pcb_id);
CREATE INDEX ON public.pcb_modules(phase_id);
CREATE INDEX ON public.pcb_day_items(module_id);

CREATE OR REPLACE FUNCTION public.can_read_pcb_candidate(_cid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.has_permission(auth.uid(),'pcb.view') AND public.can_read_candidate(_cid) $$;
CREATE OR REPLACE FUNCTION public.can_read_pcb_version(_vid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.pcb_versions v JOIN public.candidate_pcbs p ON p.id=v.pcb_id WHERE v.id=_vid AND public.can_read_pcb_candidate(p.candidate_id)) $$;

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['candidate_pcbs','pcb_versions','pcb_version_internal','pcb_source_tracks','pcb_skill_gaps','pcb_target_capabilities','pcb_phases','pcb_modules','pcb_day_items','pcb_resources','pcb_resource_mappings','pcb_milestones','pcb_projects','pcb_weekly_reviews','pcb_weekly_review_items','pcb_content_blocks','pcb_review_notes','pcb_documents'] LOOP
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['pcb_source_tracks','pcb_skill_gaps','pcb_target_capabilities','pcb_phases','pcb_modules','pcb_day_items','pcb_resources','pcb_resource_mappings','pcb_milestones','pcb_projects','pcb_weekly_reviews','pcb_weekly_review_items','pcb_content_blocks','pcb_review_notes','pcb_documents'] LOOP
  EXECUTE format('CREATE POLICY "PCB readers" ON public.%I FOR SELECT TO authenticated USING (public.can_read_pcb_version(version_id))', t);
 END LOOP;
END $$;
CREATE POLICY "PCB readers" ON public.candidate_pcbs FOR SELECT TO authenticated USING (public.can_read_pcb_candidate(candidate_id));
CREATE POLICY "PCB readers" ON public.pcb_versions FOR SELECT TO authenticated USING (public.can_read_pcb_version(id));
CREATE POLICY "PCB internal readers" ON public.pcb_version_internal FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'pcb.view_internal') AND public.can_read_pcb_version(version_id));

-- Content in approved/superseded/cancelled versions can never change.
CREATE OR REPLACE FUNCTION public.pcb_guard_content() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE st text; BEGIN
 SELECT status INTO st FROM public.pcb_versions WHERE id=coalesce(NEW.version_id,OLD.version_id);
 IF st IS NOT NULL AND st NOT IN ('DRAFT','CHANGES_REQUESTED') THEN RAISE EXCEPTION 'This PCB version is read-only. Create a new version to make changes.'; END IF;
 RETURN coalesce(NEW,OLD); END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['pcb_skill_gaps','pcb_target_capabilities','pcb_phases','pcb_modules','pcb_day_items','pcb_resources','pcb_resource_mappings','pcb_milestones','pcb_projects','pcb_weekly_reviews','pcb_weekly_review_items','pcb_content_blocks','pcb_source_tracks'] LOOP
  EXECUTE format('CREATE TRIGGER pcb_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.pcb_guard_content()', t);
 END LOOP;
END $$;

-- Deep copy all content of one version into another (ids remapped). Server-only.
CREATE OR REPLACE FUNCTION public.pcb_copy_children(_src uuid, _dst uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t text; BEGIN
 CREATE TEMP TABLE IF NOT EXISTS _pcb_map(old uuid PRIMARY KEY, new uuid NOT NULL) ON COMMIT DROP;
 TRUNCATE _pcb_map;
 FOREACH t IN ARRAY ARRAY['pcb_source_tracks','pcb_skill_gaps','pcb_target_capabilities','pcb_phases','pcb_modules','pcb_day_items','pcb_resources','pcb_resource_mappings','pcb_milestones','pcb_projects','pcb_weekly_reviews','pcb_weekly_review_items','pcb_content_blocks'] LOOP
  EXECUTE format('INSERT INTO _pcb_map SELECT id, gen_random_uuid() FROM public.%I WHERE version_id=$1', t) USING _src;
  EXECUTE format($q$INSERT INTO public.%1$I SELECT (jsonb_populate_record(NULL::public.%1$I,
    to_jsonb(x) || jsonb_build_object('id',m.new,'version_id',$2) || jsonb_strip_nulls(jsonb_build_object(
     'phase_id',(SELECT new FROM _pcb_map WHERE old=(to_jsonb(x)->>'phase_id')::uuid),
     'module_id',(SELECT new FROM _pcb_map WHERE old=(to_jsonb(x)->>'module_id')::uuid),
     'day_item_id',(SELECT new FROM _pcb_map WHERE old=(to_jsonb(x)->>'day_item_id')::uuid),
     'resource_id',(SELECT new FROM _pcb_map WHERE old=(to_jsonb(x)->>'resource_id')::uuid),
     'weekly_review_id',(SELECT new FROM _pcb_map WHERE old=(to_jsonb(x)->>'weekly_review_id')::uuid))))).*
    FROM public.%1$I x JOIN _pcb_map m ON m.old=x.id WHERE x.version_id=$1$q$, t) USING _src, _dst;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.pcb_copy_children(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pcb_copy_children(uuid,uuid) TO service_role;

-- Candidate portal: only the current approved version, fixed projection.
CREATE OR REPLACE FUNCTION public.pcb_portal_summary() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('pcb_code',p.pcb_code,'version',v.version,'approved_at',v.approved_at,'career_path',v.primary_career_path,'target_role',v.primary_target_role,'duration_days',v.target_duration_days,'has_pdf',EXISTS(SELECT 1 FROM public.pcb_documents d WHERE d.version_id=v.id))
 FROM public.candidate_portal_links l JOIN public.candidates c ON c.id=l.candidate_id JOIN public.candidate_pcbs p ON p.candidate_id=c.id JOIN public.pcb_versions v ON v.id=p.current_approved_version_id AND v.status='APPROVED'
 WHERE l.user_id=auth.uid() AND l.disabled_at IS NULL AND c.portal_status='ACTIVE' AND public.has_permission(auth.uid(),'candidate.self.view') $$;
REVOKE ALL ON FUNCTION public.pcb_portal_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pcb_portal_summary() TO authenticated;

UPDATE public.permissions SET module='PCB Studio', label='View PCBs' WHERE key='pcb.view';
INSERT INTO public.permissions(key,module,label,sort_order) VALUES
 ('pcb.create','PCB Studio','Create PCBs',501),('pcb.edit','PCB Studio','Edit draft PCBs',502),('pcb.submit_review','PCB Studio','Submit PCB for review',503),
 ('pcb.review','PCB Studio','Review PCBs',504),('pcb.approve','PCB Studio','Approve PCBs',505),('pcb.request_changes','PCB Studio','Request PCB changes',506),
 ('pcb.version','PCB Studio','Create new PCB versions',507),('pcb.cancel','PCB Studio','Cancel PCBs',508),('pcb.pdf','PCB Studio','View / generate PCB PDF',509),
 ('pcb.view_internal','PCB Studio','View PCB internal notes',510),('pcb.override_assessment','PCB Studio','Override missing assessment',511),('pcb.controlled_content','PCB Studio','Edit controlled PCB content',512)
ON CONFLICT (key) DO NOTHING;
INSERT INTO public.role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM public.roles r JOIN public.permissions p ON
 (r.key='director' AND p.key IN ('pcb.view','pcb.review','pcb.approve','pcb.request_changes','pcb.version','pcb.pdf','pcb.view_internal','pcb.controlled_content'))
 OR (r.key='operations_manager' AND p.key IN ('pcb.view','pcb.create','pcb.edit','pcb.submit_review','pcb.review','pcb.approve','pcb.request_changes','pcb.version','pcb.cancel','pcb.pdf','pcb.view_internal','pcb.override_assessment'))
 OR (r.key='career_consultant' AND p.key IN ('pcb.view','pcb.create','pcb.edit','pcb.submit_review','pcb.pdf'))
 OR (r.key='technical_reviewer' AND p.key IN ('pcb.view','pcb.review','pcb.request_changes'))
 OR (r.key='placement_executive' AND p.key IN ('pcb.view','pcb.pdf'))
ON CONFLICT DO NOTHING;