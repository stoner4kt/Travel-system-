-- Restore unique enforcement on driver_invites.email.
-- The previous migration (202609181014) dropped the primary unique constraint
-- (driver_invites_email_key) without adding a replacement. This broke the
-- Supabase upsert used by pushToSupabase (onConflict: 'email') causing it
-- to error and fall back to plain INSERTs, which created duplicate rows.
-- Duplicate rows caused .maybeSingle() in signUpWithInvite to throw, which
-- silently fell back to the default location 'Cape Town' for every new driver
-- regardless of their actual region.

CREATE UNIQUE INDEX IF NOT EXISTS driver_invites_email_unique
  ON public.driver_invites (email);
