# Nightingale n8n Analytics Logging

Three Code nodes are added to the live workflow `i7S75JYcCEU6Y6WE`. They fire as **parallel dead-end branches** — they never block the main conversation flow. If Supabase is down, the bot keeps working.

---

## Node 1 — Log User Message

**Position in workflow:** Parallel branch from `Extract Meta Message` (fires at the same time as PracticeQ Lookup, does not delay it)

**What it does:**
- SHA-256 hashes the phone number → `session_key` (never stores raw numbers)
- Checks if this user has any prior sessions → sets `is_new_user`
- Looks for an active session from the last 2 hours — if found, reuses it; if not, creates a new one
- Inserts a `messages` row with `role='user'` and estimated token count

**Code Node JSON (copy into n8n):**
```json
{
  "parameters": {
    "jsCode": "const SUPABASE_URL = 'https://ligbylkzbgdptphtklsv.supabase.co';\nconst SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpZ2J5bGt6YmdkcHRwaHRrbHN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjk4NTMsImV4cCI6MjA5NDcwNTg1M30.dR62zHyYE19tEJyFKhi8Chc94_Hn5wbTKn-8MUl1kTo';\nconst { phoneNumber, messageText } = $input.first().json;\nif (!phoneNumber) return [{ json: { logged: false } }];\nconst crypto = require('crypto');\nconst sessionKey = crypto.createHash('sha256').update(String(phoneNumber)).digest('hex');\nconst now = new Date().toISOString();\nconst twoHoursAgo = new Date(Date.now() - 2*60*60*1000).toISOString();\nconst H = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' };\ntry {\n  const priorRes = await fetch(`${SUPABASE_URL}/rest/v1/sessions?session_key=eq.${sessionKey}&limit=1&select=id`, { headers: H });\n  const prior = await priorRes.json();\n  const isNewUser = Array.isArray(prior) && prior.length === 0;\n  const activeRes = await fetch(`${SUPABASE_URL}/rest/v1/sessions?session_key=eq.${sessionKey}&started_at=gt.${twoHoursAgo}&order=started_at.desc&limit=1&select=id`, { headers: H });\n  const active = await activeRes.json();\n  let sessionId;\n  if (Array.isArray(active) && active.length > 0) {\n    sessionId = active[0].id;\n  } else {\n    const ins = await fetch(`${SUPABASE_URL}/rest/v1/sessions`, { method: 'POST', headers: { ...H, 'Prefer': 'return=representation' }, body: JSON.stringify({ session_key: sessionKey, started_at: now, is_new_user: isNewUser, message_count: 0 }) });\n    const inserted = await ins.json();\n    sessionId = Array.isArray(inserted) && inserted[0] ? inserted[0].id : null;\n  }\n  if (sessionId) {\n    const chars = String(messageText || '').length;\n    await fetch(`${SUPABASE_URL}/rest/v1/messages`, { method: 'POST', headers: H, body: JSON.stringify({ session_id: sessionId, role: 'user', tokens_used: Math.floor(chars / 4), sent_at: now, model: 'claude-sonnet-4-6' }) });\n  }\n} catch(e) { /* silent fail — never block main flow */ }\nreturn [{ json: { logged: true } }];"
  },
  "name": "Log User Message",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2
}
```

**Connection to add:**  
`Extract Meta Message → Log User Message` (in parallel with existing `Extract Meta Message → PracticeQ Lookup`)

---

## Node 2 — Log Bot Response

**Position in workflow:** Parallel branch from `Parse Agent Output` (fires at the same time as Send WhatsApp Reply)

**What it does:**
- Re-derives `session_key` from the phone number (stored by Extract Meta Message)
- Finds the active session from the last 2 hours
- Inserts a `messages` row with `role='bot'`
- Updates session `message_count` and `ended_at`

