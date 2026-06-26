-- Migration 003: Pomodoro sessions
-- Run this in Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id         uuid        REFERENCES habits(id) ON DELETE SET NULL,
  duration_minutes integer     NOT NULL,
  session_type     text        NOT NULL CHECK (session_type IN ('focus', 'short-break', 'long-break')),
  completed        boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Index for fast per-user queries filtered by date
CREATE INDEX IF NOT EXISTS pomodoro_sessions_user_created
  ON pomodoro_sessions (user_id, created_at DESC);

-- Row-Level Security: each user only sees their own sessions
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own sessions"
  ON pomodoro_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON pomodoro_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON pomodoro_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON pomodoro_sessions
  FOR DELETE
  USING (auth.uid() = user_id);
