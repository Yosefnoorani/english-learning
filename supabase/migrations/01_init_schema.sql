-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM for question types
-- ============================================================
CREATE TYPE question_type AS ENUM (
  'vocabulary',
  'grammar_choice',
  'sentence_builder',
  'placement_test'
);

-- ============================================================
-- TABLE: content_bank
-- Stores all learning content items
-- ============================================================
CREATE TABLE IF NOT EXISTS content_bank (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        question_type NOT NULL,
  difficulty  integer NOT NULL CHECK (difficulty BETWEEN 0 AND 1000),
  data        jsonb NOT NULL,
  tags        text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT NOW()
);

-- GIN indexes for fast JSONB and array searches
CREATE INDEX IF NOT EXISTS idx_content_bank_data   ON content_bank USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_content_bank_tags   ON content_bank USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_content_bank_diff   ON content_bank (difficulty);
CREATE INDEX IF NOT EXISTS idx_content_bank_type   ON content_bank (type);

-- ============================================================
-- TABLE: user_profiles
-- One row per authenticated user
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  user_rating         integer NOT NULL DEFAULT 500,
  current_streak      integer NOT NULL DEFAULT 0,
  daily_streak        integer NOT NULL DEFAULT 0,
  daily_goal_target   integer NOT NULL DEFAULT 10,
  daily_goal_progress integer NOT NULL DEFAULT 0,
  last_active         date,
  created_at          timestamptz NOT NULL DEFAULT NOW(),
  updated_at          timestamptz NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TABLE: user_telemetry
-- Per-user, per-item performance tracking for spaced repetition
-- ============================================================
CREATE TABLE IF NOT EXISTS user_telemetry (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  content_id       uuid NOT NULL REFERENCES content_bank ON DELETE CASCADE,
  is_correct       boolean NOT NULL DEFAULT false,
  fail_count       integer NOT NULL DEFAULT 0,
  last_seen        timestamptz NOT NULL DEFAULT NOW(),
  next_review_due  timestamptz NOT NULL DEFAULT NOW(),
  created_at       timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, content_id)
);

-- Optimized index for spaced repetition queries
CREATE INDEX IF NOT EXISTS idx_telemetry_user_review
  ON user_telemetry (user_id, next_review_due);

CREATE INDEX IF NOT EXISTS idx_telemetry_user_fails
  ON user_telemetry (user_id, fail_count DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- content_bank: publicly readable, only admins write
ALTER TABLE content_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_bank_select_all" ON content_bank
  FOR SELECT USING (true);

-- user_profiles: owner-only
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_profiles_owner_select" ON user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "user_profiles_owner_update" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- user_telemetry: owner-only
ALTER TABLE user_telemetry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_telemetry_owner_select" ON user_telemetry
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_telemetry_owner_insert" ON user_telemetry
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_telemetry_owner_update" ON user_telemetry
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- SPACED REPETITION QUERY (reference)
-- Fetch due review items for the current user, ordered by priority
-- ============================================================
-- SELECT cb.*
-- FROM user_telemetry ut
-- JOIN content_bank cb ON cb.id = ut.content_id
-- WHERE ut.user_id = auth.uid()
--   AND ut.next_review_due <= NOW()
-- ORDER BY ut.fail_count DESC, ut.next_review_due ASC;

-- ============================================================
-- HELPER: upsert telemetry after an answer
-- Implements SM-2-like interval scheduling
-- ============================================================
CREATE OR REPLACE FUNCTION upsert_telemetry(
  p_user_id    uuid,
  p_content_id uuid,
  p_correct    boolean
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_fail_count   integer;
  v_next_review  timestamptz;
BEGIN
  SELECT fail_count INTO v_fail_count
  FROM user_telemetry
  WHERE user_id = p_user_id AND content_id = p_content_id;

  IF p_correct THEN
    v_fail_count := GREATEST(COALESCE(v_fail_count, 0) - 1, 0);
    -- Exponential backoff: 1 day, 3 days, 7 days, 14 days …
    v_next_review := NOW() + INTERVAL '1 day' * POWER(2, GREATEST(3 - v_fail_count, 0));
  ELSE
    v_fail_count := COALESCE(v_fail_count, 0) + 1;
    v_next_review := NOW() + INTERVAL '4 hours'; -- review again soon
  END IF;

  INSERT INTO user_telemetry (user_id, content_id, is_correct, fail_count, last_seen, next_review_due)
  VALUES (p_user_id, p_content_id, p_correct, v_fail_count, NOW(), v_next_review)
  ON CONFLICT (user_id, content_id)
  DO UPDATE SET
    is_correct      = EXCLUDED.is_correct,
    fail_count      = EXCLUDED.fail_count,
    last_seen       = EXCLUDED.last_seen,
    next_review_due = EXCLUDED.next_review_due;
END;
$$;
