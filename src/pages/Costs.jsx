import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useAnalytics } from '../hooks/useAnalytics'
import { sgd, num, compact, shortDate, tokensToCostUsd, usdToSgd } from '../lib/formatters'

const CHART_COLORS = {
  primary:   '#0d9488',
  secondary: '#2563eb',
  amber:     '#d97706',
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
          {e.name}: {typeof e.value === 'number' && e.name.includes('S$') ? `S$${e.value.toFixed(2)}` : e.value}
        </p>
      ))}
    </div>
  )
}

export default function Costs() {
  const { data, loading, days } = useAnalytics()

  const apiCosts = data?.apiCosts || []
  const daily    = data?.daily || []
  const hasStats = data?.hasStats
  const stats    = data?.convStats

  // Total cost this period
  const totalCostSgd = apiCosts.length
    ? apiCosts.reduce((s, r) => s + (r.cost_sgd || 0), 0)
    : (stats?.costSgd ?? 0)

  const totalTokens = apiCosts.length
    ? apiCosts.reduce((s, r) => s + (r.total_tokens || 0), 0)
    : (stats?.totalTokens ?? 0)

  const totalInputTokens  = apiCosts.reduce((s, r) => s + (r.input_tokens || 0), 0)
  const totalOutputTokens = apiCosts.reduce((s, r) => s + (r.output_tokens || 0), 0)

  // Total sessions for cost-per-user
  const totalSessions = hasStats
    ? daily.reduce((s, d) => s + (d.total_sessions || 0), 0)
    : (stats?.uniqueUsers ?? 0)

  const costPerUser = totalSessions > 0 ? totalCostSgd / totalSessions : null

  // Linear projection for this month
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const dayOfMonth  = today.getDate()
  const projectedMonthCost = dayOfMonth > 0 ? (totalCostSgd / Math.min(days, dayOfMonth) * daysInMonth) : 0

  // Chart: cost per day
  const costChartData = apiCosts.length
    ? apiCosts.map(r => ({ date: shortDate(r.date), 'S$ Cost': +Number(r.cost_sgd).toFixed(2) }))
    : daily.map(d => ({ date: shortDate(d.date), 'S$ Cost': +Number((d.total_cost_usd || 0) * 1.35).toFixed(2) }))

  // Chart: cost per conversation trend
  const costPerConvData = daily.map((d, i) => {
    const sessions = d.total_sessions || 0
    const cost     = (d.total_cost_usd || 0) * 1.35
    return {
      date:    shortDate(d.date),
      'S$/Conversation': sessions > 0 ? +(cost / sessions).toFixed(3) : 0,
    }
  })

  // Pie: input vs output tokens
  const pieData = [
    { name: 'Input tokens (prompt)',  value: totalInputTokens  || Math.round(totalTokens * 0.6) },
    { name: 'Output tokens (reply)',  value: totalOutputTokens || Math.round(totalTokens * 0.4) },
  ]
  const PIE_COLORS = [CHART_COLORS.secondary, CHART_COLORS.primary]

  // Monthly AI spend (last 3 months)
  const monthlyMap = {}
  ;(apiCosts.length ? apiCosts : daily).forEach(d => {
    const month = (d.date || '').slice(0, 7)
    if (!month) return
    const cost  = d.cost_sgd ?? ((d.total_cost_usd || 0) * 1.35)
    monthlyMap[month] = (monthlyMap[month] || 0) + cost
  })
  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, cost]) => ({ month, 'S$ Spend': +cost.toFixed(2) }))

  return (
    <div className="space-y-6 max-w-7xl">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'AI Spend This Period',    value: sgd(totalCostSgd),            sub: `Last ${days} days` },
          { label: 'Times AI Was Asked',       value: compact(totalTokens / 800 | 0), sub: 'estimated conversations' },
          { label: 'Cost per Conversation',    value: costPerUser ? sgd(costPerUser) : '—', sub: 'avg per session' },
          { label: 'Projected Month Cost',     value: sgd(projectedMonthCost),      sub: 'linear projection' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="card p-5">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{loading ? '—' : value}</p>
            <p className="text-gray-400 text-xs mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Monthly spend bar + cost per conversation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-gray-900 text-sm font-semibold mb-1">Monthly AI Spend (SGD)</h3>
          <p className="text-gray-400 text-xs mb-4">Total spend per calendar month</p>
          {loading ? (
            <div className="skeleton h-52 rounded" />
          ) : monthlyData.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-gray-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 4, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} tickFormatter={v => `S$${v.toFixed(0)}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="S$ Spend" fill={CHART_COLORS.amber} radius={[3, 3, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-gray-900 text-sm font-semibold mb-1">Cost per Conversation (SGD)</h3>
          <p className="text-gray-400 text-xs mb-4">Daily average cost per bot session</p>
          {loading ? (
            <div className="skeleton h-52 rounded" />
          ) : !hasStats ? (
            <div className="flex items-center justify-center h-52 text-gray-400 text-sm text-center px-8">
              Available after n8n logging is active
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={costPerConvData} margin={{ top: 4, right: 4, bottom: 4, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} tickFormatter={v => `S$${v.toFixed(2)}`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="S$/Conversation" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Daily cost + token pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-gray-900 text-sm font-semibold mb-1">Daily AI Spend (SGD)</h3>
          <p className="text-gray-400 text-xs mb-4">Cost in SGD per day</p>
          {loading ? (
            <div className="skeleton h-52 rounded" />
          ) : costChartData.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-gray-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={costChartData} margin={{ top: 4, right: 4, bottom: 4, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} tickFormatter={v => `S$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="S$ Cost" fill={CHART_COLORS.primary} radius={[2,2,0,0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-gray-900 text-sm font-semibold mb-1">Token Breakdown</h3>
          <p className="text-gray-400 text-xs mb-4">Input vs output token split</p>
          {loading ? (
            <div className="skeleton h-52 rounded" />
          ) : totalTokens === 0 ? (
            <div className="flex items-center justify-center h-52 text-gray-400 text-sm text-center">No token data yet</div>
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => compact(v) + ' tokens'} contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11, color: '#374151' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 w-full">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i] }} />
                      <span className="text-gray-500">{d.name}</span>
                    </div>
                    <span className="text-gray-700 font-medium">{compact(d.value)}</span>
                  </div>
                ))}
                <div className="pt-1 border-t border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Total</span>
                  <span className="text-white font-medium">{compact(totalTokens)} tokens</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Claude pricing note */}
      <div className="card-sm px-4 py-3 flex items-center gap-3">
        <div className="w-1 h-8 bg-teal-500 rounded-full shrink-0" />
        <div>
          <p className="text-gray-700 text-xs font-medium">Claude Sonnet 4.6 pricing (as of July 2026)</p>
          <p className="text-zinc-500 text-xs">Input: $3 / 1M tokens · Output: $15 / 1M tokens · SGD conversion: ×1.35</p>
        </div>
      </div>
    </div>
  )
}
