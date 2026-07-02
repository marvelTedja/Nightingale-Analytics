const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function cellColor(count, max) {
  if (!count || !max) return 'bg-gray-100'
  const ratio = count / max
  if (ratio >= 0.8) return 'bg-teal-600'
  if (ratio >= 0.6) return 'bg-teal-400'
  if (ratio >= 0.4) return 'bg-teal-300'
  if (ratio >= 0.2) return 'bg-teal-200'
  return 'bg-teal-100'
}

function formatHour(h) {
  if (h === 0)  return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

export default function UsageHeatmap({ data = [], loading }) {
  if (loading) {
    return <div className="skeleton h-48 rounded-lg" />
  }

  const grid = {}
  data.forEach(({ dow, hr, count }) => { grid[`${dow}-${hr}`] = count })
  const max = Math.max(1, ...Object.values(grid))

  const showHours = [0, 3, 6, 9, 12, 15, 18, 21, 23]

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
        No data yet — usage patterns will appear here
      </div>
    )
  }

  return (
    <div>
      {/* Hour labels */}
      <div className="flex mb-1 ml-10">
        {HOURS.map(h => (
          <div key={h} className="flex-1 text-center">
            {showHours.includes(h) && (
              <span className="text-gray-400 text-[10px]">{formatHour(h)}</span>
            )}
          </div>
        ))}
      </div>

      {/* Grid */}
      {DAYS.map((day, dow) => (
        <div key={day} className="flex items-center mb-0.5">
          <span className="text-gray-500 text-xs w-10 shrink-0">{day}</span>
          <div className="flex flex-1 gap-0.5">
            {HOURS.map(h => {
              const count = grid[`${dow}-${h}`] || 0
              return (
                <div
                  key={h}
                  title={count ? `${day} ${formatHour(h)}: ${count} messages` : undefined}
                  className={`flex-1 h-5 rounded-sm ${cellColor(count, max)} transition-colors`}
                />
              )
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-gray-400 text-xs">Less</span>
        {['bg-gray-100', 'bg-teal-100', 'bg-teal-300', 'bg-teal-400', 'bg-teal-600'].map((cls, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
        ))}
        <span className="text-gray-400 text-xs">More</span>
      </div>
    </div>
  )
}
