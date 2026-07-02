import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, MessageSquare, DollarSign } from 'lucide-react'

const NAV = [
  { to: '/overview',      label: 'Overview',       icon: LayoutDashboard },
  { to: '/retention',     label: 'User Retention',  icon: Users },
  { to: '/conversations', label: 'Conversations',   icon: MessageSquare },
  { to: '/costs',         label: 'Cost & API',      icon: DollarSign },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-zinc-800">
        <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-bold">N</span>
        </div>
        <div>
          <p className="text-white text-sm font-semibold leading-none">Nightingale</p>
          <p className="text-zinc-500 text-xs mt-0.5">Analytics</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-500/10 text-teal-400'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`
            }
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-zinc-800">
        <p className="text-zinc-600 text-xs">Nightingale Pediatrics</p>
        <p className="text-zinc-700 text-xs">Singapore · Internal Use</p>
      </div>
    </aside>
  )
}
