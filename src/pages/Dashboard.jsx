import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'
import { useAnalytics } from '../hooks/useAnalytics'
import { changePct } from '../lib/queries'

// ─── Shared chart config ─────────────────────────────────────────────────────
const C = { teal: '#0d9488', blue: '#2563eb', rose: '#e11d48', amber: '#d97706', grid: '#e5e7eb', text: '#9ca3af' }

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-gray-500 mb-1 font-medium">{label}</p>
      {payload.map((e, i) => (
        <p key={i} style={{ color: e.color }} className="font-medium">{e.name}: {e.value}</p>
      ))}
    </div>
  )
}

// ─── Change badge ─────────────────────────────────────────────────────────────
function Change({ pct, inverse = false }) {
  if (pct === null || pct === undefined) return <span className="text-gray-300 text-xs">—</span>
  const positive  = inverse ? pct < 0 : pct > 0
  const neutral   = Math.abs(pct) < 0.1
  const color     = neutral ? 'text-gray-400' : positive ? 'text-emerald-600' : 'text-red-500'
  const bg        = neutral ? 'bg-gray-100' : positive ? 'bg-emerald-50' : 'bg-red-50'
  const Icon      = neutral ? Minus : positive ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color} ${bg}`}>
      <Icon size={10} />
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, prev, prevLabel, pct, inverse, accent = 'teal', loading }) {
  const colors = { teal: 'border-t-teal-500', blue: 'border-t-blue-500', rose: 'border-t-rose-500', amber: 'border-t-amber-500' }
  if (loading) return <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm"><div className="animate-pulse space-y-3"><div className="h-3 bg-gray-200 rounded w-24"/><div className="h-8 bg-gray-200 rounded w-20"/><div className="h-3 bg-gray-200 rounded w-16"/></div></div>

  return (
    <div className={`bg-white border border-gray-200 border-t-4 ${colors[accent]} rounded-xl p-5 shadow-sm`}>
      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-3">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
      <div className="flex items-center gap-2">
        <Change pct={pct} inverse={inverse} />
        {prevLabel && <span className="text-gray-400 text-xs">vs {prevLabel}</span>}
      </div>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function Section({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-gray-900 font-semibold text-base">{title}</h2>
      {subtitle && <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ─── Retention (simple per-week) ─────────────────────────────────────────────
function RetentionSimple({ data = [], loading }) {
  if (loading) return (
    <div className="animate-pulse flex gap-4">
      {[0,1,2,3,4,5].map(i => <div key={i} className="h-20 flex-1 bg-gray-100 rounded-xl" />)}
    </div>
  )

  if (!data.length) return (
    <p className="text-gray-400 text-sm py-8 text-center">
      Not enough data yet — retention appears after users return across multiple weeks
    </p>
  )

  const totalUsers = data.reduce((s, c) => s + c.users, 0)

  // For each week slot, compute: (users who returned across all cohorts) / totalUsers
  const weekRates = [0, 1, 2, 3, 4].map(wk => {
    let returned = 0
    let eligible = 0
    data.forEach(cohort => {
      const pct = cohort.retention[wk]
      if (pct !== null && pct !== undefined) {
        returned += Math.round((pct / 100) * cohort.users)
        eligible += cohort.users
      }
    })
    return eligible > 0 ? Math.round((returned / eligible) * 100) : null
  })

  function tileColor(pct) {
    if (pct === null) return 'bg-gray-50 text-gray-300'
    if (pct >= 60) return 'bg-teal-600 text-white'
    if (pct >= 40) return 'bg-teal-400 text-white'
    if (pct >= 20) return 'bg-teal-100 text-teal-800'
    if (pct > 0)   return 'bg-teal-50 text-teal-600'
    return 'bg-gray-50 text-gray-400'
  }

  return (
    <div className="flex gap-4 items-stretch">
      {/* Total users tile */}
      <div className="flex flex-col justify-center bg-gray-50 rounded-xl px-5 py-4 min-w-[90px]">
        <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
        <p className="text-gray-400 text-xs mt-1">total users</p>
      </div>

      <div className="w-px bg-gray-100 self-stretch" />

      {/* Week 1–5 tiles */}
      {weekRates.map((pct, i) => (
        <div key={i} className={`flex-1 flex flex-col items-center justify-center rounded-xl py-4 ${tileColor(pct)}`}>
          <p className="text-xl font-bold">{pct !== null ? `${pct}%` : '—'}</p>
          <p className="text-xs mt-1 opacity-70">Week {i + 1}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
function sgd(n) {
  if (n == null) return 'S$—'
  return 'S$' + Number(n).toFixed(2)
}
function num(n) { return n == null ? '—' : Number(n).toLocaleString() }

export default function Dashboard() {
  const { data, loading, days, setDays, refresh } = useAnalytics()

  const curr = data?.current
  const prev = data?.previous
  const esc  = data?.escalation
  const weekly   = data?.weekly || []
  const retention = data?.retention || []

  const prevLabel = days === 7 ? 'prev 7d' : 'prev 30d'

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">N</span>
          </div>
          <div>
            <p className="text-gray-900 font-semibold text-sm leading-none">Nightingale Analytics</p>
            <p className="text-gray-400 text-xs mt-0.5">Nightingale Pediatrics · Singapore</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            {[7, 30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  days === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {d === 7 ? 'Last 7 days' : 'Last 30 days'}
              </button>
            ))}
          </div>
          <button onClick={() => refresh()} disabled={loading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── 1. KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI
          label="Conversations"
          value={loading ? '—' : num(curr?.conversations)}
          pct={changePct(curr?.conversations, prev?.conversations)}
          prevLabel={prevLabel}
          accent="teal"
          loading={loading}
        />
        <KPI
          label="Total Cost (SGD)"
          value={loading ? '—' : sgd(curr?.totalCostSgd)}
          pct={changePct(curr?.totalCostSgd, prev?.totalCostSgd)}
          prevLabel={prevLabel}
          accent="amber"
          inverse
          loading={loading}
        />
        <KPI
          label="Cost per User (SGD)"
          value={loading ? '—' : sgd(curr?.costPerUser)}
          pct={changePct(curr?.costPerUser, prev?.costPerUser)}
          prevLabel={prevLabel}
          accent="blue"
          inverse
          loading={loading}
        />
        <KPI
          label="Escalations"
          value={loading ? '—' : `${num(esc?.current)} (${esc?.currentRate?.toFixed(1) ?? '0.0'}%)`}
          pct={changePct(esc?.currentRate, esc?.previousRate)}
          prevLabel={prevLabel}
          accent="rose"
          inverse
          loading={loading}
        />
      </div>

      {/* ── 2. Avg Conversations per Week ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-4">
        <Section
          title="Average Conversations per Week"
          subtitle="1 message sent = 1 conversation · shows how regularly users engage"
        />
        {loading ? (
          <div className="animate-pulse flex gap-8">
            {[1,2,3].map(i => <div key={i} className="h-14 w-32 bg-gray-100 rounded-lg" />)}
          </div>
        ) : weekly.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">No data yet</p>
        ) : (
          <div className="flex items-center gap-12">
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {(weekly.reduce((s, w) => s + w.avgPerUser, 0) / weekly.length).toFixed(1)}
              </p>
              <p className="text-gray-400 text-sm mt-1">avg convos/user/week</p>
            </div>
            <div className="w-px h-12 bg-gray-100" />
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {Math.round(weekly.reduce((s, w) => s + w.conversations, 0) / weekly.length)}
              </p>
              <p className="text-gray-400 text-sm mt-1">avg total convos/week</p>
            </div>
            <div className="w-px h-12 bg-gray-100" />
            <div>
              <p className="text-3xl font-bold text-gray-900">{curr?.uniqueUsers ?? '—'}</p>
              <p className="text-gray-400 text-sm mt-1">unique users</p>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Retention Week 1–5 ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-4">
        <Section
          title="Week 1–5 Retention"
          subtitle="% of all users who came back each week after their first message"
        />
        <RetentionSimple data={retention} loading={loading} />
      </div>

      {/* ── 4. Cost breakdown ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-4">
        <Section
          title="API Cost Breakdown"
          subtitle="Claude Sonnet 4.6 + Meta WhatsApp Cloud API · all values in SGD"
        />
        {loading ? (
          <div className="animate-pulse h-28 bg-gray-100 rounded-lg" />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Claude Sonnet',      value: sgd(curr?.claudeCostSgd), sub: `$3/$15 per 1M tokens` },
              { label: 'Meta WhatsApp',       value: sgd(curr?.metaCostSgd),  sub: `$0.041/convo after 1k free` },
              { label: 'Total Cost',          value: sgd(curr?.totalCostSgd), sub: `this period` },
              { label: 'Cost per User',       value: sgd(curr?.costPerUser),  sub: `${curr?.uniqueUsers ?? 0} active users` },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-500 text-xs font-medium mb-2">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-gray-400 text-xs mt-1">{sub}</p>
              </div>
            ))}
          </div>
        )}
        {!loading && (
          <p className="text-gray-300 text-xs mt-3">
            Claude: input $3/1M · output $15/1M · USD×1.35 SGD &nbsp;|&nbsp; Meta: first 1,000 conversations/month free · SG rate $0.0408 USD/conversation
          </p>
        )}
      </div>

      {/* ── 5. Escalation detail ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <Section
          title="Escalation Rate"
          subtitle="Crisis signals detected by the escalation agent"
        />
        {loading ? (
          <div className="animate-pulse h-20 bg-gray-100 rounded-lg" />
        ) : (
          <div className="flex items-start gap-10">
            <div>
              <p className="text-4xl font-bold text-gray-900">{esc?.current ?? 0}</p>
              <p className="text-gray-400 text-xs mt-1">escalations this period</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-gray-900">{esc?.currentRate?.toFixed(1) ?? '0.0'}%</p>
              <p className="text-gray-400 text-xs mt-1">of total sessions</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-500">{esc?.previous ?? 0}</p>
              <p className="text-gray-400 text-xs mt-1">{prevLabel} (prev)</p>
            </div>
            {esc?.source === 'none' && (
              <div className="ml-auto self-center">
                <p className="text-gray-400 text-xs bg-gray-50 rounded-lg px-3 py-2">
                  Live escalation count available once n8n logging is active
                </p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
