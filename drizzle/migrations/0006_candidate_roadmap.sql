CREATE TABLE public.candidate_roadmaps(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code text NOT NULL UNIQUE,
 candidate_id uuid NOT NULL REFERENCES public.candidates(id),
 pcb_id uuid NOT NULL REFERENCES public.candidate_pcbs(id),
 pcb_version_id uuid NOT NULL REFERENCES public.pcb_versions(id),
 pcb_code text NOT NULL, pcb_version integer NOT NULL,
 status text NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED','ACTIVE','PAUSED','COMPLETED','CANCELLED')),
 career_path text, target_role text, duration_days integer NOT NULL, daily_hours numeric, weekly_days integer NOT NULL DEFAULT 6 CHECK (weekly_days BETWEEN 1 AND 7),
 start_date date NOT NULL, target_end_date date NOT NULL,
 started_at timestamptz, started_by uuid, paused_at timestamptz, paused_by uuid, pause_reason text,
 resumed_at timestamptz, resumed_by uuid, completed_at timestamptz, completed_by uuid,
 cancelled_at timestamptz, cancelled_by uuid, cancel_reason text,
 created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 last_activity_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1);
CREATE UNIQUE INDEX candidate_roadmaps_one_open ON public.candidate_roadmaps(candidate_id) WHERE status IN ('NOT_STARTED','ACTIVE','PAUSED');

CREATE TABLE public.candidate_roadmap_phases(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), roadmap_id uuid NOT NULL REFERENCES public.candidate_roadmaps(id) ON DELETE CASCADE, phase_number integer, name text NOT NULL, objective text, source_pcb_phase_id uuid, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.candidate_roadmap_modules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), roadmap_id uuid NOT NULL REFERENCES public.candidate_roadmaps(id) ON DELETE CASCADE, phase_id uuid NOT NULL REFERENCES public.candidate_roadmap_phases(id) ON DELETE CASCADE, name text NOT NULL, objective text, source_pcb_module_id uuid, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.candidate_roadmap_items(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), roadmap_id uuid NOT NULL REFERENCES public.candidate_roadmaps(id) ON DELETE CASCADE,
 phase_id uuid NOT NULL REFERENCES public.candidate_roadmap_phases(id) ON DELETE CASCADE, module_id uuid NOT NULL REFERENCES public.candidate_roadmap_modules(id) ON DELETE CASCADE,
 day_number integer NOT NULL, title text NOT NULL, topic text, description text, objective text, learning_minutes integer, practice_minutes integer, activity text, expected_output text,
 planned_date date, status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED')),
 started_at timestamptz, completed_at timestamptz, actual_minutes integer, candidate_notes text, notes_updated_at timestamptz,
 source_pcb_day_item_id uuid, sort_order integer NOT NULL DEFAULT 0, lock_version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.candidate_roadmap_resources(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), roadmap_id uuid NOT NULL REFERENCES public.candidate_roadmaps(id) ON DELETE CASCADE, name text NOT NULL, provider text, resource_type text NOT NULL DEFAULT 'OTHER', url text, course_name text, section text, notes text, is_paid boolean NOT NULL DEFAULT false, source_pcb_resource_id uuid, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.candidate_roadmap_resource_mappings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), roadmap_id uuid NOT NULL REFERENCES public.candidate_roadmaps(id) ON DELETE CASCADE, resource_id uuid NOT NULL REFERENCES public.candidate_roadmap_resources(id) ON DELETE CASCADE, phase_id uuid REFERENCES public.candidate_roadmap_phases(id) ON DELETE CASCADE, module_id uuid REFERENCES public.candidate_roadmap_modules(id) ON DELETE CASCADE, item_id uuid REFERENCES public.candidate_roadmap_items(id) ON DELETE CASCADE);
CREATE TABLE public.candidate_roadmap_projects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), roadmap_id uuid NOT NULL REFERENCES public.candidate_roadmaps(id) ON DELETE CASCADE, name text NOT NULL, project_type text, description text, start_day integer, end_day integer, source_pcb_project_id uuid, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.candidate_roadmap_remarks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), roadmap_id uuid NOT NULL REFERENCES public.candidate_roadmaps(id) ON DELETE CASCADE, item_id uuid NOT NULL REFERENCES public.candidate_roadmap_items(id) ON DELETE CASCADE, body text NOT NULL, is_internal boolean NOT NULL DEFAULT false, author_id uuid, author_name text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.candidate_roadmap_status_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), roadmap_id uuid NOT NULL REFERENCES public.candidate_roadmaps(id) ON DELETE CASCADE, from_status text, to_status text NOT NULL, reason text, actor_id uuid, actor_name text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.candidate_roadmap_item_status_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), roadmap_id uuid NOT NULL REFERENCES public.candidate_roadmaps(id) ON DELETE CASCADE, item_id uuid NOT NULL REFERENCES public.candidate_roadmap_items(id) ON DELETE CASCADE, from_status text, to_status text NOT NULL, actor_id uuid, actor_name text, is_candidate boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.candidate_roadmap_activity(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), roadmap_id uuid NOT NULL REFERENCES public.candidate_roadmaps(id) ON DELETE CASCADE, event text NOT NULL, actor_id uuid, actor_name text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());

