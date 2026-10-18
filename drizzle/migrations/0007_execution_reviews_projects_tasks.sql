CREATE TABLE public.candidate_execution_counters(candidate_id uuid NOT NULL REFERENCES public.candidates(id), kind text NOT NULL CHECK (kind IN ('REVIEW','PROJECT','TASK')), last_value integer NOT NULL DEFAULT 0, PRIMARY KEY(candidate_id, kind));
GRANT ALL ON public.candidate_execution_counters TO service_role;
ALTER TABLE public.candidate_execution_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.execution_next_seq(_cid uuid, _kind text) RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 INSERT INTO public.candidate_execution_counters(candidate_id,kind,last_value) VALUES(_cid,_kind,1)
 ON CONFLICT (candidate_id,kind) DO UPDATE SET last_value=candidate_execution_counters.last_value+1 RETURNING last_value $$;
REVOKE ALL ON FUNCTION public.execution_next_seq(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execution_next_seq(uuid,text) TO service_role;

CREATE TABLE public.candidate_weekly_reviews(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, candidate_id uuid NOT NULL REFERENCES public.candidates(id),
 roadmap_id uuid REFERENCES public.candidate_roadmaps(id), source_pcb_code text, source_pcb_version integer, source_pcb_version_id uuid, source_review_template_id uuid,
 review_number integer NOT NULL, week_number integer NOT NULL, period_start date, period_end date, scheduled_date date NOT NULL, actual_date date,
 reviewer_id uuid REFERENCES public.profiles(id), status text NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','MISSED','CANCELLED')),
 result text CHECK (result IN ('ON_TRACK','ATTENTION','BEHIND')),
 key_progress text, strengths text, improvement_areas text, clarification_topics text, roadblocks text, consultant_remarks text, candidate_feedback text, next_week_plan text,
 snap_progress integer, snap_completed integer, snap_in_progress integer, snap_pending integer, snap_overdue integer, snap_health text,
 started_at timestamptz, completed_at timestamptz, completed_by uuid, missed_at timestamptz, missed_by uuid, missed_reason text, cancel_reason text,
 corrected_at timestamptz, corrected_by uuid, correction_reason text,
 lock_version integer NOT NULL DEFAULT 1, created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), last_activity_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.candidate_weekly_review_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), review_id uuid NOT NULL REFERENCES public.candidate_weekly_reviews(id) ON DELETE CASCADE, candidate_id uuid NOT NULL REFERENCES public.candidates(id), label text NOT NULL, answer boolean, sort_order integer NOT NULL DEFAULT 0);

CREATE TABLE public.candidate_projects(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, candidate_id uuid NOT NULL REFERENCES public.candidates(id),
 roadmap_id uuid REFERENCES public.candidate_roadmaps(id), source_pcb_code text, source_pcb_version integer, source_pcb_version_id uuid, source_pcb_project_id uuid,
 name text NOT NULL, project_type text, scenario text, description text, objectives text, technologies text, deliverables text,
 planned_start_date date, planned_due_date date, actual_start_date date, submitted_at timestamptz, reviewed_at timestamptz, completed_at timestamptz,
 status text NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED','IN_PROGRESS','SUBMITTED','CHANGES_REQUESTED','RESUBMITTED','COMPLETED','CANCELLED')),
 github_url text, live_url text, submission_notes text, reviewer_id uuid REFERENCES public.profiles(id), reviewer_remarks text, candidate_feedback text, cancel_reason text,
 lock_version integer NOT NULL DEFAULT 1, created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), last_activity_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX candidate_projects_one_per_source ON public.candidate_projects(candidate_id, source_pcb_project_id) WHERE source_pcb_project_id IS NOT NULL AND status <> 'CANCELLED';

