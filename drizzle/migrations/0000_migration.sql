
-- ===== Enums =====
CREATE TYPE public.user_status AS ENUM ('ACTIVE','INACTIVE','SUSPENDED');

-- ===== Roles =====
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  is_staff boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read roles" ON public.roles FOR SELECT TO authenticated USING (true);

-- ===== Permissions =====
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  module text NOT NULL,
  label text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read permissions" ON public.permissions FOR SELECT TO authenticated USING (true);

-- ===== Role permissions =====
CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read role permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- ===== Profiles =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  user_code text NOT NULL,
  email text NOT NULL,
  mobile text,
  status public.user_status NOT NULL DEFAULT 'ACTIVE',
  last_login_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_email_unique ON public.profiles (lower(email));
CREATE UNIQUE INDEX profiles_user_code_unique ON public.profiles (lower(user_code));
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== User roles (one role per user) =====
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ===== Audit logs (append-only) =====
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_name text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  target_label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_created_idx ON public.audit_logs (created_at DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ===== App settings =====
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  label text NOT NULL,
  value text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 100,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);

-- ===== Authorization functions =====
CREATE OR REPLACE FUNCTION public.is_active_user(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND status = 'ACTIVE')
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_uid uuid, _key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_active_user(_uid) AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id AND r.is_active
    WHERE ur.user_id = _uid
      AND (
        r.key = 'super_admin'
        OR EXISTS (
          SELECT 1 FROM public.role_permissions rp
          JOIN public.permissions p ON p.id = rp.permission_id
          WHERE rp.role_id = r.id AND p.key = _key
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.current_user_context()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'user_code', p.user_code,
    'email', p.email,
    'status', p.status,
    'role_key', r.key,
    'role_name', r.name,
    'is_staff', COALESCE(r.is_staff, false),
    'permissions', CASE
      WHEN p.status <> 'ACTIVE' OR r.id IS NULL OR NOT r.is_active THEN '[]'::jsonb
      WHEN r.key = 'super_admin' THEN (SELECT COALESCE(jsonb_agg(key), '[]'::jsonb) FROM public.permissions)
      ELSE (SELECT COALESCE(jsonb_agg(pm.key), '[]'::jsonb)
            FROM public.role_permissions rp JOIN public.permissions pm ON pm.id = rp.permission_id
            WHERE rp.role_id = r.id)
    END
  )
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  LEFT JOIN public.roles r ON r.id = ur.role_id
  WHERE p.id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.record_login()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET last_login_at = now() WHERE id = auth.uid() AND status = 'ACTIVE'
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_context() FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_login() FROM anon;

-- ===== Policies using permissions =====
CREATE POLICY "Own profile or users.view" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_permission(auth.uid(), 'users.view'));
CREATE POLICY "Own role or users.view" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'users.view'));
CREATE POLICY "audit.view can read audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'audit.view'));

-- ===== updated_at triggers =====
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER t_roles_updated BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_user_roles_updated BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== Seed: roles =====
INSERT INTO public.roles (key, name, description, is_system, is_staff, sort_order) VALUES
 ('super_admin','Super Admin','Full system access, including users, roles and permissions.',true,true,1),
 ('director','Director','Broad read access across the system.',true,true,2),
 ('operations_manager','Operations Manager','Operational oversight of candidates, PCB, roadmaps, reviews and reports.',true,true,3),
 ('career_consultant','Career Consultant','Works with assigned candidates, assessments, PCB and roadmaps.',true,true,4),
 ('technical_reviewer','Technical Reviewer','Reviews assigned projects and premium tasks.',true,true,5),
 ('placement_executive','Placement Executive','Handles candidate placement, resumes and opportunities.',true,true,6),
 ('accounts','Accounts','Handles candidate commercials and finance.',true,true,7),
 ('candidate','Candidate','Enrolled candidate. Access to own portal and data only.',true,false,8);

-- ===== Seed: permissions =====
INSERT INTO public.permissions (key, module, label, sort_order) VALUES
 ('dashboard.view','Dashboard','View dashboard',10),
 ('users.view','Users','View users',20),
 ('users.create','Users','Create users',21),
 ('users.edit','Users','Edit users',22),
 ('users.status','Users','Change user status',23),
 ('roles.view','Roles','View roles',30),
 ('roles.create','Roles','Create roles',31),
 ('roles.edit','Roles','Edit roles',32),
 ('roles.permissions','Roles','Manage permissions',33),
 ('audit.view','Audit','View audit log',40),
 ('settings.view','Settings','View settings',50),
 ('settings.edit','Settings','Edit settings',51),
 ('candidate.self.view','Candidate Portal','Access own candidate portal',60),
 ('candidates.view','Candidates (future)','View candidates',100),
 ('pcb.view','PCB Studio (future)','View PCB Studio',110),
 ('delivery.view','Delivery (future)','View delivery',120),
 ('placement.view','Placement (future)','View placement',130),
 ('documents.view','Documents (future)','View documents',140),
 ('finance.view','Finance (future)','View finance',150),
 ('reports.view','Reports (future)','View reports',160);

-- ===== Seed: default assignments =====
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON (
  (r.key = 'director' AND p.key IN ('dashboard.view','candidates.view','pcb.view','delivery.view','placement.view','documents.view','finance.view','reports.view'))
  OR (r.key = 'operations_manager' AND p.key IN ('dashboard.view','candidates.view','pcb.view','delivery.view','reports.view'))
  OR (r.key = 'career_consultant' AND p.key IN ('dashboard.view','candidates.view','pcb.view','delivery.view'))
  OR (r.key = 'technical_reviewer' AND p.key IN ('dashboard.view','delivery.view'))
  OR (r.key = 'placement_executive' AND p.key IN ('dashboard.view','candidates.view','placement.view','documents.view'))
  OR (r.key = 'accounts' AND p.key IN ('dashboard.view','finance.view'))
  OR (r.key = 'candidate' AND p.key IN ('candidate.self.view'))
);

-- ===== Seed: settings =====
INSERT INTO public.app_settings (key, label, value, sort_order) VALUES
 ('organization_name','Organization Name','Coding361',1),
 ('application_name','Application Name','CareerOS',2),
 ('application_subtitle','Application Subtitle','Career Journey Management Platform',3);