CREATE INDEX ON public.candidate_roadmap_items(roadmap_id);
CREATE INDEX ON public.candidate_roadmap_modules(roadmap_id);
CREATE INDEX ON public.candidate_roadmap_phases(roadmap_id);
CREATE INDEX ON public.candidate_roadmap_resource_mappings(roadmap_id);
CREATE INDEX ON public.candidate_roadmap_remarks(item_id);
CREATE INDEX ON public.candidate_roadmap_activity(roadmap_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.can_read_roadmap(_rid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.has_permission(auth.uid(),'roadmap.view') AND EXISTS(SELECT 1 FROM public.candidate_roadmaps r WHERE r.id=_rid AND public.can_read_candidate(r.candidate_id)) $$;
CREATE OR REPLACE FUNCTION public.can_read_roadmap_candidate(_cid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.has_permission(auth.uid(),'roadmap.view') AND public.can_read_candidate(_cid) $$;
-- Candidate portal: the caller's own linked candidate id, or null.
CREATE OR REPLACE FUNCTION public.roadmap_my_candidate() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT c.id FROM public.candidate_portal_links l JOIN public.candidates c ON c.id=l.candidate_id
 WHERE l.user_id=auth.uid() AND l.disabled_at IS NULL AND c.portal_status='ACTIVE' AND public.has_permission(auth.uid(),'candidate.self.view') LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.roadmap_my_candidate() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.roadmap_my_candidate() TO authenticated;

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['candidate_roadmaps','candidate_roadmap_phases','candidate_roadmap_modules','candidate_roadmap_items','candidate_roadmap_resources','candidate_roadmap_resource_mappings','candidate_roadmap_projects','candidate_roadmap_remarks','candidate_roadmap_status_history','candidate_roadmap_item_status_history','candidate_roadmap_activity'] LOOP
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['candidate_roadmap_phases','candidate_roadmap_modules','candidate_roadmap_items','candidate_roadmap_resources','candidate_roadmap_resource_mappings','candidate_roadmap_projects','candidate_roadmap_status_history','candidate_roadmap_item_status_history','candidate_roadmap_activity'] LOOP
  EXECUTE format('CREATE POLICY "Roadmap readers" ON public.%I FOR SELECT TO authenticated USING (public.can_read_roadmap(roadmap_id))', t);
 END LOOP;
END $$;
CREATE POLICY "Roadmap readers" ON public.candidate_roadmaps FOR SELECT TO authenticated USING (public.can_read_roadmap_candidate(candidate_id));
CREATE POLICY "Roadmap remark readers" ON public.candidate_roadmap_remarks FOR SELECT TO authenticated USING (public.can_read_roadmap(roadmap_id) AND (NOT is_internal OR public.has_permission(auth.uid(),'roadmap.internal_notes')));

INSERT INTO public.permissions(key,module,label,sort_order) VALUES
 ('roadmap.view','Roadmaps','View roadmaps',601),('roadmap.create','Roadmaps','Create roadmaps',602),('roadmap.start','Roadmaps','Start roadmaps',603),
 ('roadmap.edit','Roadmaps','Adjust roadmap dates',604),('roadmap.status','Roadmaps','Correct day status',605),('roadmap.progress','Roadmaps','View roadmap progress',606),
 ('roadmap.notes','Roadmaps','Add consultant remarks',607),('roadmap.internal_notes','Roadmaps','View / add internal remarks',608),('roadmap.pause','Roadmaps','Pause / resume roadmaps',609),
 ('roadmap.cancel','Roadmaps','Cancel roadmaps',610),('roadmap.complete','Roadmaps','Complete roadmaps',611),('roadmap.reopen','Roadmaps','Reopen completed days',612)
ON CONFLICT (key) DO NOTHING;
INSERT INTO public.role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM public.roles r JOIN public.permissions p ON p.key LIKE 'roadmap.%' AND (
 r.key IN ('director','operations_manager')
 OR (r.key='career_consultant' AND p.key IN ('roadmap.view','roadmap.start','roadmap.status','roadmap.progress','roadmap.notes','roadmap.reopen'))
 OR (r.key IN ('technical_reviewer','placement_executive') AND p.key IN ('roadmap.view','roadmap.progress')))
ON CONFLICT DO NOTHING;