**Code Node JSON (copy into n8n):**
```json
{
  "parameters": {
    "jsCode": "const SUPABASE_URL = 'https://ligbylkzbgdptphtklsv.supabase.co';\nconst SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpZ2J5bGt6YmdkcHRwaHRrbHN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjk4NTMsImV4cCI6MjA5NDcwNTg1M30.dR62zHyYE19tEJyFKhi8Chc94_Hn5wbTKn-8MUl1kTo';\nconst phoneNumber = $('Extract Meta Message').first().json.phoneNumber;\nconst botMessage = $input.first().json.message || '';\nif (!phoneNumber) return [{ json: { logged: false } }];\nconst crypto = require('crypto');\nconst sessionKey = crypto.createHash('sha256').update(String(phoneNumber)).digest('hex');\nconst now = new Date().toISOString();\nconst twoHoursAgo = new Date(Date.now() - 2*60*60*1000).toISOString();\nconst H = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' };\ntry {\n  const activeRes = await fetch(`${SUPABASE_URL}/rest/v1/sessions?session_key=eq.${sessionKey}&started_at=gt.${twoHoursAgo}&order=started_at.desc&limit=1&select=id,message_count`, { headers: H });\n  const active = await activeRes.json();\n  if (Array.isArray(active) && active.length > 0) {\n    const { id: sessionId, message_count } = active[0];\n    const chars = String(botMessage).length;\n    const outputTokens = Math.floor(chars / 4);\n    await fetch(`${SUPABASE_URL}/rest/v1/messages`, { method: 'POST', headers: H, body: JSON.stringify({ session_id: sessionId, role: 'bot', tokens_used: outputTokens + Math.floor(outputTokens * 3), sent_at: now, model: 'claude-sonnet-4-6' }) });\n    await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}`, { method: 'PATCH', headers: H, body: JSON.stringify({ message_count: (message_count || 0) + 2, ended_at: now }) });\n  }\n} catch(e) { /* silent fail */ }\nreturn [{ json: { logged: true } }];"
  },
  "name": "Log Bot Response",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2
}
```

**Connection to add:**  
`Parse Agent Output → Log Bot Response` (in parallel with existing `Parse Agent Output → Send WhatsApp Reply`)

---

## Node 3 — Log Escalation

**Position in workflow:** Parallel branch from `Escalate?` true output (fires at the same time as Build Crisis Body)

**What it does:**
- Finds the active session
- Sets `escalated = true` and `ended_at = now()`

**Code Node JSON (copy into n8n):**
```json
{
  "parameters": {
    "jsCode": "const SUPABASE_URL = 'https://ligbylkzbgdptphtklsv.supabase.co';\nconst SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpZ2J5bGt6YmdkcHRwaHRrbHN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjk4NTMsImV4cCI6MjA5NDcwNTg1M30.dR62zHyYE19tEJyFKhi8Chc94_Hn5wbTKn-8MUl1kTo';\nconst phoneNumber = $('Extract Meta Message').first().json.phoneNumber;\nif (!phoneNumber) return [{ json: { logged: false } }];\nconst crypto = require('crypto');\nconst sessionKey = crypto.createHash('sha256').update(String(phoneNumber)).digest('hex');\nconst twoHoursAgo = new Date(Date.now() - 2*60*60*1000).toISOString();\nconst now = new Date().toISOString();\nconst H = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' };\ntry {\n  const activeRes = await fetch(`${SUPABASE_URL}/rest/v1/sessions?session_key=eq.${sessionKey}&started_at=gt.${twoHoursAgo}&order=started_at.desc&limit=1&select=id`, { headers: H });\n  const active = await activeRes.json();\n  if (Array.isArray(active) && active.length > 0) {\n    const sessionId = active[0].id;\n    await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}`, { method: 'PATCH', headers: H, body: JSON.stringify({ escalated: true, ended_at: now }) });\n  }\n} catch(e) {}\nreturn [{ json: { logged: true } }];"
  },
  "name": "Log Escalation",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2
}
```

**Connection to add:**  
`Escalate? (true output) → Log Escalation` (in parallel with existing `Escalate? → Build Crisis Body`)

---

## Daily Stats Rollup (n8n Schedule Trigger)

Create a **separate** new workflow that runs at **23:59 SGT (15:59 UTC)** daily:

```
Schedule Trigger (daily 15:59 UTC)
  → Code Node: Aggregate today's data from sessions + messages tables
  → HTTP Request: Upsert into daily_stats
  → HTTP Request: Upsert into api_costs
