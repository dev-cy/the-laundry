-- Allow staff to see/update today's shifts for people assigned to their branch,
-- even when that shift is scheduled at another location (cross-branch duty).

DROP POLICY IF EXISTS "Select schedules for home-branch staff" ON schedules;
CREATE POLICY "Select schedules for home-branch staff" ON schedules
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND staff_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM staff s
      WHERE s.id = schedules.staff_id
        AND public.can_access_branch(s.branch_id)
    )
  );

DROP POLICY IF EXISTS "Update attendance for home-branch staff" ON schedules;
CREATE POLICY "Update attendance for home-branch staff" ON schedules
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND staff_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM staff s
      WHERE s.id = schedules.staff_id
        AND public.can_access_branch(s.branch_id)
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND staff_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM staff s
      WHERE s.id = schedules.staff_id
        AND public.can_access_branch(s.branch_id)
    )
  );
