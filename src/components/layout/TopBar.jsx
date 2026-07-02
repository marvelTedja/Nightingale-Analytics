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
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
      <h1 className="text-gray-900 font-semibold text-base">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Testing mode badge */}
        {data?.isTestingMode && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
            <FlaskConical size={12} className="text-amber-500" />
            <span className="text-amber-600 text-xs font-medium">Testing phase</span>
          </div>
        )}

        {/* Date range picker */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
          {RANGES.map(r => (
            <button
              key={r.days}
              onClick={() => setDateRange(r.days)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                days === r.days
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
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
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </header>
  )
}
