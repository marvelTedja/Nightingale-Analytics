import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getAnalytics, getWeeklyBreakdown, getRetention } from '../lib/queries'

const Ctx = createContext(null)

export function AnalyticsProvider({ children }) {
  const [days, setDays]       = useState(30)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const refresh = useCallback(async (d = days) => {
    setLoading(true)
    setError(null)
    try {
      const [analytics, weekly, retention] = await Promise.all([
        getAnalytics(d),
        getWeeklyBreakdown(d),
        getRetention(),
      ])
      setData({ ...analytics, weekly, retention })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { refresh(days) }, [days])

  return (
    <Ctx.Provider value={{ data, loading, error, days, setDays, refresh }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAnalytics() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAnalytics must be inside AnalyticsProvider')
  return ctx
}