CREATE TABLE public.candidate_premium_tasks(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, candidate_id uuid NOT NULL REFERENCES public.candidates(id), roadmap_id uuid REFERENCES public.candidate_roadmaps(id),
 assigned_by uuid, assigned_by_name text, reviewer_id uuid REFERENCES public.profiles(id), name text NOT NULL, details text, resource_link text,
 assigned_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Kolkata')::date), due_date date,
 status text NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED','IN_PROGRESS','SUBMITTED','CHANGES_REQUESTED','RESUBMITTED','COMPLETED','CANCELLED')),
 submission text, submission_link text, submitted_at timestamptz, reviewer_remarks text, candidate_feedback text, started_at timestamptz, completed_at timestamptz, cancel_reason text,
 lock_version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), last_activity_at timestamptz NOT NULL DEFAULT now());

CREATE OR REPLACE FUNCTION public.premium_task_entitlement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.candidates WHERE id=NEW.candidate_id AND program_plan='PREMIUM') THEN
  RAISE EXCEPTION 'Premium Tasks are not included in this candidate''s current plan.'; END IF; RETURN NEW; END $$;
CREATE TRIGGER premium_task_entitlement BEFORE INSERT ON public.candidate_premium_tasks FOR EACH ROW EXECUTE FUNCTION public.premium_task_entitlement();

-- Shared child tables (kind = REVIEW / PROJECT / TASK)
CREATE TABLE public.candidate_execution_submissions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK (kind IN ('PROJECT','TASK')), record_id uuid NOT NULL, candidate_id uuid NOT NULL REFERENCES public.candidates(id), attempt integer NOT NULL, github_url text, live_url text, link text, notes text, submitted_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.candidate_execution_reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK (kind IN ('PROJECT','TASK')), record_id uuid NOT NULL, candidate_id uuid NOT NULL REFERENCES public.candidates(id), attempt integer, outcome text NOT NULL CHECK (outcome IN ('CHANGES_REQUESTED','COMPLETED')), ratings jsonb NOT NULL DEFAULT '{}', strengths text, improvement_areas text, reviewer_remarks text, candidate_feedback text, reviewer_id uuid, reviewer_name text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.candidate_execution_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK (kind IN ('REVIEW','PROJECT','TASK')), record_id uuid NOT NULL, candidate_id uuid NOT NULL REFERENCES public.candidates(id), event text NOT NULL, from_status text, to_status text, reason text, actor_id uuid, actor_name text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.candidate_execution_internal(kind text NOT NULL CHECK (kind IN ('REVIEW','PROJECT','TASK')), record_id uuid NOT NULL, candidate_id uuid NOT NULL REFERENCES public.candidates(id), notes text, updated_by uuid, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(kind, record_id));
CREATE INDEX ON public.candidate_execution_submissions(record_id); CREATE INDEX ON public.candidate_execution_reviews(record_id); CREATE INDEX ON public.candidate_execution_history(record_id, created_at DESC);
CREATE INDEX ON public.candidate_weekly_reviews(candidate_id); CREATE INDEX ON public.candidate_projects(candidate_id); CREATE INDEX ON public.candidate_premium_tasks(candidate_id);
CREATE INDEX ON public.candidate_weekly_review_items(review_id);

