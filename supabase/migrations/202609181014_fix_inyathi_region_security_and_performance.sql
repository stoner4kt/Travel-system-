-- INYATHI fleet bug/security/performance fixes
-- Applied to Supabase project ToursystemV4 (kuntgxskgdcmexrofuxa).

ALTER TABLE public.rental_clients
  ADD COLUMN IF NOT EXISTS profile_type text
  CHECK (profile_type IN ('self_drive', 'external_driver'));

ALTER TABLE public.traffic_fines
  ALTER COLUMN booking_id DROP NOT NULL;

DROP POLICY IF EXISTS "system_config_admin_read" ON public.system_config;
DROP POLICY IF EXISTS "system_config_admin_write" ON public.system_config;
CREATE POLICY "system_config_admin_read" ON public.system_config
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
  ));
CREATE POLICY "system_config_admin_write" ON public.system_config
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
  ));

ALTER TABLE public.driver_invites DROP CONSTRAINT IF EXISTS driver_invites_email_key;
DROP INDEX IF EXISTS public.idx_incidents_driver;
DROP INDEX IF EXISTS public.idx_incidents_vehicle;
DROP INDEX IF EXISTS public.idx_bookings_vehicle_rental_period_gist;

CREATE INDEX IF NOT EXISTS idx_driver_invites_invited_by ON public.driver_invites (invited_by);
CREATE INDEX IF NOT EXISTS idx_bookings_completed_by ON public.bookings (completed_by);
CREATE INDEX IF NOT EXISTS idx_bookings_rental_client_id ON public.bookings (rental_client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pre_trip ON public.bookings (pre_trip_inspection_id);
CREATE INDEX IF NOT EXISTS idx_bookings_post_trip ON public.bookings (post_trip_inspection_id);
CREATE INDEX IF NOT EXISTS idx_bookings_itinerary_by ON public.bookings (itinerary_uploaded_by);
CREATE INDEX IF NOT EXISTS idx_bookings_last_modified_by ON public.bookings (last_modified_by);
CREATE INDEX IF NOT EXISTS idx_rented_vehicles_booking ON public.rented_vehicles (assigned_booking_id);
CREATE INDEX IF NOT EXISTS idx_rented_vehicles_driver ON public.rented_vehicles (assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_recon_sheets_reviewed_by ON public.recon_sheets (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_recon_sheets_approved_by ON public.recon_sheets (edit_request_approved_by);
CREATE INDEX IF NOT EXISTS idx_expenses_logged_by ON public.vehicle_expenses (logged_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_expenses_reviewed_by ON public.vehicle_expenses (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_rental_insp_logged_by ON public.rental_inspections (logged_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_rental_insp_client ON public.rental_inspections (rental_client_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_driver ON public.vehicles (assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_fines_logged_by ON public.traffic_fines (logged_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_transfer_recon_reviewed_by ON public.transfer_recon_sheets (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_transfer_recon_approved_by ON public.transfer_recon_sheets (edit_request_approved_by);
CREATE INDEX IF NOT EXISTS idx_delete_req_reviewed_by ON public.booking_delete_requests (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_incidents_reviewed_by ON public.incident_reports (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_recon_log_admin_id ON public.recon_edit_log (admin_id);

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.hash_otp_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.next_invoice_no() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lookup_driver_by_fine_time(text, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.next_invoice_no() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_driver_by_fine_time(text, timestamptz) TO authenticated;

-- Preserve the existing policy names and access behavior while making auth.uid()
-- initplan-friendly. Existing already-optimized policies are intentionally left intact.
DROP POLICY IF EXISTS "bookings_driver_read_own" ON public.bookings;
CREATE POLICY "bookings_driver_read_own" ON public.bookings FOR SELECT TO public
  USING (assigned_driver_id = (SELECT profiles.driver_id FROM public.profiles WHERE profiles.id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "incident_own_insert" ON public.incident_reports;
CREATE POLICY "incident_own_insert" ON public.incident_reports FOR INSERT TO authenticated
  WITH CHECK (driver_id = (SELECT p.driver_id FROM public.profiles p WHERE p.id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "incident_own_select" ON public.incident_reports;
CREATE POLICY "incident_own_select" ON public.incident_reports FOR SELECT TO authenticated
  USING (driver_id = (SELECT p.driver_id FROM public.profiles p WHERE p.id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "incident_own_update" ON public.incident_reports;
CREATE POLICY "incident_own_update" ON public.incident_reports FOR UPDATE TO authenticated
  USING (driver_id = (SELECT p.driver_id FROM public.profiles p WHERE p.id = (SELECT auth.uid())))
  WITH CHECK (driver_id = (SELECT p.driver_id FROM public.profiles p WHERE p.id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "incidents_driver_insert" ON public.incident_reports;
CREATE POLICY "incidents_driver_insert" ON public.incident_reports FOR INSERT TO public
  WITH CHECK (driver_id = (SELECT profiles.driver_id FROM public.profiles WHERE profiles.id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "incidents_driver_select" ON public.incident_reports;
CREATE POLICY "incidents_driver_select" ON public.incident_reports FOR SELECT TO public
  USING (driver_id = (SELECT profiles.driver_id FROM public.profiles WHERE profiles.id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "inspections_insert" ON public.inspections;
CREATE POLICY "inspections_insert" ON public.inspections FOR INSERT TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
DROP POLICY IF EXISTS "inspections_own" ON public.inspections;
CREATE POLICY "inspections_own" ON public.inspections FOR SELECT TO public
  USING (driver_id = (SELECT profiles.driver_id FROM public.profiles WHERE profiles.id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "otp_admin_only" ON public.otp_verifications;
CREATE POLICY "otp_admin_only" ON public.otp_verifications FOR ALL TO public
  USING ((admin_id = (SELECT auth.uid())) OR is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "recon_log_driver" ON public.recon_edit_log;
CREATE POLICY "recon_log_driver" ON public.recon_edit_log FOR SELECT TO public
  USING (
    driver_id = (SELECT profiles.driver_id FROM public.profiles WHERE profiles.id = (SELECT auth.uid()))
    OR is_admin()
  );

DROP POLICY IF EXISTS "recon_own_insert" ON public.recon_sheets;
CREATE POLICY "recon_own_insert" ON public.recon_sheets FOR INSERT TO public
  WITH CHECK (driver_id = (SELECT profiles.driver_id FROM public.profiles WHERE profiles.id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "recon_own_select" ON public.recon_sheets;
CREATE POLICY "recon_own_select" ON public.recon_sheets FOR SELECT TO public
  USING (driver_id = (SELECT profiles.driver_id FROM public.profiles WHERE profiles.id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "recon_own_update" ON public.recon_sheets;
CREATE POLICY "recon_own_update" ON public.recon_sheets FOR UPDATE TO public
  USING (driver_id = (SELECT profiles.driver_id FROM public.profiles WHERE profiles.id = (SELECT auth.uid())))
  WITH CHECK (driver_id = (SELECT profiles.driver_id FROM public.profiles WHERE profiles.id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "traffic_fines_driver_select" ON public.traffic_fines;
CREATE POLICY "traffic_fines_driver_select" ON public.traffic_fines FOR SELECT TO public
  USING (driver_id = (SELECT profiles.driver_id FROM public.profiles WHERE profiles.id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "transfer_recon_own_insert" ON public.transfer_recon_sheets;
CREATE POLICY "transfer_recon_own_insert" ON public.transfer_recon_sheets FOR INSERT TO public
  WITH CHECK (driver_id = (SELECT profiles.driver_id FROM public.profiles WHERE profiles.id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "transfer_recon_own_select" ON public.transfer_recon_sheets;
CREATE POLICY "transfer_recon_own_select" ON public.transfer_recon_sheets FOR SELECT TO public
  USING (driver_id = (SELECT profiles.driver_id FROM public.profiles WHERE profiles.id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "transfer_recon_own_update" ON public.transfer_recon_sheets;
CREATE POLICY "transfer_recon_own_update" ON public.transfer_recon_sheets FOR UPDATE TO public
  USING (driver_id = (SELECT profiles.driver_id FROM public.profiles WHERE profiles.id = (SELECT auth.uid())))
  WITH CHECK (driver_id = (SELECT profiles.driver_id FROM public.profiles WHERE profiles.id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "expenses_driver_insert" ON public.vehicle_expenses;
CREATE POLICY "expenses_driver_insert" ON public.vehicle_expenses FOR INSERT TO public
  WITH CHECK (driver_id = (SELECT profiles.driver_id FROM public.profiles WHERE profiles.id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "expenses_driver_select" ON public.vehicle_expenses;
CREATE POLICY "expenses_driver_select" ON public.vehicle_expenses FOR SELECT TO public
  USING (driver_id = (SELECT profiles.driver_id FROM public.profiles WHERE profiles.id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "checklist_own_insert" ON public.vehicle_checklists;
CREATE POLICY "checklist_own_insert" ON public.vehicle_checklists FOR INSERT TO authenticated
  WITH CHECK (driver_id = (SELECT p.driver_id FROM public.profiles p WHERE p.id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "checklist_own_select" ON public.vehicle_checklists;
CREATE POLICY "checklist_own_select" ON public.vehicle_checklists FOR SELECT TO authenticated
  USING (driver_id = (SELECT p.driver_id FROM public.profiles p WHERE p.id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "checklist_own_update" ON public.vehicle_checklists;
CREATE POLICY "checklist_own_update" ON public.vehicle_checklists FOR UPDATE TO authenticated
  USING (driver_id = (SELECT p.driver_id FROM public.profiles p WHERE p.id = (SELECT auth.uid())))
  WITH CHECK (driver_id = (SELECT p.driver_id FROM public.profiles p WHERE p.id = (SELECT auth.uid())));
