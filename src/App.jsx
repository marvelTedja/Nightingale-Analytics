import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnalyticsProvider } from './hooks/useAnalytics'
import Sidebar from './components/layout/Sidebar'
import TopBar  from './components/layout/TopBar'
import Overview      from './pages/Overview'
import Retention     from './pages/Retention'
import Conversations from './pages/Conversations'
import Costs         from './pages/Costs'

export default function App() {
  return (
    <BrowserRouter>
      <AnalyticsProvider>
        <div className="flex h-screen overflow-hidden bg-gray-50">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto p-6">
              <Routes>
                <Route path="/"               element={<Navigate to="/overview" replace />} />
                <Route path="/overview"       element={<Overview />} />
                <Route path="/retention"      element={<Retention />} />
                <Route path="/conversations"  element={<Conversations />} />
                <Route path="/costs"          element={<Costs />} />
              </Routes>
            </main>
          </div>
        </div>
      </AnalyticsProvider>
    </BrowserRouter>
  )
}
