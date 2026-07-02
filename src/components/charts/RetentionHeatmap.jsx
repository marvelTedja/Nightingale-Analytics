import { differenceInDays, parseISO } from 'date-fns'

const COLUMNS = [
  { label: 'Day 1',  days: 1 },
  { label: 'Day 3',  days: 3 },
  { label: 'Day 7',  days: 7 },
  { label: 'Day 14', days: 14 },
  { label: 'Day 30', days: 30 },
]

function pctColor(pct) {
  if (pct === null) return 'bg-zinc-800 text-zinc-600'
  if (pct >= 70) return 'bg-teal-500/80 text-white'
  if (pct >= 50) return 'bg-teal-500/50 text-teal-100'
  if (pct >= 30) return 'bg-teal-500/25 text-teal-300'
  if (pct >= 10) return 'bg-teal-500/10 text-teal-400'
  return 'bg-zinc-800 text-zinc-500'
}

// userRows: [{ firstDay, days: ['2026-06-01', ...] }]
function buildCohorts(userRows) {
  const cohortMap = {}
  userRows.forEach(u => {
    const cohort = u.firstDay
    if (!cohortMap[cohort]) cohortMap[cohort] = { cohort, users: [] }
    cohortMap[cohort].users.push(u)
  })

  return Object.values(cohortMap)
    .sort((a, b) => a.cohort.localeCompare(b.cohort))
    .slice(-8) // show last 8 cohorts
    .map(({ cohort, users }) => {
      const total = users.length
      const retention = COLUMNS.map(({ days }) => {
        const returned = users.filter(u =>
          u.days.some(d => differenceInDays(parseISO(d), parseISO(cohort)) >= days)
        ).length
        if (total === 0) return null
        return Math.round((returned / total) * 100)
      })
      return { cohort, total, retention }
    })
}

export default function RetentionHeatmap({ rows = [], loading }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
        No data yet — retention will appear after users return
      </div>
    )
  }

  const cohorts = buildCohorts(rows)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left text-zinc-500 font-medium py-2 pr-4 text-xs">Cohort</th>
            <th className="text-center text-zinc-500 font-medium py-2 px-2 text-xs">Users</th>
            {COLUMNS.map(c => (
              <th key={c.days} className="text-center text-zinc-500 font-medium py-2 px-2 text-xs">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map(row => (
            <tr key={row.cohort}>
              <td className="text-zinc-400 text-xs py-1.5 pr-4 whitespace-nowrap">{row.cohort}</td>
              <td className="text-center text-zinc-400 text-xs py-1.5 px-2">{row.total}</td>
              {row.retention.map((pct, i) => (
                <td key={i} className="py-1.5 px-2">
                  <div className={`rounded-md px-2 py-1.5 text-center text-xs font-medium ${pctColor(pct)}`}>
                    {pct !== null ? `${pct}%` : '—'}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-zinc-800">
        <span className="text-zinc-600 text-xs">Retention rate:</span>
        {[['≥70%', 'bg-teal-500/80'], ['50–70%', 'bg-teal-500/50'], ['30–50%', 'bg-teal-500/25'], ['<30%', 'bg-zinc-800']].map(([label, cls]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${cls}`} />
            <span className="text-zinc-500 text-xs">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
