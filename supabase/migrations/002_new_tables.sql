-- ============================================================
-- Nightingale Analytics Tables
-- Run in Supabase SQL Editor → New Query
-- ============================================================

-- sessions: one row per WhatsApp conversation (keyed by hashed phone)
CREATE TABLE IF NOT EXISTS sessions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key    text        NOT NULL,
  started_at     timestamptz NOT NULL DEFAULT now(),
  ended_at       timestamptz,
  message_count  int         DEFAULT 0,
  escalated      boolean     DEFAULT false,
  is_new_user    boolean     DEFAULT false
);
CREATE INDEX IF NOT EXISTS sessions_session_key_idx ON sessions(session_key);
CREATE INDEX IF NOT EXISTS sessions_started_at_idx  ON sessions(started_at);

-- messages: per-message log with token counts for cost tracking
CREATE TABLE IF NOT EXISTS messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        REFERENCES sessions(id) ON DELETE CASCADE,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  role        text        NOT NULL CHECK (role IN ('user', 'bot')),
  tokens_used int         DEFAULT 0,
  model       text        DEFAULT 'claude-sonnet-4-6'
);
CREATE INDEX IF NOT EXISTS messages_session_id_idx ON messages(session_id);
CREATE INDEX IF NOT EXISTS messages_sent_at_idx    ON messages(sent_at);

-- api_costs: daily cost roll-up (upserted by n8n nightly job)
CREATE TABLE IF NOT EXISTS api_costs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date           date        NOT NULL UNIQUE,
  total_tokens   int         DEFAULT 0,
  input_tokens   int         DEFAULT 0,
  output_tokens  int         DEFAULT 0,
  cost_usd       numeric(10,6) DEFAULT 0,
  model          text        DEFAULT 'claude-sonnet-4-6'
);

-- daily_stats: pre-aggregated daily metrics (upserted by n8n nightly job)
CREATE TABLE IF NOT EXISTS daily_stats (
  date                         date PRIMARY KEY,
  total_sessions               int  DEFAULT 0,
  new_users                    int  DEFAULT 0,
  returning_users              int  DEFAULT 0,
  total_messages               int  DEFAULT 0,
  escalations                  int  DEFAULT 0,
  avg_session_duration_seconds int  DEFAULT 0,
  total_cost_usd               numeric(10,6) DEFAULT 0
);

-- ============================================================
-- RLS Policies
-- Dashboard reads with anon key; n8n writes with service role
-- ============================================================

ALTER TABLE sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_costs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- Allow anon key to read all rows (dashboard is internal, not public-facing)
CREATE POLICY "anon_read_sessions"    ON sessions    FOR SELECT USING (true);
CREATE POLICY "anon_read_messages"    ON messages    FOR SELECT USING (true);
CREATE POLICY "anon_read_api_costs"   ON api_costs   FOR SELECT USING (true);
CREATE POLICY "anon_read_daily_stats" ON daily_stats FOR SELECT USING (true);

-- Allow anon to insert/update (n8n uses anon key for Code-node writes via fetch)
CREATE POLICY "anon_write_sessions"    ON sessions    FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_sessions"   ON sessions    FOR UPDATE USING (true);
CREATE POLICY "anon_write_messages"    ON messages    FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_write_api_costs"   ON api_costs   FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_upsert_api_costs"  ON api_costs   FOR UPDATE USING (true);
CREATE POLICY "anon_write_daily_stats" ON daily_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_upsert_daily_stats" ON daily_stats FOR UPDATE USING (true);
