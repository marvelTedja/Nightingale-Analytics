import { supabase } from './supabase'
import { charsToTokens, tokensToCostUsd } from './formatters'
import { subDays, startOfDay, format } from 'date-fns'

// ─── Helpers ────────────────────────────────────────────────────────────────

function dateStr(daysAgo) {
  return format(subDays(new Date(), daysAgo), 'yyyy-MM-dd')
}

function isoStr(daysAgo) {
  return startOfDay(subDays(new Date(), daysAgo)).toISOString()
}

// ─── Conversations table (testing phase fallback) ────────────────────────────

export async function getConversationStats(days = 30) {
  const since = isoStr(days)

  const { data, error } = await supabase
    .from('n8n_chat_histories')
    .select('session_id, message, created_at')
    .gte('created_at', since)

  if (error) { console.error('getConversationStats:', error); return null }

  const rows = data || []
  const humanRows = rows.filter(r => r.message?.type === 'human')
  const aiRows    = rows.filter(r => r.message?.type === 'ai')
  const toolRows  = rows.filter(r => r.message?.type === 'tool')

  const uniqueUsers = new Set(rows.map(r => r.session_id)).size

  // Token estimation from character counts
  const totalChars  = rows.reduce((s, r) => s + (r.message?.content?.length || 0), 0)
  const totalTokens = charsToTokens(totalChars)
  const costUsd     = tokensToCostUsd(totalTokens)

  return {
    uniqueUsers,
    humanMessages:  humanRows.length,
    aiMessages:     aiRows.length,
    toolCalls:      toolRows.length,
    totalMessages:  rows.length,
    totalTokens,
    costUsd,
    costSgd:        costUsd * 1.35,
    rows,
  }
}

// Daily message counts derived from conversations table
export async function getDailyFromConversations(days = 30) {
  const since = isoStr(days)

  const { data, error } = await supabase
    .from('n8n_chat_histories')
    .select('session_id, message, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  if (error) { console.error('getDailyFromConversations:', error); return [] }

  const rows = data || []
  const byDay = {}

  rows.forEach(r => {
    const day = r.created_at?.slice(0, 10)
    if (!day) return
    if (!byDay[day]) byDay[day] = { date: day, humanMessages: 0, aiMessages: 0, activeUsers: new Set(), toolCalls: 0, totalChars: 0 }
    const type = r.message?.type
    if (type === 'human') { byDay[day].humanMessages++; byDay[day].activeUsers.add(r.session_id) }
    if (type === 'ai')    { byDay[day].aiMessages++; byDay[day].totalChars += (r.message?.content?.length || 0) }
    if (type === 'tool')    byDay[day].toolCalls++
    byDay[day].totalChars += (r.message?.content?.length || 0)
  })

  return Object.values(byDay)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      ...d,
      activeUsers: d.activeUsers.size,
      costSgd: tokensToCostUsd(charsToTokens(d.totalChars)) * 1.35,
    }))
}

// Per-user stats for retention (from conversations)
export async function getUserRetentionData() {
  const { data, error } = await supabase
    .from('n8n_chat_histories')
    .select('session_id, created_at')
    .eq('message->>type', 'human')
    .order('created_at', { ascending: true })

  if (error) { console.error('getUserRetentionData:', error); return [] }

  const rows = data || []
  const userDays = {}

  rows.forEach(r => {
    const id  = r.session_id
    const day = r.created_at?.slice(0, 10)
    if (!day) return
    if (!userDays[id]) userDays[id] = { firstDay: day, days: new Set() }
    userDays[id].days.add(day)
  })

  return Object.entries(userDays).map(([id, u]) => ({
    sessionId: id,
    firstDay:  u.firstDay,
    days:      [...u.days].sort(),
    totalSessions: u.days.size,
  }))
}

// Hourly usage heatmap (from conversations)
export async function getHourlyHeatmap(days = 30) {
  const since = isoStr(days)

  const { data, error } = await supabase
    .from('n8n_chat_histories')
    .select('created_at')
    .gte('created_at', since)
    .eq('message->>type', 'human')

  if (error) { console.error('getHourlyHeatmap:', error); return [] }

  const grid = {}
  ;(data || []).forEach(r => {
    const d   = new Date(r.created_at)
    const dow = d.getDay()  // 0=Sun
    const hr  = d.getHours()
    const key = `${dow}-${hr}`
    grid[key] = (grid[key] || 0) + 1
  })

  return Object.entries(grid).map(([key, count]) => {
    const [dow, hr] = key.split('-').map(Number)
    return { dow, hr, count }
  })
}

// ─── daily_stats table (when n8n starts logging) ────────────────────────────

export async function getDailyStats(days = 30) {
  const since = dateStr(days)

  const { data, error } = await supabase
    .from('daily_stats')
    .select('*')
    .gte('date', since)
    .order('date', { ascending: true })

  if (error) { console.error('getDailyStats:', error); return [] }
  return data || []
}

export async function hasDailyStatsData() {
  const { count } = await supabase
    .from('daily_stats')
    .select('*', { count: 'exact', head: true })
  return (count || 0) > 0
}

// ─── api_costs table ─────────────────────────────────────────────────────────

export async function getApiCosts(days = 30) {
  const since = dateStr(days)

  const { data, error } = await supabase
    .from('api_costs')
    .select('*')
    .gte('date', since)
    .order('date', { ascending: true })

  if (error) { console.error('getApiCosts:', error); return [] }
  return (data || []).map(r => ({
    ...r,
    cost_sgd:   (r.cost_usd || 0) * 1.35,
  }))
}

// ─── sessions table ──────────────────────────────────────────────────────────

export async function getSessionStats(days = 30) {
  const since = isoStr(days)

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .gte('started_at', since)

  if (error) { console.error('getSessionStats:', error); return null }

  const rows = data || []
  const escalated = rows.filter(r => r.escalated)
  const newUsers  = rows.filter(r => r.is_new_user)

  return {
    total:      rows.length,
    escalated:  escalated.length,
    newUsers:   newUsers.length,
    returning:  rows.length - newUsers.length,
    escalationRate: rows.length ? (escalated.length / rows.length * 100) : 0,
  }
}

// ─── Composite: pick the best data source ───────────────────────────────────

export async function getOverviewData(days = 30) {
  const [hasStats, convStats, daily, sessionStats, apiCosts] = await Promise.all([
    hasDailyStatsData(),
    getConversationStats(days),
    getDailyStats(days),
    getSessionStats(days),
    getApiCosts(days),
  ])

  // Derive from conversations table as fallback
  const convDaily = await getDailyFromConversations(days)

  return {
    hasStats,
    convStats,
    daily:        hasStats && daily.length ? daily : convDaily,
    sessionStats,
    apiCosts:     apiCosts.length ? apiCosts : [],
    isTestingMode: !hasStats || daily.length === 0,
  }
}