```

### Code Node: Calculate Daily Stats

```javascript
const SUPABASE_URL = 'https://ligbylkzbgdptphtklsv.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY';
const today = new Date().toISOString().slice(0, 10);
const H = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' };

// Fetch today's sessions
const sessRes = await fetch(`${SUPABASE_URL}/rest/v1/sessions?started_at=gte.${today}T00:00:00Z&select=*`, { headers: H });
const sessions = await sessRes.json();

// Fetch today's messages
const msgRes = await fetch(`${SUPABASE_URL}/rest/v1/messages?sent_at=gte.${today}T00:00:00Z&select=*`, { headers: H });
const messages = await msgRes.json();

const totalSessions = sessions.length;
const newUsers      = sessions.filter(s => s.is_new_user).length;
const escalations   = sessions.filter(s => s.escalated).length;
const totalMessages = messages.length;
const totalTokens   = messages.reduce((s, m) => s + (m.tokens_used || 0), 0);
const inputTokens   = Math.round(totalTokens * 0.6);
const outputTokens  = Math.round(totalTokens * 0.4);
const costUsd       = (inputTokens / 1_000_000 * 3) + (outputTokens / 1_000_000 * 15);

// Avg duration from sessions with both started_at and ended_at
const durSessions = sessions.filter(s => s.started_at && s.ended_at);
const avgDur = durSessions.length
  ? Math.round(durSessions.reduce((s, sess) => s + (new Date(sess.ended_at) - new Date(sess.started_at)) / 1000, 0) / durSessions.length)
  : 0;

return [{
  json: {
    today,
    totalSessions,
    newUsers,
    returningUsers: totalSessions - newUsers,
    totalMessages,
    escalations,
    avgDur,
    totalTokens,
    inputTokens,
    outputTokens,
    costUsd,
  }
}];
```

### HTTP Request: Upsert daily_stats

```
Method: POST
URL: https://ligbylkzbgdptphtklsv.supabase.co/rest/v1/daily_stats
Headers:
  apikey: YOUR_ANON_KEY
  Authorization: Bearer YOUR_ANON_KEY
  Content-Type: application/json
  Prefer: resolution=merge-duplicates
Body (JSON):
{
  "date": "{{ $json.today }}",
  "total_sessions": "{{ $json.totalSessions }}",
  "new_users": "{{ $json.newUsers }}",
  "returning_users": "{{ $json.returningUsers }}",
  "total_messages": "{{ $json.totalMessages }}",
  "escalations": "{{ $json.escalations }}",
  "avg_session_duration_seconds": "{{ $json.avgDur }}",
  "total_cost_usd": "{{ $json.costUsd }}"
}
```

### HTTP Request: Upsert api_costs

```
Method: POST
URL: https://ligbylkzbgdptphtklsv.supabase.co/rest/v1/api_costs
Headers: same as above
Prefer: resolution=merge-duplicates
Body:
{
  "date": "{{ $json.today }}",
  "total_tokens": "{{ $json.totalTokens }}",
  "input_tokens": "{{ $json.inputTokens }}",
  "output_tokens": "{{ $json.outputTokens }}",
  "cost_usd": "{{ $json.costUsd }}",
  "model": "claude-sonnet-4-6"
}
```

---

## SHA-256 Phone Hashing

The hashing is done inside each Code node using Node.js built-in crypto:

```javascript
const crypto = require('crypto');
const sessionKey = crypto.createHash('sha256').update(String(phoneNumber)).digest('hex');
// e.g. "+6591234567" → "a3f8c9b2d4e1..."
```

This means the dashboard never sees raw phone numbers — only the hash. If the clinical team needs to look up a specific user, they hash the phone number locally and search by session_key.

---

## Privacy Notes

- `session_key` = SHA-256 hash of phone number — one-way, not reversible
- Raw phone numbers NEVER enter the `sessions` or `messages` tables
- The existing `conversations` table in Supabase does store raw phone numbers in `session_id` — that's a pre-existing field used by n8n's Postgres chat history node
- Dashboard always shows "User 1", "User 2" etc — never raw numbers
