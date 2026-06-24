-- Migration 002: Add per-user authentication
-- Run this in the Supabase SQL editor AFTER 001_initial.sql.
--
-- Tip: If you want to skip email confirmation during development,
-- go to Authentication → Providers → Email in your Supabase dashboard
-- and disable "Confirm email".

-- -------------------------------------------------------
-- 1. Add user_id columns
-- -------------------------------------------------------
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE daily_completions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- -------------------------------------------------------
-- 2. Remove any anonymous rows created before auth was added
-- -------------------------------------------------------
DELETE FROM daily_completions WHERE user_id IS NULL;
DELETE FROM habits            WHERE user_id IS NULL;

-- -------------------------------------------------------
-- 3. Enforce NOT NULL going forward
-- -------------------------------------------------------
ALTER TABLE habits            ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE daily_completions ALTER COLUMN user_id SET NOT NULL;

-- -------------------------------------------------------
-- 4. Drop the old open-access policies
-- -------------------------------------------------------
DROP POLICY IF EXISTS "allow_all_habits"       ON habits;
DROP POLICY IF EXISTS "allow_all_completions"  ON daily_completions;

-- -------------------------------------------------------
-- 5. New per-user RLS policies (authenticated only)
-- -------------------------------------------------------
CREATE POLICY "users_own_habits" ON habits
  FOR ALL TO authenticated
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_own_completions" ON daily_completions
  FOR ALL TO authenticated
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -------------------------------------------------------
-- 6. Performance indexes
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_habits_user_id       ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_user_id  ON daily_completions(user_id);
