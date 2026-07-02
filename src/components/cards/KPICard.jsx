import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

const COLOR_MAP = {
  teal:   { ring: 'bg-teal-500/10',   text: 'text-teal-400',   stroke: '#14b8a6' },
  blue:   { ring: 'bg-blue-500/10',   text: 'text-blue-400',   stroke: '#3b82f6' },
  violet: { ring: 'bg-violet-500/10', text: 'text-violet-400', stroke: '#8b5cf6' },
  amber:  { ring: 'bg-amber-500/10',  text: 'text-amber-400',  stroke: '#f59e0b' },
  rose:   { ring: 'bg-rose-500/10',   text: 'text-rose-400',   stroke: '#f43f5e' },
}

// sparkline: array of numbers
export default function KPICard({ title, value, subtitle, change, sparkline = [], color = 'teal', icon: Icon, loading }) {
  const c = COLOR_MAP[color] || COLOR_MAP.teal

  const trendPositive = change > 0
  const trendNeutral  = change === 0 || change === null || change === undefined
  const TrendIcon     = trendNeutral ? Minus : trendPositive ? TrendingUp : TrendingDown
  const trendColor    = trendNeutral ? 'text-zinc-500' : trendPositive ? 'text-emerald-400' : 'text-red-400'
  const trendBg       = trendNeutral ? '' : trendPositive ? 'text-emerald-400' : 'text-red-400'

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
        <span className="text-zinc-400 text-xs font-medium uppercase tracking-wide">{title}</span>
        {Icon && (
          <div className={`p-1.5 rounded-lg ${c.ring}`}>
            <Icon size={14} className={c.text} strokeWidth={2} />
          </div>
        )}
      </div>

      <div>
        <div className="text-3xl font-bold text-white leading-none">{value}</div>
        {subtitle && <div className="text-zinc-500 text-xs mt-1">{subtitle}</div>}
      </div>

      <div className="flex items-center justify-between">
        {change !== null && change !== undefined ? (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon size={12} />
            <span>{Math.abs(change).toFixed(1)}% vs prev period</span>
          </div>
        ) : (
          <span className="text-zinc-600 text-xs">No comparison data</span>
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
