-- Staff sign-in: branch-scoped read staff/schedules + update attendance times.

CREATE POLICY "Branch select staff roster" ON staff
  FOR SELECT USING (
    auth.role() = 'authenticated' AND public.can_access_branch(branch_id)
  );

CREATE POLICY "Branch select schedules" ON schedules
  FOR SELECT USING (
    auth.role() = 'authenticated' AND public.can_access_branch(branch_id)
  );

CREATE POLICY "Branch update schedule attendance" ON schedules
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND public.can_access_branch(branch_id)
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND public.can_access_branch(branch_id)
  );
