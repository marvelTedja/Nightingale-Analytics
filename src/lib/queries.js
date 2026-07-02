import { supabase } from './supabase'
import { subDays, startOfDay, getISOWeek, getYear, format, differenceInDays, parseISO } from 'date-fns'

// ─── Helpers ────────────────────────────────────────────────────────────────

function isoStr(daysAgo) {
  return startOfDay(subDays(new Date(), daysAgo)).toISOString()
}

export function changePct(current, previous) {
  if (!previous || previous === 0) return null
  return ((current - previous) / previous) * 100
}

// Claude Sonnet 4.6: $3/1M input + $15/1M output, assume 60/40 split
// Meta WhatsApp (SG, user-initiated): $0.0408 USD/conversation, first 1000/month free
const CLAUDE_COST_PER_CHAR = (3 * 0.6 + 15 * 0.4) / 1_000_000 / 4  // per character
const META_RATE_USD         = 0.0408
const META_FREE_TIER        = 1000
const USD_TO_SGD            = 1.35

// Meta "conversation" = unique user-day (each day a user messages = 1 billed conversation)
function calcMetaCost(userDays, periodDays) {
  // rough monthly projection to subtract free tier
  const monthlyRate     = (userDays / periodDays) * 30
  const billableMonthly = Math.max(0, monthlyRate - META_FREE_TIER)
  const dailyBillable   = (billableMonthly / 30) * periodDays
  return dailyBillable * META_RATE_USD * USD_TO_SGD
}

function calcClaudeCost(rows) {
  const chars = rows.reduce((s, r) => s + (r.message?.content?.length || 0), 0)
  return chars * CLAUDE_COST_PER_CHAR * USD_TO_SGD
}

// ─── Core fetch: all rows for a date range ──────────────────────────────────

async function fetchRows(from, to) {
  let q = supabase.from('n8n_chat_histories').select('session_id, message, created_at').gte('created_at', from)
  if (to) q = q.lt('created_at', to)
  const { data, error } = await q
  if (error) { console.error('fetchRows:', error); return [] }
  return data || []
}

// ─── Derive period metrics from raw rows ─────────────────────────────────────

function deriveMetrics(rows, periodDays) {
  const human     = rows.filter(r => r.message?.type === 'human')
  const users     = new Set(human.map(r => r.session_id))
  const userDays  = new Set(human.map(r => `${r.session_id}::${r.created_at?.slice(0, 10)}`))

  const conversations = human.length           // 1 message = 1 conversation
  const uniqueUsers   = users.size
  const claudeCostSgd = calcClaudeCost(rows)
  const metaCostSgd   = calcMetaCost(userDays.size, periodDays)
  const totalCostSgd  = claudeCostSgd + metaCostSgd
  const costPerUser   = uniqueUsers > 0 ? totalCostSgd / uniqueUsers : 0

  return { conversations, uniqueUsers, claudeCostSgd, metaCostSgd, totalCostSgd, costPerUser, rows, humanRows: human }
}

// ─── Main analytics query: current + previous period ────────────────────────

export async function getAnalytics(days) {
  const now          = new Date()
  const currentFrom  = isoStr(days)
  const previousFrom = isoStr(days * 2)
  const previousTo   = currentFrom

  const [currentRows, previousRows, escalationData] = await Promise.all([
    fetchRows(currentFrom, null),
    fetchRows(previousFrom, previousTo),
    getEscalations(days),
  ])

  const current  = deriveMetrics(currentRows, days)
  const previous = deriveMetrics(previousRows, days)

  return { current, previous, days, escalation: escalationData }
}

// ─── Weekly breakdown for bar chart ─────────────────────────────────────────

export async function getWeeklyBreakdown(days) {
  const rows = await fetchRows(isoStr(days), null)
  const human = rows.filter(r => r.message?.type === 'human')

  const weekMap = {}
  human.forEach(r => {
    if (!r.created_at) return
    const d   = parseISO(r.created_at)
    const key = `${getYear(d)}-W${String(getISOWeek(d)).padStart(2, '0')}`
    if (!weekMap[key]) weekMap[key] = { week: key, conversations: 0, users: new Set() }
    weekMap[key].conversations++
    weekMap[key].users.add(r.session_id)
  })

  return Object.values(weekMap)
    .sort((a, b) => a.week.localeCompare(b.week))
    .map(w => ({
      week:          w.week.replace(/^\d{4}-/, ''),  // "W24"
      conversations: w.conversations,
      users:         w.users.size,
      avgPerUser:    w.users.size > 0 ? +(w.conversations / w.users.size).toFixed(1) : 0,
    }))
}

// ─── Retention Week 1–5 ──────────────────────────────────────────────────────

export async function getRetention() {
  const { data, error } = await supabase
    .from('n8n_chat_histories')
    .select('session_id, created_at')
    .eq('message->>type', 'human')
    .order('created_at', { ascending: true })

  if (error) { console.error('getRetention:', error); return [] }
  const rows = data || []

  // Per user: first message date + all active days
  const userMap = {}
  rows.forEach(r => {
    const id  = r.session_id
    const day = r.created_at?.slice(0, 10)
    if (!day) return
    if (!userMap[id]) userMap[id] = { firstDay: day, days: new Set() }
    userMap[id].days.add(day)
  })

  // Group users into weekly cohorts by first message
  const cohortMap = {}
  Object.entries(userMap).forEach(([id, u]) => {
    const d      = parseISO(u.firstDay)
    const cohort = `${getYear(d)}-W${String(getISOWeek(d)).padStart(2, '0')}`
    if (!cohortMap[cohort]) cohortMap[cohort] = []
    cohortMap[cohort].push({ firstDay: u.firstDay, days: [...u.days] })
  })

  const WEEKS = [1, 2, 3, 4, 5]

  return Object.entries(cohortMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohort, users]) => {
      const retention = WEEKS.map(wk => {
        const minDay = (wk - 1) * 7 + 1
        const maxDay = wk * 7
        const returned = users.filter(u =>
          u.days.some(d => {
            const diff = differenceInDays(parseISO(d), parseISO(u.firstDay))
            return diff >= minDay && diff <= maxDay
          })
        ).length
        return users.length > 0 ? Math.round((returned / users.length) * 100) : null
      })
      return { cohort: cohort.replace(/^\d{4}-/, ''), users: users.length, retention }
    })
}

// ─── Escalations ─────────────────────────────────────────────────────────────

export async function getEscalations(days) {
  const since = isoStr(days)
  const prevSince = isoStr(days * 2)

  // Try sessions table first
  const { data: current, error: e1 } = await supabase
    .from('sessions')
    .select('id, escalated, started_at')
    .gte('started_at', since)

  const { data: previous, error: e2 } = await supabase
    .from('sessions')
    .select('id, escalated, started_at')
    .gte('started_at', prevSince)
    .lt('started_at', since)

  if (!e1 && current) {
    const currEsc  = (current || []).filter(s => s.escalated).length
    const prevEsc  = (previous || []).filter(s => s.escalated).length
    const currTotal = current.length
    const prevTotal = previous.length
    return {
      source:       'sessions',
      current:      currEsc,
      previous:     prevEsc,
      currentTotal: currTotal,
      previousTotal: prevTotal,
      currentRate:  currTotal > 0 ? (currEsc / currTotal) * 100 : 0,
      previousRate: prevTotal > 0 ? (prevEsc / prevTotal) * 100 : 0,
    }
  }

  // Fallback: no escalation data yet
  return { source: 'none', current: 0, previous: 0, currentTotal: 0, previousTotal: 0, currentRate: 0, previousRate: 0 }
}
