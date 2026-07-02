import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Users, MessageSquare, AlertTriangle, DollarSign, Activity } from 'lucide-react'
import { useAnalytics } from '../hooks/useAnalytics'
import KPICard from '../components/cards/KPICard'
import { sgd, compact, num, changePct, shortDate } from '../lib/formatters'

const CHART_COLORS = {
  primary:   '#14b8a6',
  secondary: '#3b82f6',
  danger:    '#f43f5e',
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

function HealthScore({ escalationRate }) {
  if (escalationRate === null || escalationRate === undefined) return null
  const pct = Number(escalationRate)
  const status = pct < 3 ? 'green' : pct < 6 ? 'yellow' : 'red'
  const map = {
    green:  { label: 'Healthy',  bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    yellow: { label: 'Monitor',  bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400' },
    red:    { label: 'Elevated', bg: 'bg-rose-500/10',    text: 'text-rose-400',    dot: 'bg-rose-400' },
  }
  const s = map[status]
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${s.bg} border border-current/10`}>
      <div className={`w-2 h-2 rounded-full ${s.dot} animate-pulse`} />
      <span className={`text-sm font-medium ${s.text}`}>{s.label}</span>
      <span className="text-zinc-500 text-xs">· {pct.toFixed(1)}% escalation rate</span>
    </div>
  )
}

export default function Overview() {
  const { data, loading, days } = useAnalytics()

  const stats  = data?.convStats
  const daily  = data?.daily || []
  const sess   = data?.sessionStats
  const hasStats = data?.hasStats

  // Pick the right escalation rate source
  const escalationPct = sess?.escalationRate
    ?? (hasStats && daily.length
      ? (daily.reduce((s, d) => s + (d.escalations || 0), 0) /
         Math.max(1, daily.reduce((s, d) => s + (d.total_sessions || 0), 0)) * 100)
      : null)

  // KPI values
  const totalUsers   = hasStats
    ? daily.reduce((s, d) => s + (d.new_users || 0), 0)
    : (stats?.uniqueUsers ?? 0)

  const totalConvs   = hasStats
    ? daily.reduce((s, d) => s + (d.total_sessions || 0), 0)
    : (stats?.humanMessages ?? 0)

  const totalEsc     = hasStats
    ? daily.reduce((s, d) => s + (d.escalations || 0), 0)
    : 0

  const totalCostSgd = hasStats
    ? daily.reduce((s, d) => s + ((d.total_cost_usd || 0) * 1.35), 0)
    : (stats?.costSgd ?? 0)

  const avgPerUser   = totalUsers > 0 ? (totalConvs / totalUsers).toFixed(1) : '—'

  // Chart data
  const chartData = daily.map(d => ({
    date:     shortDate(d.date),
    Users:    hasStats ? (d.new_users + d.returning_users) : d.activeUsers,
    Sessions: hasStats ? d.total_sessions : d.humanMessages,
  }))

  // Sparklines (last 14 values)
  const userSparkline = daily.slice(-14).map(d => hasStats ? d.total_sessions : (d.activeUsers || 0))
  const convSparkline = daily.slice(-14).map(d => hasStats ? d.total_sessions : (d.humanMessages || 0))
  const costSparkline = daily.slice(-14).map(d => ((d.total_cost_usd || 0) * 1.35))

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Health score */}
      <div className="flex items-center justify-between">
        <div />
        <HealthScore escalationRate={escalationPct} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Active Users"
          value={num(totalUsers)}
          subtitle={`Last ${days} days`}
          change={null}
          sparkline={userSparkline}
          color="teal"
          icon={Users}
          loading={loading}
        />
        <KPICard
          title="Conversations"
          value={compact(totalConvs)}
          subtitle={`Last ${days} days`}
          change={null}
          sparkline={convSparkline}
          color="blue"
          icon={MessageSquare}
          loading={loading}
        />
        <KPICard
          title="Escalations"
          value={num(totalEsc)}
          subtitle={escalationPct !== null ? `${Number(escalationPct).toFixed(1)}% of total` : 'of total'}
          change={null}
          color="rose"
          icon={AlertTriangle}
          loading={loading}
        />
        <KPICard
          title="AI Cost (SGD)"
          value={sgd(totalCostSgd)}
          subtitle={`Last ${days} days`}
          change={null}
          sparkline={costSparkline}
          color="amber"
          icon={DollarSign}
          loading={loading}
        />
        <KPICard
          title="Avg Sessions / User"
          value={avgPerUser}
          subtitle="sessions per user"
          change={null}
          color="violet"
          icon={Activity}
          loading={loading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Active Users */}
        <div className="card p-5">
          <h3 className="text-white text-sm font-semibold mb-1">Daily Active Users</h3>
          <p className="text-zinc-500 text-xs mb-4">Unique users who sent a message each day</p>
          {loading ? (
            <div className="skeleton h-56 rounded" />
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-56 text-zinc-600 text-sm">
              No data yet — conversations will appear here
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="Users" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Daily Conversations */}
        <div className="card p-5">
          <h3 className="text-white text-sm font-semibold mb-1">Conversations per Day</h3>
          <p className="text-zinc-500 text-xs mb-4">Total messages sent to the bot each day</p>
          {loading ? (
            <div className="skeleton h-56 rounded" />
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-56 text-zinc-600 text-sm">
              No data yet — conversations will appear here
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Sessions" fill={CHART_COLORS.secondary} radius={[2, 2, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
