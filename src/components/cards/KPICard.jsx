import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

const COLOR_MAP = {
  teal:   { ring: 'bg-teal-50',   text: 'text-teal-600',   stroke: '#0d9488' },
  blue:   { ring: 'bg-blue-50',   text: 'text-blue-600',   stroke: '#2563eb' },
  violet: { ring: 'bg-violet-50', text: 'text-violet-600', stroke: '#7c3aed' },
  amber:  { ring: 'bg-amber-50',  text: 'text-amber-600',  stroke: '#d97706' },
  rose:   { ring: 'bg-rose-50',   text: 'text-rose-600',   stroke: '#e11d48' },
}

export default function KPICard({ title, value, subtitle, change, sparkline = [], color = 'teal', icon: Icon, loading }) {
  const c = COLOR_MAP[color] || COLOR_MAP.teal

  const trendPositive = change > 0
  const trendNeutral  = change === 0 || change === null || change === undefined
  const TrendIcon     = trendNeutral ? Minus : trendPositive ? TrendingUp : TrendingDown
  const trendColor    = trendNeutral ? 'text-gray-400' : trendPositive ? 'text-emerald-600' : 'text-red-500'

  const sparkData = sparkline.map((v, i) => ({ i, v }))

  if (loading) {
    return (
      <div className="card p-5">
        <div className="skeleton h-3 w-24 mb-4" />
        <div className="skeleton h-8 w-20 mb-2" />
        <div className="skeleton h-3 w-16" />
      </div>
    )
  }

  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">{title}</span>
        {Icon && (
          <div className={`p-1.5 rounded-lg ${c.ring}`}>
            <Icon size={14} className={c.text} strokeWidth={2} />
          </div>
        )}
      </div>

      <div>
        <div className="text-3xl font-bold text-gray-900 leading-none">{value}</div>
        {subtitle && <div className="text-gray-400 text-xs mt-1">{subtitle}</div>}
      </div>

      <div className="flex items-center justify-between">
        {change !== null && change !== undefined ? (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon size={12} />
            <span>{Math.abs(change).toFixed(1)}% vs prev period</span>
          </div>
        ) : (
          <span className="text-gray-300 text-xs">No comparison data</span>
        )}

        {sparkData.length > 1 && (
          <div className="w-20 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={c.stroke}
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
