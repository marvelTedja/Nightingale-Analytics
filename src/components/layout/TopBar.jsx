import { useLocation } from 'react-router-dom'
import { RefreshCw, FlaskConical } from 'lucide-react'
import { useAnalytics } from '../../hooks/useAnalytics'

const TITLES = {
  '/overview':      'Overview',
  '/retention':     'User Retention',
  '/conversations': 'Conversations',
  '/costs':         'Cost & API Usage',
}

const RANGES = [
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

export default function TopBar() {
  const location = useLocation()
  const title    = TITLES[location.pathname] || 'Analytics'
  const { days, setDateRange, refresh, loading, data } = useAnalytics()

  return (
    <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
      <h1 className="text-white font-semibold text-base">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Testing mode badge */}
        {data?.isTestingMode && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
            <FlaskConical size={12} className="text-amber-400" />
            <span className="text-amber-400 text-xs font-medium">Testing phase</span>
          </div>
        )}

        {/* Date range picker */}
        <div className="flex items-center bg-zinc-800 rounded-lg p-0.5 gap-0.5">
          {RANGES.map(r => (
            <button
              key={r.days}
              onClick={() => setDateRange(r.days)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                days === r.days
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={() => refresh()}
          disabled={loading}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </header>
  )
}
