import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts'
import { useAnalytics } from '../hooks/useAnalytics'
import UsageHeatmap from '../components/charts/UsageHeatmap'
import { shortDate, num, compact } from '../lib/formatters'

const CHART_COLORS = {
  primary:   '#0d9488',
  secondary: '#2563eb',
  danger:    '#e11d48',
  grid:      '#e5e7eb',
  text:      '#9ca3af',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
      <p className="text-gray-500 text-xs mb-2">{label}</p>
      {payload.map((e, i) => (
        <p key={i} className="text-xs font-medium text-gray-700">
          {e.name}: {e.value}
        </p>
      ))}
    </div>
  )
}

export default function Conversations() {
  const { data, loading } = useAnalytics()

  const daily    = data?.daily || []
  const hasStats = data?.hasStats
  const stats    = data?.convStats
  const heatmap  = data?.heatmapRows || []
  const sessions = data?.sessionStats

  const totalMessages = hasStats
    ? daily.reduce((s, d) => s + (d.total_messages || 0), 0)
    : (stats?.totalMessages ?? 0)

  const totalEsc = hasStats
    ? daily.reduce((s, d) => s + (d.escalations || 0), 0)
    : 0

  const totalSessions = hasStats
    ? daily.reduce((s, d) => s + (d.total_sessions || 0), 0)
    : (stats?.uniqueUsers ?? 0)

  const avgMsgPerSession = totalSessions > 0
    ? (totalMessages / totalSessions).toFixed(1)
    : '—'

  const escalationRate = totalSessions > 0
    ? (totalEsc / totalSessions * 100).toFixed(1)
    : '—'

  // Chart: messages per day
  const msgChartData = daily.map(d => ({
    date:     shortDate(d.date),
    'User Messages': hasStats ? Math.round((d.total_messages || 0) / 2) : (d.humanMessages || 0),
    'AI Responses':  hasStats ? Math.round((d.total_messages || 0) / 2) : (d.aiMessages || 0),
  }))

  // Chart: escalation rate trend
  const escChartData = daily.map(d => ({
    date:          shortDate(d.date),
    'Escalation %': hasStats && d.total_sessions
      ? +((d.escalations / d.total_sessions) * 100).toFixed(2)
      : 0,
  }))

  return (
    <div className="space-y-6 max-w-7xl">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Messages',       value: compact(totalMessages),     sub: 'sent + received' },
          { label: 'Avg Msgs / Session',   value: avgMsgPerSession,           sub: 'messages per convo' },
          { label: 'Total Escalations',    value: num(totalEsc),              sub: `${escalationRate}% of sessions` },
          { label: 'Tool Calls (AI)',       value: compact(stats?.toolCalls ?? 0), sub: 'clinical advisor queries' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="card p-5">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{loading ? '—' : value}</p>
            <p className="text-gray-400 text-xs mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Messages per day */}
      <div className="card p-5">
        <h3 className="text-gray-900 text-sm font-semibold mb-1">Messages per Day</h3>
        <p className="text-gray-400 text-xs mb-4">User messages sent and AI responses generated each day</p>
        {loading ? (
          <div className="skeleton h-56 rounded" />
        ) : msgChartData.length === 0 ? (
          <div className="flex items-center justify-center h-56 text-gray-400 text-sm">
            No data yet — conversations will appear here
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={msgChartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="User Messages" stroke={CHART_COLORS.primary}   strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="AI Responses"  stroke={CHART_COLORS.secondary} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Peak usage heatmap */}
        <div className="card p-5">
          <h3 className="text-gray-900 text-sm font-semibold mb-1">Peak Usage Hours</h3>
          <p className="text-gray-400 text-xs mb-4">When mums reach out — hour × day of week (Singapore time)</p>
          {loading ? <div className="skeleton h-44 rounded" /> : <UsageHeatmap data={heatmap} loading={false} />}
        </div>

        {/* Escalation rate trend */}
        <div className="card p-5">
          <h3 className="text-gray-900 text-sm font-semibold mb-1">Escalation Rate Trend</h3>
          <p className="text-gray-400 text-xs mb-4">% of sessions that triggered the crisis escalation path</p>
          {loading ? (
            <div className="skeleton h-44 rounded" />
          ) : !hasStats ? (
            <div className="flex items-center justify-center h-44 text-gray-400 text-sm text-center px-8">
              Available after n8n logging is active — see setup guide
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={176}>
              <BarChart data={escChartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Escalation %" fill={CHART_COLORS.danger} radius={[2,2,0,0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
