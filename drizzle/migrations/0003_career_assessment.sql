CREATE TABLE public.assessment_dimensions(key text PRIMARY KEY, label text NOT NULL, max_score integer NOT NULL CHECK (max_score>0), sort_order integer NOT NULL DEFAULT 100, is_active boolean NOT NULL DEFAULT true);
INSERT INTO public.assessment_dimensions VALUES
('self_learning','Self-Learning Ability',20,1,true),('logical','Logical / Analytical Ability',20,2,true),('technical','Technical Foundation',15,3,true),('communication','Communication',15,4,true),('time_commitment','Time Commitment',10,5,true),('market_fit','Career / Market Fit',10,6,true),('expectation','Expectation Alignment',10,7,true);

CREATE TABLE public.candidate_assessments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 assessment_code text NOT NULL UNIQUE,
 candidate_id uuid NOT NULL REFERENCES public.candidates(id),
 sequence integer NOT NULL,
 assessment_type text NOT NULL CHECK (assessment_type IN ('INITIAL','REASSESSMENT')),
 status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','COMPLETED','FINALIZED')),
 assessment_date date NOT NULL DEFAULT current_date,
 assessed_by uuid REFERENCES public.profiles(id),
 overall_score numeric,
 overall_outcome text CHECK (overall_outcome IN ('READY','CONDITIONALLY_READY','DEVELOPMENT_REQUIRED','NOT_RECOMMENDED_FOR_SELECTED_PATH')),
 preferred_career text, preferred_technology text, preferred_location text, open_to_relocation boolean NOT NULL DEFAULT false, expected_ctc text,
 learning_hours_per_day numeric, learning_days_per_week integer, preferred_work_mode text, career_objective text,
 gap_impact text CHECK (gap_impact IN ('LOW','MODERATE','HIGH')), gap_notes text, gap_mitigation text,
 assessor_summary text,
 completed_at timestamptz, finalized_at timestamptz, finalized_by uuid REFERENCES public.profiles(id),
 created_by uuid REFERENCES public.profiles(id), updated_by uuid REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(candidate_id,sequence));
