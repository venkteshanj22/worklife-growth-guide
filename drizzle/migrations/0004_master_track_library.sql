CREATE TABLE public.master_tracks(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code text NOT NULL,
 current_version_id uuid,
 created_by uuid, updated_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX master_tracks_code_uq ON public.master_tracks(upper(code));

CREATE TABLE public.master_track_versions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 track_id uuid NOT NULL REFERENCES public.master_tracks(id) ON DELETE RESTRICT,
 version text NOT NULL,
 created_from_version text,
 change_summary text,
 status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','INACTIVE','ARCHIVED')),
 name text NOT NULL, short_name text, category text NOT NULL DEFAULT 'DEVELOPMENT', description text,
 primary_role text, alt_roles text,
 duration_days integer NOT NULL DEFAULT 60 CHECK (duration_days BETWEEN 1 AND 730),
 daily_hours numeric, weekly_days integer, experience_level text, effective_date date,
 prereq_education text, prereq_knowledge text, prereq_communication text, prereq_logical text,
 prereq_daily_time text, prereq_infrastructure text, prereq_other text,
 created_by uuid, updated_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(track_id, version));
ALTER TABLE public.master_tracks ADD CONSTRAINT master_tracks_current_fk FOREIGN KEY (current_version_id) REFERENCES public.master_track_versions(id) ON DELETE SET NULL;

CREATE TABLE public.track_outcomes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.master_track_versions(id) ON DELETE CASCADE, title text NOT NULL, description text, sort_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.track_phases(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.master_track_versions(id) ON DELETE CASCADE, phase_number integer, name text NOT NULL, short_description text, objective text, start_day integer, end_day integer, sort_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.track_modules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.master_track_versions(id) ON DELETE CASCADE, phase_id uuid NOT NULL REFERENCES public.track_phases(id) ON DELETE CASCADE, name text NOT NULL, description text, objective text, suggested_duration text, sort_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.track_roadmap_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.master_track_versions(id) ON DELETE CASCADE, module_id uuid NOT NULL REFERENCES public.track_modules(id) ON DELETE CASCADE, day_number integer, title text NOT NULL, topic text, description text, objective text, learning_minutes integer, practice_minutes integer, activity text, expected_output text, resource_refs text, notes text, sort_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.track_resources(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.master_track_versions(id) ON DELETE CASCADE, name text NOT NULL, provider text, resource_type text NOT NULL DEFAULT 'OTHER', url text, course_name text, section text, start_ref text, end_ref text, is_paid boolean NOT NULL DEFAULT false, estimated_cost numeric, notes text, sort_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.track_resource_mappings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.master_track_versions(id) ON DELETE CASCADE, resource_id uuid NOT NULL REFERENCES public.track_resources(id) ON DELETE CASCADE, phase_id uuid REFERENCES public.track_phases(id) ON DELETE CASCADE, module_id uuid REFERENCES public.track_modules(id) ON DELETE CASCADE, roadmap_item_id uuid REFERENCES public.track_roadmap_items(id) ON DELETE CASCADE, sort_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.track_milestones(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.master_track_versions(id) ON DELETE CASCADE, name text NOT NULL, target_day integer, description text, evidence text, sort_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.track_project_templates(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.master_track_versions(id) ON DELETE CASCADE, name text NOT NULL, project_type text NOT NULL DEFAULT 'PRACTICE_PROJECT' CHECK (project_type IN ('PRACTICE_PROJECT','MINI_PROJECT','CAPSTONE')), description text, scenario text, technologies text, features text, deliverables text, start_day integer, end_day integer, difficulty text, sort_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.track_weekly_reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.master_track_versions(id) ON DELETE CASCADE, week_number integer, title text NOT NULL, expected_progress text, guidance text, sort_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.track_weekly_review_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.master_track_versions(id) ON DELETE CASCADE, weekly_review_id uuid NOT NULL REFERENCES public.track_weekly_reviews(id) ON DELETE CASCADE, item text NOT NULL, sort_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.track_content_blocks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES public.master_track_versions(id) ON DELETE CASCADE, block_type text NOT NULL DEFAULT 'CUSTOM', title text NOT NULL, content text, sort_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true);

CREATE TABLE public.global_pcb_content(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, title text NOT NULL, content_type text NOT NULL DEFAULT 'GENERAL', content text, status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','INACTIVE','ARCHIVED')), version integer NOT NULL DEFAULT 1, sort_order integer NOT NULL DEFAULT 0, updated_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.global_pcb_content_versions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), content_id uuid NOT NULL REFERENCES public.global_pcb_content(id) ON DELETE CASCADE, version integer NOT NULL, title text NOT NULL, content_type text, content text, status text, created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(content_id, version));

CREATE INDEX ON public.master_track_versions(track_id);
CREATE INDEX ON public.track_modules(phase_id);
CREATE INDEX ON public.track_roadmap_items(module_id);

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['master_tracks','master_track_versions','track_outcomes','track_phases','track_modules','track_roadmap_items','track_resources','track_resource_mappings','track_milestones','track_project_templates','track_weekly_reviews','track_weekly_review_items','track_content_blocks','global_pcb_content','global_pcb_content_versions'] LOOP
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['master_tracks','master_track_versions','track_outcomes','track_phases','track_modules','track_roadmap_items','track_resources','track_resource_mappings','track_milestones','track_project_templates','track_weekly_reviews','track_weekly_review_items'] LOOP
  EXECUTE format('CREATE POLICY "Track viewers read" ON public.%I FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),''tracks.view'') OR public.has_permission(auth.uid(),''track_content.view''))', t);
 END LOOP;
END $$;
CREATE POLICY "Track content viewers read" ON public.track_content_blocks FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'track_content.view'));
CREATE POLICY "Global content viewers read" ON public.global_pcb_content FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'global_pcb_content.view'));
CREATE POLICY "Global content viewers read" ON public.global_pcb_content_versions FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'global_pcb_content.view'));

