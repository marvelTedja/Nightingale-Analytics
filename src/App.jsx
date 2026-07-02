import { AnalyticsProvider } from './hooks/useAnalytics'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <AnalyticsProvider>
      <div className="min-h-screen bg-gray-50">
        <Dashboard />
      </div>
    </AnalyticsProvider>
  )
}
