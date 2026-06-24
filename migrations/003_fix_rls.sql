-- ── Fix per-user RLS on habits and daily_completions ──────────────────────────
-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times (all statements are idempotent).

-- 1. Make sure RLS is actually turned on for both tables.
ALTER TABLE habits            ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_completions ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies so we start from a clean slate.
--    This removes both the permissive "allow_all" policies from migration 001
--    and any partial policies from migration 002.
DROP POLICY IF EXISTS "allow_all_habits"      ON habits;
DROP POLICY IF EXISTS "allow_all_completions" ON daily_completions;
DROP POLICY IF EXISTS "users_own_habits"      ON habits;
DROP POLICY IF EXISTS "users_own_completions" ON daily_completions;

-- 3. Create correct per-user policies.
--    authenticated users can only see / modify rows where user_id = their own UID.
CREATE POLICY "users_own_habits" ON habits
  FOR ALL TO authenticated
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_own_completions" ON daily_completions
  FOR ALL TO authenticated
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Verify: should return exactly 2 rows, one per table.
SELECT tablename, policyname, cmd, qual
FROM   pg_policies
WHERE  tablename IN ('habits', 'daily_completions')
ORDER  BY tablename;
