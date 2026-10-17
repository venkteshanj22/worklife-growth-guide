CREATE TABLE public.candidate_program_plans (key text PRIMARY KEY, name text NOT NULL, is_active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 100);
GRANT SELECT ON public.candidate_program_plans TO authenticated; GRANT ALL ON public.candidate_program_plans TO service_role;
ALTER TABLE public.candidate_program_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read program plans" ON public.candidate_program_plans FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'candidates.view'));
CREATE TABLE public.candidate_year_counters (year integer PRIMARY KEY, last_number integer NOT NULL DEFAULT 0);
GRANT ALL ON public.candidate_year_counters TO service_role;
ALTER TABLE public.candidate_year_counters ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.candidates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), candidate_code text NOT NULL UNIQUE,
 full_name text NOT NULL, primary_mobile text NOT NULL, personal_email text NOT NULL,
 date_of_birth date, gender text, alternate_mobile text, alternate_email text,
 address_line_1 text, address_line_2 text, city text, state text, pin_code text, country text NOT NULL DEFAULT 'India', profile_photo text,
 employment_status text NOT NULL DEFAULT 'FRESHER' CHECK (employment_status IN ('FRESHER','EMPLOYED','UNEMPLOYED','SELF_EMPLOYED','CAREER_BREAK')),
 has_career_gap boolean NOT NULL DEFAULT false, gap_start_date date, gap_end_date date, currently_in_gap boolean NOT NULL DEFAULT false, gap_duration text, gap_reason text, gap_explanation text, gap_internal_remarks text,
 current_career_situation text, existing_skills text, tools_known text, total_experience numeric, relevant_it_experience numeric, last_designation text, last_industry text, last_ctc text, expected_ctc text, preferred_locations text, open_to_relocation boolean NOT NULL DEFAULT false, preferred_work_mode text, candidate_preferred_role text,
 enrollment_date date, program_plan text REFERENCES public.candidate_program_plans(key), program_status text, roadmap_duration integer NOT NULL DEFAULT 60 CHECK (roadmap_duration > 0), tentative_start_date date, tentative_end_date date, source_reference text, internal_remarks text,
 journey_status text NOT NULL DEFAULT 'DRAFT' CHECK (journey_status IN ('DRAFT','ENROLLED','ASSESSMENT_COMPLETED','PCB_PREPARATION','PCB_APPROVED','ROADMAP_ACTIVE','OPPORTUNITY_READY','OPPORTUNITY_PHASE','SELECTED','COMPLETED','ON_HOLD','DISCONTINUED','CANCELLED')),
 portal_status text NOT NULL DEFAULT 'NOT_ACTIVATED' CHECK (portal_status IN ('NOT_ACTIVATED','ACTIVE','DISABLED')),
 created_by uuid REFERENCES public.profiles(id), updated_by uuid REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.candidates TO authenticated; GRANT ALL ON public.candidates TO service_role;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.candidate_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), candidate_id uuid NOT NULL REFERENCES public.candidates(id), assignment_type text NOT NULL CHECK (assignment_type IN ('career_consultant','technical_reviewer','placement_executive')), user_id uuid REFERENCES public.profiles(id), created_by uuid REFERENCES public.profiles(id), updated_by uuid REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(candidate_id,assignment_type)
);
GRANT SELECT ON public.candidate_assignments TO authenticated; GRANT ALL ON public.candidate_assignments TO service_role;
ALTER TABLE public.candidate_assignments ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.can_read_candidate(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_permission(auth.uid(),'candidates.view') AND (public.has_permission(auth.uid(),'candidates.view_all') OR (public.has_permission(auth.uid(),'candidates.view_assigned') AND EXISTS (SELECT 1 FROM public.candidate_assignments WHERE candidate_id=_id AND user_id=auth.uid()))) $$;
REVOKE ALL ON FUNCTION public.can_read_candidate(uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.can_read_candidate(uuid) TO authenticated;
CREATE POLICY "Scoped staff candidate read" ON public.candidates FOR SELECT TO authenticated USING (public.can_read_candidate(id));
CREATE POLICY "Scoped assignment read" ON public.candidate_assignments FOR SELECT TO authenticated USING (public.can_read_candidate(candidate_id));
CREATE TABLE public.candidate_education (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), candidate_id uuid NOT NULL REFERENCES public.candidates(id), qualification_level text, degree text, specialization text, institution text, university text, start_year integer, completion_year integer, score text, education_type text, status text, created_by uuid REFERENCES public.profiles(id), updated_by uuid REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.candidate_education TO authenticated; GRANT ALL ON public.candidate_education TO service_role;
ALTER TABLE public.candidate_education ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scoped education read" ON public.candidate_education FOR SELECT TO authenticated USING (public.can_read_candidate(candidate_id));
CREATE TABLE public.candidate_employment (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), candidate_id uuid NOT NULL REFERENCES public.candidates(id), company_name text, designation text, employment_type text, industry text, location text, start_date date, end_date date, currently_working boolean NOT NULL DEFAULT false, ctc text, role_description text, technologies text, reason_for_leaving text, remarks text, created_by uuid REFERENCES public.profiles(id), updated_by uuid REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.candidate_employment TO authenticated; GRANT ALL ON public.candidate_employment TO service_role;
ALTER TABLE public.candidate_employment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scoped employment read" ON public.candidate_employment FOR SELECT TO authenticated USING (public.can_read_candidate(candidate_id));
CREATE TABLE public.candidate_status_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), candidate_id uuid NOT NULL REFERENCES public.candidates(id), old_status text, new_status text NOT NULL, changed_by uuid REFERENCES public.profiles(id), changed_at timestamptz NOT NULL DEFAULT now(), remarks text
);
GRANT SELECT ON public.candidate_status_history TO authenticated; GRANT ALL ON public.candidate_status_history TO service_role;
ALTER TABLE public.candidate_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scoped status history read" ON public.candidate_status_history FOR SELECT TO authenticated USING (public.can_read_candidate(candidate_id));
CREATE TABLE public.candidate_assignment_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), candidate_id uuid NOT NULL REFERENCES public.candidates(id), assignment_type text NOT NULL, previous_user uuid REFERENCES public.profiles(id), new_user uuid REFERENCES public.profiles(id), changed_by uuid REFERENCES public.profiles(id), changed_at timestamptz NOT NULL DEFAULT now(), remarks text
);
GRANT SELECT ON public.candidate_assignment_history TO authenticated; GRANT ALL ON public.candidate_assignment_history TO service_role;
ALTER TABLE public.candidate_assignment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scoped assignment history read" ON public.candidate_assignment_history FOR SELECT TO authenticated USING (public.can_read_candidate(candidate_id));
CREATE TABLE public.candidate_portal_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), candidate_id uuid NOT NULL UNIQUE REFERENCES public.candidates(id), user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id), activated_at timestamptz NOT NULL DEFAULT now(), disabled_at timestamptz, created_by uuid REFERENCES public.profiles(id), updated_by uuid REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.candidate_portal_links TO authenticated; GRANT ALL ON public.candidate_portal_links TO service_role;
ALTER TABLE public.candidate_portal_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scoped portal link read" ON public.candidate_portal_links FOR SELECT TO authenticated USING (public.can_read_candidate(candidate_id));
CREATE TABLE public.candidate_activity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), candidate_id uuid NOT NULL REFERENCES public.candidates(id), event text NOT NULL, actor_id uuid REFERENCES public.profiles(id), actor_name text NOT NULL, remarks text, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.candidate_activity TO authenticated; GRANT ALL ON public.candidate_activity TO service_role;
ALTER TABLE public.candidate_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scoped activity read" ON public.candidate_activity FOR SELECT TO authenticated USING (public.can_read_candidate(candidate_id));
CREATE INDEX candidate_created_idx ON public.candidates(created_at DESC);
CREATE INDEX candidate_status_idx ON public.candidates(journey_status);
CREATE INDEX candidate_assignment_user_idx ON public.candidate_assignments(user_id,candidate_id);
CREATE INDEX candidate_activity_idx ON public.candidate_activity(candidate_id,created_at DESC);
CREATE OR REPLACE FUNCTION public.candidate_before_write() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE y integer; n integer; BEGIN
 IF TG_OP='INSERT' THEN y:=extract(year FROM current_timestamp AT TIME ZONE 'Asia/Kolkata'); INSERT INTO public.candidate_year_counters(year,last_number) VALUES(y,1) ON CONFLICT(year) DO UPDATE SET last_number=candidate_year_counters.last_number+1 RETURNING last_number INTO n; NEW.candidate_code:='C361-'||y||'-'||CASE WHEN n<10000 THEN lpad(n::text,4,'0') ELSE n::text END;
 ELSE IF NEW.candidate_code<>OLD.candidate_code THEN RAISE EXCEPTION 'Candidate ID is read-only'; END IF; NEW.updated_at:=now(); END IF;
 IF length(trim(NEW.full_name))=0 OR NEW.personal_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' OR NEW.primary_mobile !~ '^\+?[0-9 ()-]{7,20}$' THEN RAISE EXCEPTION 'Name, valid mobile and email are required'; END IF;
 IF NEW.journey_status='ENROLLED' AND (NEW.enrollment_date IS NULL OR NEW.program_plan IS NULL) THEN RAISE EXCEPTION 'Enrollment date and program plan are required for Enrolled'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER candidate_validate BEFORE INSERT OR UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.candidate_before_write();
