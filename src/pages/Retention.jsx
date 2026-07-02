import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts'
import { useAnalytics } from '../hooks/useAnalytics'
import RetentionHeatmap from '../components/charts/RetentionHeatmap'
import { shortDate } from '../lib/formatters'

const CHART_COLORS = {
  primary:   '#14b8a6',
  secondary: '#3b82f6',
  grid:      '#27272a',
  text:      '#71717a',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
      <p className="text-zinc-400 text-xs mb-2">{label}</p>
      {payload.map((e, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: e.color }}>
          {e.name}: {e.value}
        </p>
      ))}
    </div>
  )
}

export default function Retention() {
  const { data, loading } = useAnalytics()

  const daily  = data?.daily || []
  const hasStats = data?.hasStats
  const retentionRows = data?.retentionRows || []

  // New vs returning per day
  const stackedData = daily.map(d => ({
    date:      shortDate(d.date),
    'New':     hasStats ? (d.new_users || 0) : 0,
    'Returning': hasStats ? (d.returning_users || 0) : 0,
  }))

  // Sticky users — those with 5+ sessions
  const stickyUsers = retentionRows.filter(u => u.totalSessions >= 5).length
  const stickyPct   = retentionRows.length
    ? ((stickyUsers / retentionRows.length) * 100).toFixed(1)
    : 0

  // Avg sessions per user per day (from daily_stats)
  const avgSessionsData = daily.map(d => ({
    date:  shortDate(d.date),
    Avg:   hasStats && (d.new_users + d.returning_users) > 0
      ? +((d.total_sessions || 0) / (d.new_users + d.returning_users || 1)).toFixed(2)
      : 0,
  }))

  return (
    <div className="space-y-6 max-w-7xl">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-2">Total Unique Users</p>
          <p className="text-3xl font-bold text-white">{retentionRows.length || data?.convStats?.uniqueUsers || '—'}</p>
          <p className="text-zinc-500 text-xs mt-1">All time</p>
        </div>
        <div className="card p-5">
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-2">Sticky Users (5+ sessions)</p>
          <p className="text-3xl font-bold text-white">{stickyUsers}</p>
          <p className="text-zinc-500 text-xs mt-1">{stickyPct}% of total users</p>
        </div>
        <div className="card p-5">
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-2">Avg Sessions / User</p>
          <p className="text-3xl font-bold text-white">
            {retentionRows.length
              ? (retentionRows.reduce((s, u) => s + u.totalSessions, 0) / retentionRows.length).toFixed(1)
              : '—'
            }
          </p>
          <p className="text-zinc-500 text-xs mt-1">All time average</p>
        </div>
      </div>

      {/* Retention cohort heatmap */}
      <div className="card p-5">
        <h3 className="text-white text-sm font-semibold mb-1">Cohort Retention</h3>
        <p className="text-zinc-500 text-xs mb-5">
          Percentage of users from each weekly cohort who returned on Day 1, 3, 7, 14, and 30
        </p>
        <RetentionHeatmap rows={retentionRows} loading={loading} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* New vs Returning */}
        <div className="card p-5">
          <h3 className="text-white text-sm font-semibold mb-1">New vs Returning Users</h3>
          <p className="text-zinc-500 text-xs mb-4">Daily breakdown of first-time vs returning users</p>
          {loading ? (
            <div className="skeleton h-52 rounded" />
          ) : !hasStats ? (
            <div className="flex items-center justify-center h-52 text-zinc-600 text-sm text-center px-8">
              Available after n8n logging is active — see setup guide
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stackedData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                <Bar dataKey="New"       stackId="a" fill={CHART_COLORS.primary}   radius={[0,0,0,0]} maxBarSize={18} />
                <Bar dataKey="Returning" stackId="a" fill={CHART_COLORS.secondary} radius={[2,2,0,0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Avg sessions per user */}
        <div className="card p-5">
          <h3 className="text-white text-sm font-semibold mb-1">Avg Sessions per User</h3>
          <p className="text-zinc-500 text-xs mb-4">Daily average sessions per active user</p>
          {loading ? (
            <div className="skeleton h-52 rounded" />
          ) : !hasStats ? (
            <div className="flex items-center justify-center h-52 text-zinc-600 text-sm text-center px-8">
              Available after n8n logging is active — see setup guide
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={avgSessionsData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="Avg" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
