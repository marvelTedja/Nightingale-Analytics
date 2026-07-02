import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getOverviewData, getDailyStats, getApiCosts, getUserRetentionData, getHourlyHeatmap } from '../lib/queries'

const AnalyticsContext = createContext(null)

export function AnalyticsProvider({ children }) {
  const [days, setDays]       = useState(30)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const refresh = useCallback(async (d = days) => {
    setLoading(true)
    setError(null)
    try {
      const overview = await getOverviewData(d)
      const [retentionRows, heatmapRows] = await Promise.all([
        getUserRetentionData(),
        getHourlyHeatmap(d),
      ])
      setData({ ...overview, retentionRows, heatmapRows })
    } catch (err) {
      console.error('Analytics fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { refresh(days) }, [days])

  function setDateRange(d) {
    setDays(d)
  }

  return (
    <AnalyticsContext.Provider value={{ data, loading, error, days, setDateRange, refresh }}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics() {
  const ctx = useContext(AnalyticsContext)
  if (!ctx) throw new Error('useAnalytics must be used inside AnalyticsProvider')
  return ctx
}