CREATE OR REPLACE FUNCTION public.can_read_execution(_kind text, _cid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.can_read_candidate(_cid) AND public.has_permission(auth.uid(), CASE _kind WHEN 'REVIEW' THEN 'weekly_review.view' WHEN 'PROJECT' THEN 'project.view' ELSE 'premium_task.view' END) $$;
REVOKE ALL ON FUNCTION public.can_read_execution(text,uuid) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION public.can_read_execution(text,uuid) TO authenticated;

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['candidate_weekly_reviews','candidate_weekly_review_items','candidate_projects','candidate_premium_tasks','candidate_execution_submissions','candidate_execution_reviews','candidate_execution_history','candidate_execution_internal'] LOOP
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
 END LOOP;
END $$;
CREATE POLICY "Review readers" ON public.candidate_weekly_reviews FOR SELECT TO authenticated USING (public.can_read_execution('REVIEW',candidate_id));
CREATE POLICY "Review item readers" ON public.candidate_weekly_review_items FOR SELECT TO authenticated USING (public.can_read_execution('REVIEW',candidate_id));
CREATE POLICY "Project readers" ON public.candidate_projects FOR SELECT TO authenticated USING (public.can_read_execution('PROJECT',candidate_id));
CREATE POLICY "Task readers" ON public.candidate_premium_tasks FOR SELECT TO authenticated USING (public.can_read_execution('TASK',candidate_id));
CREATE POLICY "Submission readers" ON public.candidate_execution_submissions FOR SELECT TO authenticated USING (public.can_read_execution(kind,candidate_id));
CREATE POLICY "Review readers" ON public.candidate_execution_reviews FOR SELECT TO authenticated USING (public.can_read_execution(kind,candidate_id));
CREATE POLICY "History readers" ON public.candidate_execution_history FOR SELECT TO authenticated USING (public.can_read_execution(kind,candidate_id));
CREATE POLICY "Internal readers" ON public.candidate_execution_internal FOR SELECT TO authenticated USING (public.can_read_execution(kind,candidate_id) AND public.has_permission(auth.uid(), CASE kind WHEN 'REVIEW' THEN 'weekly_review.view_internal' WHEN 'PROJECT' THEN 'project.view_internal' ELSE 'premium_task.view_internal' END));

INSERT INTO public.permissions(key,module,label,sort_order) VALUES
 ('weekly_review.view','Weekly Reviews','View weekly reviews',701),('weekly_review.create','Weekly Reviews','Schedule weekly reviews',702),('weekly_review.edit','Weekly Reviews','Edit weekly reviews',703),
 ('weekly_review.complete','Weekly Reviews','Complete weekly reviews',704),('weekly_review.missed','Weekly Reviews','Mark reviews missed / cancel',705),('weekly_review.correct','Weekly Reviews','Correct completed reviews',706),('weekly_review.view_internal','Weekly Reviews','View / edit internal review notes',707),
 ('project.view','Projects','View projects',711),('project.initialize','Projects','Initialize projects',712),('project.edit','Projects','Edit projects',713),('project.review','Projects','Review projects',714),
 ('project.request_changes','Projects','Request project changes',715),('project.complete','Projects','Complete projects',716),('project.cancel','Projects','Cancel projects',717),('project.view_internal','Projects','View / edit internal project notes',718),
 ('premium_task.view','Premium Tasks','View premium tasks',721),('premium_task.create','Premium Tasks','Assign premium tasks',722),('premium_task.edit','Premium Tasks','Edit premium tasks',723),('premium_task.review','Premium Tasks','Review premium tasks',724),
 ('premium_task.request_changes','Premium Tasks','Request task changes',725),('premium_task.complete','Premium Tasks','Complete premium tasks',726),('premium_task.cancel','Premium Tasks','Cancel premium tasks',727),('premium_task.view_internal','Premium Tasks','View / edit internal task notes',728)
ON CONFLICT (key) DO NOTHING;
INSERT INTO public.role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM public.roles r JOIN public.permissions p ON (p.key LIKE 'weekly_review.%' OR p.key LIKE 'project.%' OR p.key LIKE 'premium_task.%') AND (
 r.key IN ('director','operations_manager')
 OR (r.key='career_consultant' AND p.key IN ('weekly_review.view','weekly_review.create','weekly_review.edit','weekly_review.complete','weekly_review.missed','weekly_review.view_internal','project.view','premium_task.view','premium_task.create','premium_task.edit'))
 OR (r.key='technical_reviewer' AND p.key IN ('project.view','project.review','project.request_changes','project.complete','project.view_internal','weekly_review.view','premium_task.view','premium_task.review','premium_task.request_changes','premium_task.complete'))
 OR (r.key='placement_executive' AND p.key IN ('weekly_review.view','project.view')))
ON CONFLICT DO NOTHING;