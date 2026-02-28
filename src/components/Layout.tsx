import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  PiggyBank,
  Settings,
  Wallet,
  FileSpreadsheet,
} from 'lucide-react'

const navLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/import', label: 'Bank Import', icon: FileSpreadsheet },
  { to: '/debts', label: 'Debts', icon: CreditCard },
  { to: '/savings', label: 'Savings', icon: PiggyBank },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-screen w-64 bg-gray-900 flex flex-col">
        {/* App title */}
        <div className="flex items-center gap-3 px-4 py-6">
          <Wallet className="text-primary-400 h-6 w-6 shrink-0" />
          <span className="text-white font-semibold text-lg leading-tight">
            Finance Dashboard
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-600/20 text-primary-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50',
                ].join(' ')
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 min-h-screen p-8">
        <Outlet />
      </main>
    </div>
  )
}