CREATE TABLE public.candidate_assessment_internal(assessment_id uuid PRIMARY KEY REFERENCES public.candidate_assessments(id) ON DELETE CASCADE, internal_notes text, updated_by uuid REFERENCES public.profiles(id), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.assessment_dimension_scores(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_id uuid NOT NULL REFERENCES public.candidate_assessments(id) ON DELETE CASCADE, dimension_key text NOT NULL REFERENCES public.assessment_dimensions(key), label text NOT NULL, max_score integer NOT NULL, score numeric CHECK (score IS NULL OR (score>=0 AND score<=max_score)), rating text CHECK (rating IN ('EXCELLENT','GOOD','MODERATE','NEEDS_IMPROVEMENT','WEAK')), remarks text, sort_order integer NOT NULL DEFAULT 100, UNIQUE(assessment_id,dimension_key));
CREATE TABLE public.assessment_strengths(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_id uuid NOT NULL REFERENCES public.candidate_assessments(id) ON DELETE CASCADE, item text NOT NULL, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.assessment_development_areas(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_id uuid NOT NULL REFERENCES public.candidate_assessments(id) ON DELETE CASCADE, item text NOT NULL, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.assessment_technical_skills(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_id uuid NOT NULL REFERENCES public.candidate_assessments(id) ON DELETE CASCADE, skill text NOT NULL, level text NOT NULL CHECK (level IN ('NONE','AWARENESS','BEGINNER','BASIC','INTERMEDIATE','ADVANCED')), remarks text, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.assessment_skill_gaps(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_id uuid NOT NULL REFERENCES public.candidate_assessments(id) ON DELETE CASCADE, skill text NOT NULL, current_level text, required_level text, priority text NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('CRITICAL','HIGH','MEDIUM','LOW')), remarks text, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.assessment_recommendations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_id uuid NOT NULL REFERENCES public.candidate_assessments(id) ON DELETE CASCADE, kind text NOT NULL CHECK (kind IN ('PRIMARY','ALTERNATIVE')), career_path text, target_role text, technology_direction text, rationale text, master_track_id uuid, UNIQUE(assessment_id,kind));
COMMENT ON COLUMN public.assessment_recommendations.master_track_id IS 'Reserved for future Master Track link';
CREATE TABLE public.assessment_not_recommended_paths(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_id uuid NOT NULL REFERENCES public.candidate_assessments(id) ON DELETE CASCADE, path text NOT NULL, reason text, master_track_id uuid, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.assessment_development_plan(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_id uuid NOT NULL REFERENCES public.candidate_assessments(id) ON DELETE CASCADE, area text NOT NULL, recommendation text, priority text NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('CRITICAL','HIGH','MEDIUM','LOW')), estimated_focus text, sort_order integer NOT NULL DEFAULT 0);
CREATE TABLE public.assessment_documents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_id uuid NOT NULL REFERENCES public.candidate_assessments(id) ON DELETE CASCADE, candidate_id uuid NOT NULL REFERENCES public.candidates(id), document_name text NOT NULL, document_type text, storage_path text NOT NULL UNIQUE, file_name text NOT NULL, mime_type text, size_bytes bigint, remarks text, uploaded_by uuid REFERENCES public.profiles(id), uploaded_at timestamptz NOT NULL DEFAULT now());

CREATE OR REPLACE FUNCTION public.can_read_candidate_assessments(_cid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_permission(auth.uid(),'assessment.view') AND public.can_read_candidate(_cid) $$;
CREATE OR REPLACE FUNCTION public.can_read_assessment(_aid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.candidate_assessments a WHERE a.id=_aid AND public.can_read_candidate_assessments(a.candidate_id)) $$;

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['assessment_dimensions','candidate_assessments','candidate_assessment_internal','assessment_dimension_scores','assessment_strengths','assessment_development_areas','assessment_technical_skills','assessment_skill_gaps','assessment_recommendations','assessment_not_recommended_paths','assessment_development_plan','assessment_documents'] LOOP
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t); EXECUTE format('GRANT ALL ON public.%I TO service_role',t); EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['assessment_dimension_scores','assessment_strengths','assessment_development_areas','assessment_technical_skills','assessment_skill_gaps','assessment_recommendations','assessment_not_recommended_paths','assessment_development_plan','assessment_documents'] LOOP
  EXECUTE format('CREATE POLICY "Scoped assessment read" ON public.%I FOR SELECT TO authenticated USING (public.can_read_assessment(assessment_id))',t);
 END LOOP; END $$;
CREATE POLICY "Staff read dimensions" ON public.assessment_dimensions FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'assessment.view'));
CREATE POLICY "Scoped assessment read" ON public.candidate_assessments FOR SELECT TO authenticated USING (public.can_read_candidate_assessments(candidate_id));
CREATE POLICY "Internal notes read" ON public.candidate_assessment_internal FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'assessment.view_internal') AND public.can_read_assessment(assessment_id));