-- Deep copy a version (all children, ids remapped). Server-only.
CREATE OR REPLACE FUNCTION public.track_copy_version(_src uuid, _track uuid, _version text, _from text, _summary text, _actor uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE nv uuid := gen_random_uuid(); t text;
BEGIN
 INSERT INTO public.master_track_versions SELECT (jsonb_populate_record(NULL::public.master_track_versions,
   to_jsonb(v) || jsonb_build_object('id',nv,'track_id',_track,'version',_version,'created_from_version',_from,'change_summary',_summary,'status','DRAFT','created_by',_actor,'updated_by',_actor,'created_at',now(),'updated_at',now()))).*
   FROM public.master_track_versions v WHERE v.id=_src;
 IF NOT FOUND THEN RAISE EXCEPTION 'Source version not found'; END IF;
 CREATE TEMP TABLE IF NOT EXISTS _track_map(old uuid PRIMARY KEY, new uuid NOT NULL) ON COMMIT DROP;
 TRUNCATE _track_map;
 FOREACH t IN ARRAY ARRAY['track_phases','track_modules','track_roadmap_items','track_resources','track_resource_mappings','track_weekly_reviews','track_weekly_review_items','track_outcomes','track_milestones','track_project_templates','track_content_blocks'] LOOP
  EXECUTE format('INSERT INTO _track_map SELECT id, gen_random_uuid() FROM public.%I WHERE version_id=$1', t) USING _src;
  EXECUTE format($q$INSERT INTO public.%1$I SELECT (jsonb_populate_record(NULL::public.%1$I,
    to_jsonb(x) || jsonb_build_object('id',m.new,'version_id',$2) || jsonb_strip_nulls(jsonb_build_object(
     'phase_id',(SELECT new FROM _track_map WHERE old=(to_jsonb(x)->>'phase_id')::uuid),
     'module_id',(SELECT new FROM _track_map WHERE old=(to_jsonb(x)->>'module_id')::uuid),
     'roadmap_item_id',(SELECT new FROM _track_map WHERE old=(to_jsonb(x)->>'roadmap_item_id')::uuid),
     'resource_id',(SELECT new FROM _track_map WHERE old=(to_jsonb(x)->>'resource_id')::uuid),
     'weekly_review_id',(SELECT new FROM _track_map WHERE old=(to_jsonb(x)->>'weekly_review_id')::uuid))))).*
    FROM public.%1$I x JOIN _track_map m ON m.old=x.id WHERE x.version_id=$1$q$, t) USING _src, nv;
 END LOOP;
 RETURN nv;
END $$;
REVOKE ALL ON FUNCTION public.track_copy_version(uuid,uuid,text,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_copy_version(uuid,uuid,text,text,text,uuid) TO service_role;

-- Permissions
INSERT INTO public.permissions(key,module,label,sort_order) VALUES
 ('tracks.view','Master Tracks','View master tracks',400),
 ('tracks.create','Master Tracks','Create and duplicate tracks',401),
 ('tracks.edit','Master Tracks','Edit draft tracks',402),
 ('tracks.version','Master Tracks','Create new track versions',403),
 ('tracks.activate','Master Tracks','Activate / deactivate tracks',404),
 ('tracks.archive','Master Tracks','Archive tracks',405),
 ('track_content.view','Master Tracks','View track PCB content',406),
 ('track_content.edit','Master Tracks','Edit track PCB content',407),
 ('global_pcb_content.view','Master Tracks','View global PCB content',408),
 ('global_pcb_content.edit','Master Tracks','Edit global PCB content',409)
ON CONFLICT (key) DO NOTHING;
INSERT INTO public.role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM public.roles r JOIN public.permissions p ON
 (r.key='director' AND p.key IN ('tracks.view','track_content.view','global_pcb_content.view','tracks.activate','tracks.archive'))
 OR (r.key='operations_manager' AND p.key IN ('tracks.view','tracks.create','tracks.edit','tracks.version','track_content.view','track_content.edit','global_pcb_content.view'))
 OR (r.key='career_consultant' AND p.key IN ('tracks.view','track_content.view','global_pcb_content.view'))
 OR (r.key='technical_reviewer' AND p.key IN ('tracks.view','track_content.view'))
 OR (r.key='placement_executive' AND p.key IN ('tracks.view'))
ON CONFLICT DO NOTHING;

-- Sample draft shells (header only)
DO $$ DECLARE r record; tid uuid; vid uuid; pid uuid; mid uuid; BEGIN
 FOR r IN SELECT * FROM (VALUES
  ('PY-FS-GAI','Python Full Stack + GenAI','Python FS + GenAI','DEVELOPMENT','Junior Python Developer'),
  ('JAVA-FS-GAI','Java Full Stack + GenAI','Java FS + GenAI','DEVELOPMENT','Junior Java Developer'),
  ('AUTO-QA','Automation Testing','Automation QA','TESTING','Automation Test Engineer'),
  ('DEVOPS','DevOps','DevOps','DEVOPS_CLOUD','Junior DevOps Engineer'),
  ('DATA-ENG','Data Engineering','Data Eng','DATA','Junior Data Engineer'),
  ('AI-ML','AI / ML','AI / ML','AI_ML','Junior ML Engineer')) s(code,name,short,cat,role) LOOP
  INSERT INTO public.master_tracks(code) VALUES (r.code) RETURNING id INTO tid;
  INSERT INTO public.master_track_versions(track_id,version,name,short_name,category,primary_role,duration_days,daily_hours,weekly_days,experience_level)
   VALUES (tid,'1.0',r.name,r.short,r.cat,r.role,60,3,6,'Entry / Career Transition') RETURNING id INTO vid;
  UPDATE public.master_tracks SET current_version_id=vid WHERE id=tid;
  IF r.code='PY-FS-GAI' THEN
   INSERT INTO public.track_phases(version_id,phase_number,name,start_day,end_day,sort_order) VALUES (vid,1,'Sample Phase',1,1,1) RETURNING id INTO pid;
   INSERT INTO public.track_modules(version_id,phase_id,name,sort_order) VALUES (vid,pid,'Sample Module',1) RETURNING id INTO mid;
   INSERT INTO public.track_roadmap_items(version_id,module_id,day_number,title,sort_order) VALUES (vid,mid,1,'Sample Day Item',1);
  END IF;
 END LOOP;
 INSERT INTO public.global_pcb_content(code,title,sort_order)
 SELECT upper(regexp_replace(t,'[^A-Za-z0-9]+','_','g')), t, o FROM unnest(ARRAY['Coding361 Introduction','Director Message','How to Use Your Blueprint','60-Day Philosophy','Daily Working Model','Weekly Review Explanation','CareerOS Explanation','Opportunity Process','No-Guarantee Statement','Candidate Commitment','Closing Message']) WITH ORDINALITY u(t,o);
 INSERT INTO public.global_pcb_content_versions(content_id,version,title,content_type,status) SELECT id,1,title,content_type,status FROM public.global_pcb_content;
END $$;