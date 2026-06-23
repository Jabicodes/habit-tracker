-- Habit Tracker — initial schema
-- Run this in the Supabase SQL editor.

-- -------------------------------------------------------
-- habits
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS habits (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  description  TEXT,
  order_index  INTEGER     NOT NULL DEFAULT 0,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------
-- daily_completions  (one row per habit per calendar day)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_completions (
  id             UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id       UUID  NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  completed_date DATE  NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, completed_date)
);

CREATE INDEX IF NOT EXISTS idx_completions_date    ON daily_completions(completed_date);
CREATE INDEX IF NOT EXISTS idx_completions_habit   ON daily_completions(habit_id);

-- -------------------------------------------------------
-- Row-Level Security (open — single-user personal app)
-- Tighten these policies if you add auth later.
-- -------------------------------------------------------
ALTER TABLE habits            ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_habits" ON habits
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_completions" ON daily_completions
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
