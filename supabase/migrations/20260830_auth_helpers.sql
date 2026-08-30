-- Run first in Supabase SQL Editor: role/branch helpers used by RLS and RPCs

CREATE OR REPLACE FUNCTION public.jwt_app_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

CREATE OR REPLACE FUNCTION public.jwt_branch_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(auth.jwt() -> 'app_metadata' ->> 'branch_id', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_like()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.jwt_app_role() IN ('admin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.jwt_app_role() = 'super_admin';
$$;

CREATE OR REPLACE FUNCTION public.can_access_branch(target_branch uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    public.is_admin_like()
    OR (
      public.jwt_app_role() = 'staff'
      AND public.jwt_branch_id() IS NOT NULL
      AND target_branch = public.jwt_branch_id()
    );
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