CREATE OR REPLACE FUNCTION public.candidate_log(_id uuid,_event text,_remarks text DEFAULT NULL,_metadata jsonb DEFAULT '{}') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE nm text; code text; BEGIN
 SELECT full_name INTO nm FROM public.profiles WHERE id=auth.uid(); SELECT candidate_code INTO code FROM public.candidates WHERE id=_id;
 INSERT INTO public.candidate_activity(candidate_id,event,actor_id,actor_name,remarks,metadata) VALUES(_id,_event,auth.uid(),coalesce(nm,'System'),_remarks,_metadata);
 INSERT INTO public.audit_logs(actor_id,actor_name,action,target_type,target_id,target_label,metadata) VALUES(auth.uid(),coalesce(nm,'System'),_event,'candidate',_id::text,code,_metadata);
 END $$;
REVOKE ALL ON FUNCTION public.candidate_log(uuid,text,text,jsonb) FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.candidate_assert(_id uuid,_permission text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.has_permission(auth.uid(),_permission) OR (_id IS NOT NULL AND NOT public.can_read_candidate(_id)) THEN RAISE EXCEPTION 'You do not have access to this candidate or action'; END IF; END $$;
REVOKE ALL ON FUNCTION public.candidate_assert(uuid,text) FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.candidate_set_assignment(_id uuid,_type text,_user uuid,_remarks text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE old_user uuid; BEGIN
 PERFORM public.candidate_assert(_id,'candidates.assign'); PERFORM 1 FROM public.candidates WHERE id=_id FOR UPDATE;
 IF _type NOT IN ('career_consultant','technical_reviewer','placement_executive') THEN RAISE EXCEPTION 'Invalid assignment type'; END IF;
 IF _user IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles p JOIN public.user_roles ur ON ur.user_id=p.id JOIN public.roles r ON r.id=ur.role_id WHERE p.id=_user AND p.status='ACTIVE' AND r.is_active AND r.is_staff AND r.key=_type) THEN RAISE EXCEPTION 'Choose an active staff user with the matching role'; END IF;
 SELECT user_id INTO old_user FROM public.candidate_assignments WHERE candidate_id=_id AND assignment_type=_type;
 IF old_user IS NOT DISTINCT FROM _user THEN RETURN; END IF;
 INSERT INTO public.candidate_assignments(candidate_id,assignment_type,user_id,created_by,updated_by) VALUES(_id,_type,_user,auth.uid(),auth.uid()) ON CONFLICT(candidate_id,assignment_type) DO UPDATE SET user_id=excluded.user_id,updated_by=auth.uid(),updated_at=now();
 INSERT INTO public.candidate_assignment_history(candidate_id,assignment_type,previous_user,new_user,changed_by,remarks) VALUES(_id,_type,old_user,_user,auth.uid(),_remarks);
 PERFORM public.candidate_log(_id,initcap(replace(_type,'_',' '))||' Assigned',_remarks,jsonb_build_object('assignment_type',_type,'previous_user',old_user,'new_user',_user)); END $$;
REVOKE ALL ON FUNCTION public.candidate_set_assignment(uuid,text,uuid,text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.candidate_set_assignment(uuid,text,uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.candidate_change_status(_id uuid,_status text,_remarks text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE old_status text; BEGIN
 PERFORM public.candidate_assert(_id,'candidates.status'); SELECT journey_status INTO old_status FROM public.candidates WHERE id=_id FOR UPDATE;
 IF old_status=_status THEN RETURN; END IF;
 UPDATE public.candidates SET journey_status=_status,updated_by=auth.uid() WHERE id=_id;
 INSERT INTO public.candidate_status_history(candidate_id,old_status,new_status,changed_by,remarks) VALUES(_id,old_status,_status,auth.uid(),_remarks);
 PERFORM public.candidate_log(_id,'Status Changed',_remarks,jsonb_build_object('old_status',old_status,'new_status',_status)); END $$;
REVOKE ALL ON FUNCTION public.candidate_change_status(uuid,text,text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.candidate_change_status(uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.candidate_portal_summary() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT jsonb_build_object('full_name',c.full_name,'candidate_code',c.candidate_code,'program_plan',c.program_plan,'journey_status',c.journey_status) FROM public.candidate_portal_links l JOIN public.candidates c ON c.id=l.candidate_id JOIN public.user_roles ur ON ur.user_id=l.user_id JOIN public.roles r ON r.id=ur.role_id WHERE l.user_id=auth.uid() AND l.disabled_at IS NULL AND c.portal_status='ACTIVE' AND r.key='candidate' AND r.is_active AND public.is_active_user(auth.uid()) AND public.has_permission(auth.uid(),'candidate.self.view') $$;
REVOKE ALL ON FUNCTION public.candidate_portal_summary() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.candidate_portal_summary() TO authenticated;