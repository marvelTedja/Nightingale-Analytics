// SGD currency formatter
export function sgd(amount) {
  if (amount === null || amount === undefined) return 'S$—'
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Compact number formatter (1.2k, 3.4M)
export function compact(n) {
  if (n === null || n === undefined) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k'
  return String(Math.round(n))
}

// Format a number with commas
export function num(n) {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('en-SG').format(Math.round(n))
}

// Trend change label
export function changePct(current, previous) {
  if (!previous || previous === 0) return null
  return ((current - previous) / previous) * 100
}

// Anonymous label for phone numbers
export function anonUser(index) {
  return `User ${index + 1}`
}

// Build a user-index map from session_ids (raw phones → "User N")
export function buildAnonMap(sessionIds) {
  const sorted = [...new Set(sessionIds)].sort()
  const map = {}
  sorted.forEach((id, i) => { map[id] = `User ${i + 1}` })
  return map
}

// Estimate tokens from character count
export function charsToTokens(chars) {
  return Math.floor(chars / 4)
}

// Claude Sonnet 4.6 cost in USD (60% input, 40% output)
export function tokensToCostUsd(totalTokens) {
  const input  = totalTokens * 0.6
  const output = totalTokens * 0.4
  return (input / 1_000_000 * 3) + (output / 1_000_000 * 15)
}

// Convert USD to SGD
export function usdToSgd(usd) {
  return usd * 1.35
}

// Format duration in seconds → human readable
export function duration(seconds) {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

// Format date for chart axis labels
export function shortDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })
}

export function monthLabel(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-SG', { month: 'short', year: '2-digit' })
}
