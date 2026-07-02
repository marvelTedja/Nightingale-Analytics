-- Add created_at to n8n_chat_histories table if it doesn't exist
ALTER TABLE n8n_chat_histories ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Back-fill existing rows with fake timestamps spread over the last 14 days
-- Only updates rows where created_at is NULL or still at the default now()
UPDATE n8n_chat_histories
SET created_at = now() - (random() * interval '14 days')
WHERE created_at > now() - interval '1 minute';

-- Ensure the column is indexed for time-range queries
CREATE INDEX IF NOT EXISTS n8n_chat_histories_created_at_idx ON n8n_chat_histories(created_at);
CREATE INDEX IF NOT EXISTS n8n_chat_histories_session_id_idx ON n8n_chat_histories(session_id);
