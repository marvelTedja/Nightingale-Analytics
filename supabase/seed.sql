-- ============================================================
-- Nightingale Analytics Seed Data — 90 days of realistic growth
-- Run AFTER 002_new_tables.sql
-- ============================================================

DO $$
DECLARE
  day_idx   INTEGER;
  day_date  DATE;
  n_sess    INTEGER;
  n_new     INTEGER;
  n_msg     INTEGER;
  n_esc     INTEGER;
  n_dur     INTEGER;
  n_cost    NUMERIC;
BEGIN
  FOR day_idx IN 0..89 LOOP
    day_date := CURRENT_DATE - (89 - day_idx) * INTERVAL '1 day';

    -- Grow from ~40 to ~75 sessions/day over 90 days with noise
    n_sess := GREATEST(5, 40 + ROUND(35.0 * day_idx / 89 + (RANDOM() - 0.5) * 12)::INTEGER);

    -- 15-25% new users, tapering slightly as base grows
    n_new  := GREATEST(1, ROUND(n_sess * (0.25 - 0.08 * day_idx / 89 + RANDOM() * 0.08))::INTEGER);

    -- ~4-7 messages per session
    n_msg  := n_sess * (4 + ROUND(RANDOM() * 3)::INTEGER);

    -- 3-5% escalation rate
    n_esc  := GREATEST(0, ROUND(n_sess * (0.03 + RANDOM() * 0.02))::INTEGER);

    -- Avg session duration 5-15 min
    n_dur  := 300 + ROUND(RANDOM() * 600)::INTEGER;

    -- Cost $2-6/day growing over time (SGD × 1.35 done in app)
    n_cost := 2.0 + 4.0 * day_idx / 89 + (RANDOM() - 0.3) * 0.8;
    n_cost := GREATEST(1.5, n_cost);

    INSERT INTO daily_stats (
      date, total_sessions, new_users, returning_users,
      total_messages, escalations, avg_session_duration_seconds, total_cost_usd
    ) VALUES (
      day_date, n_sess, n_new, n_sess - n_new,
      n_msg, n_esc, n_dur, ROUND(n_cost::NUMERIC, 4)
    )
    ON CONFLICT (date) DO NOTHING;
  END LOOP;
END $$;

-- api_costs: derived from daily_stats
-- Cost formula: input=$3/1M, output=$15/1M, avg 60% input / 40% output
-- Total cost C = T/1M * (0.6*3 + 0.4*15) = T/1M * 7.8 → T = C * 1M / 7.8
INSERT INTO api_costs (date, total_tokens, input_tokens, output_tokens, cost_usd, model)
SELECT
  ds.date,
  ROUND((ds.total_cost_usd * 1000000.0 / 7.8))::INTEGER     AS total_tokens,
  ROUND((ds.total_cost_usd * 1000000.0 / 7.8 * 0.6))::INTEGER AS input_tokens,
  ROUND((ds.total_cost_usd * 1000000.0 / 7.8 * 0.4))::INTEGER AS output_tokens,
  ROUND(ds.total_cost_usd::NUMERIC, 6)                       AS cost_usd,
  'claude-sonnet-4-6'
FROM daily_stats ds
ON CONFLICT (date) DO NOTHING;