CREATE OR REPLACE FUNCTION public.assessment_assert(_cid uuid, _perm text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.has_permission(auth.uid(),_perm) OR NOT public.can_read_candidate_assessments(_cid) THEN RAISE EXCEPTION 'You do not have access to this assessment or action'; END IF; END $$;

CREATE OR REPLACE FUNCTION public.assessment_log(_cid uuid, _aid uuid, _event text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE code text; BEGIN
 SELECT assessment_code INTO code FROM public.candidate_assessments WHERE id=_aid;
 PERFORM public.candidate_log(_cid,_event,NULL,jsonb_build_object('candidate_id',_cid,'assessment_id',_aid,'assessment_code',code,'action',_event)); END $$;

CREATE OR REPLACE FUNCTION public.assessment_create(_cid uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE c public.candidates; n integer; aid uuid; typ text; BEGIN
 SELECT * INTO c FROM public.candidates WHERE id=_cid FOR UPDATE; IF c.id IS NULL THEN RAISE EXCEPTION 'Candidate not found'; END IF;
 SELECT coalesce(max(sequence),0)+1 INTO n FROM public.candidate_assessments WHERE candidate_id=_cid;
 typ:=CASE WHEN n=1 THEN 'INITIAL' ELSE 'REASSESSMENT' END;
 PERFORM public.assessment_assert(_cid,CASE WHEN n=1 THEN 'assessment.create' ELSE 'assessment.reassess' END);
 INSERT INTO public.candidate_assessments(assessment_code,candidate_id,sequence,assessment_type,assessed_by,preferred_career,preferred_location,open_to_relocation,expected_ctc,preferred_work_mode,created_by,updated_by)
 VALUES('ASM-'||c.candidate_code||'-'||lpad(n::text,2,'0'),_cid,n,typ,auth.uid(),c.candidate_preferred_role,c.preferred_locations,c.open_to_relocation,c.expected_ctc,c.preferred_work_mode,auth.uid(),auth.uid()) RETURNING id INTO aid;
 INSERT INTO public.assessment_dimension_scores(assessment_id,dimension_key,label,max_score,sort_order) SELECT aid,key,label,max_score,sort_order FROM public.assessment_dimensions WHERE is_active;
 INSERT INTO public.assessment_recommendations(assessment_id,kind) VALUES(aid,'PRIMARY'),(aid,'ALTERNATIVE');
 PERFORM public.assessment_log(_cid,aid,CASE WHEN n=1 THEN 'Assessment Created' ELSE 'Reassessment Created' END);
 RETURN aid; END $$;

CREATE OR REPLACE FUNCTION public.assessment_save(_id uuid, _header jsonb, _children jsonb, _internal text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE a public.candidate_assessments; item jsonb; i integer; BEGIN
 SELECT * INTO a FROM public.candidate_assessments WHERE id=_id FOR UPDATE; IF a.id IS NULL THEN RAISE EXCEPTION 'Assessment not found'; END IF;
 PERFORM public.assessment_assert(a.candidate_id,'assessment.edit');
 IF a.status='FINALIZED' AND NOT public.has_permission(auth.uid(),'__super_admin_only__') THEN RAISE EXCEPTION 'Finalized assessments can only be corrected by a Super Admin'; END IF;
 UPDATE public.candidate_assessments SET
  assessment_date=coalesce(nullif(_header->>'assessment_date','')::date,assessment_date),
  assessed_by=coalesce(nullif(_header->>'assessed_by','')::uuid,assessed_by),
  overall_outcome=nullif(_header->>'overall_outcome',''),
  preferred_career=_header->>'preferred_career', preferred_technology=_header->>'preferred_technology', preferred_location=_header->>'preferred_location',
  open_to_relocation=coalesce((_header->>'open_to_relocation')::boolean,false), expected_ctc=_header->>'expected_ctc',
  learning_hours_per_day=nullif(_header->>'learning_hours_per_day','')::numeric, learning_days_per_week=nullif(_header->>'learning_days_per_week','')::integer,
  preferred_work_mode=_header->>'preferred_work_mode', career_objective=_header->>'career_objective',
  gap_impact=nullif(_header->>'gap_impact',''), gap_notes=_header->>'gap_notes', gap_mitigation=_header->>'gap_mitigation',
  assessor_summary=_header->>'assessor_summary', updated_by=auth.uid(), updated_at=now() WHERE id=_id;
 FOR item IN SELECT value FROM jsonb_array_elements(coalesce(_children->'scores','[]')) LOOP
  UPDATE public.assessment_dimension_scores SET score=nullif(item->>'score','')::numeric, rating=nullif(item->>'rating',''), remarks=item->>'remarks' WHERE assessment_id=_id AND dimension_key=item->>'dimension_key';
 END LOOP;
 UPDATE public.candidate_assessments SET overall_score=(SELECT CASE WHEN count(score)=0 THEN NULL ELSE sum(score) END FROM public.assessment_dimension_scores WHERE assessment_id=_id) WHERE id=_id;
 DELETE FROM public.assessment_strengths WHERE assessment_id=_id;
 INSERT INTO public.assessment_strengths(assessment_id,item,sort_order) SELECT _id,trim(v->>'item'),o FROM jsonb_array_elements(coalesce(_children->'strengths','[]')) WITH ORDINALITY x(v,o) WHERE length(trim(coalesce(v->>'item','')))>0;
 DELETE FROM public.assessment_development_areas WHERE assessment_id=_id;
 INSERT INTO public.assessment_development_areas(assessment_id,item,sort_order) SELECT _id,trim(v->>'item'),o FROM jsonb_array_elements(coalesce(_children->'development_areas','[]')) WITH ORDINALITY x(v,o) WHERE length(trim(coalesce(v->>'item','')))>0;
 DELETE FROM public.assessment_technical_skills WHERE assessment_id=_id;
 INSERT INTO public.assessment_technical_skills(assessment_id,skill,level,remarks,sort_order) SELECT _id,trim(v->>'skill'),coalesce(nullif(v->>'level',''),'NONE'),v->>'remarks',o FROM jsonb_array_elements(coalesce(_children->'technical_skills','[]')) WITH ORDINALITY x(v,o) WHERE length(trim(coalesce(v->>'skill','')))>0;
 DELETE FROM public.assessment_skill_gaps WHERE assessment_id=_id;
 INSERT INTO public.assessment_skill_gaps(assessment_id,skill,current_level,required_level,priority,remarks,sort_order) SELECT _id,trim(v->>'skill'),v->>'current_level',v->>'required_level',coalesce(nullif(v->>'priority',''),'MEDIUM'),v->>'remarks',o FROM jsonb_array_elements(coalesce(_children->'skill_gaps','[]')) WITH ORDINALITY x(v,o) WHERE length(trim(coalesce(v->>'skill','')))>0;
 DELETE FROM public.assessment_not_recommended_paths WHERE assessment_id=_id;
 INSERT INTO public.assessment_not_recommended_paths(assessment_id,path,reason,sort_order) SELECT _id,trim(v->>'path'),v->>'reason',o FROM jsonb_array_elements(coalesce(_children->'not_recommended','[]')) WITH ORDINALITY x(v,o) WHERE length(trim(coalesce(v->>'path','')))>0;
 DELETE FROM public.assessment_development_plan WHERE assessment_id=_id;
 INSERT INTO public.assessment_development_plan(assessment_id,area,recommendation,priority,estimated_focus,sort_order) SELECT _id,trim(v->>'area'),v->>'recommendation',coalesce(nullif(v->>'priority',''),'MEDIUM'),v->>'estimated_focus',o FROM jsonb_array_elements(coalesce(_children->'development_plan','[]')) WITH ORDINALITY x(v,o) WHERE length(trim(coalesce(v->>'area','')))>0;
 FOR item IN SELECT value FROM jsonb_array_elements(coalesce(_children->'recommendations','[]')) LOOP
  UPDATE public.assessment_recommendations SET career_path=item->>'career_path', target_role=item->>'target_role', technology_direction=item->>'technology_direction', rationale=item->>'rationale' WHERE assessment_id=_id AND kind=item->>'kind';
 END LOOP;
 IF _internal IS NOT NULL AND public.has_permission(auth.uid(),'assessment.view_internal') THEN
  INSERT INTO public.candidate_assessment_internal(assessment_id,internal_notes,updated_by) VALUES(_id,_internal,auth.uid()) ON CONFLICT(assessment_id) DO UPDATE SET internal_notes=excluded.internal_notes,updated_by=auth.uid(),updated_at=now();
 END IF;
 PERFORM public.assessment_log(a.candidate_id,_id,'Assessment Updated'); END $$;

CREATE OR REPLACE FUNCTION public.assessment_set_status(_id uuid, _status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE a public.candidate_assessments; BEGIN
 SELECT * INTO a FROM public.candidate_assessments WHERE id=_id FOR UPDATE; IF a.id IS NULL THEN RAISE EXCEPTION 'Assessment not found'; END IF;
 IF _status='COMPLETED' THEN
  PERFORM public.assessment_assert(a.candidate_id,'assessment.complete');
  IF a.status<>'DRAFT' THEN RAISE EXCEPTION 'Only a draft can be completed'; END IF;
 ELSIF _status='FINALIZED' THEN
  PERFORM public.assessment_assert(a.candidate_id,'assessment.finalize');
  IF a.status NOT IN ('DRAFT','COMPLETED') THEN RAISE EXCEPTION 'Assessment is already finalized'; END IF;
 ELSE RAISE EXCEPTION 'Invalid status'; END IF;
 IF EXISTS(SELECT 1 FROM public.assessment_dimension_scores WHERE assessment_id=_id AND score IS NULL) OR a.overall_outcome IS NULL THEN RAISE EXCEPTION 'Enter every dimension score and the assessment outcome first'; END IF;
 UPDATE public.candidate_assessments SET status=_status, completed_at=coalesce(completed_at,now()), finalized_at=CASE WHEN _status='FINALIZED' THEN now() END, finalized_by=CASE WHEN _status='FINALIZED' THEN auth.uid() END, updated_by=auth.uid(), updated_at=now() WHERE id=_id;
 PERFORM public.assessment_log(a.candidate_id,_id,CASE WHEN _status='FINALIZED' THEN 'Assessment Finalized' ELSE 'Assessment Completed' END); END $$;

CREATE OR REPLACE FUNCTION public.assessment_add_document(_id uuid, _name text, _type text, _path text, _file text, _mime text, _size bigint, _remarks text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE a public.candidate_assessments; did uuid; BEGIN
 SELECT * INTO a FROM public.candidate_assessments WHERE id=_id; IF a.id IS NULL THEN RAISE EXCEPTION 'Assessment not found'; END IF;
 PERFORM public.assessment_assert(a.candidate_id,'assessment.documents');
 IF _path NOT LIKE a.candidate_id::text||'/'||_id::text||'/%' THEN RAISE EXCEPTION 'Invalid file location'; END IF;
 IF length(trim(coalesce(_name,'')))=0 THEN RAISE EXCEPTION 'Document name is required'; END IF;
 INSERT INTO public.assessment_documents(assessment_id,candidate_id,document_name,document_type,storage_path,file_name,mime_type,size_bytes,remarks,uploaded_by) VALUES(_id,a.candidate_id,trim(_name),_type,_path,_file,_mime,_size,_remarks,auth.uid()) RETURNING id INTO did;
 PERFORM public.assessment_log(a.candidate_id,_id,'Assessment Document Uploaded'); RETURN did; END $$;

CREATE OR REPLACE FUNCTION public.candidate_portal_summary() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT jsonb_build_object('full_name',c.full_name,'candidate_code',c.candidate_code,'program_plan',c.program_plan,'journey_status',c.journey_status,'assessment_completed',EXISTS(SELECT 1 FROM public.candidate_assessments a WHERE a.candidate_id=c.id AND a.status IN ('COMPLETED','FINALIZED'))) FROM public.candidate_portal_links l JOIN public.candidates c ON c.id=l.candidate_id JOIN public.user_roles ur ON ur.user_id=l.user_id JOIN public.roles r ON r.id=ur.role_id WHERE l.user_id=auth.uid() AND l.disabled_at IS NULL AND c.portal_status='ACTIVE' AND r.key='candidate' AND r.is_active AND public.is_active_user(auth.uid()) AND public.has_permission(auth.uid(),'candidate.self.view') $$;

CREATE POLICY "Assessment docs read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='assessment-documents' AND public.can_read_candidate_assessments(((storage.foldername(name))[1])::uuid));
CREATE POLICY "Assessment docs upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='assessment-documents' AND public.has_permission(auth.uid(),'assessment.documents') AND public.can_read_candidate_assessments(((storage.foldername(name))[1])::uuid));