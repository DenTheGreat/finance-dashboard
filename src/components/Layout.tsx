import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  PiggyBank,
  Settings,
  Wallet,
  Menu,
  Sun,
  Moon,
} from 'lucide-react'
import type { Currency, UserSettings } from '../types'
import { useI18n } from '../i18n'
import type { Locale } from '../i18n'

const navLinks = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/transactions', labelKey: 'nav.transactions', icon: ArrowLeftRight },
  { to: '/debts', labelKey: 'nav.debts', icon: CreditCard },
  { to: '/savings', labelKey: 'nav.savings', icon: PiggyBank },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
]

const CURRENCIES: Currency[] = ['USD', 'PLN', 'UAH']
const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'uk', label: 'UK' },
  { code: 'ru', label: 'RU' },
]

interface LayoutProps {
  settings: UserSettings;
  onUpdateSettings: (s: Partial<UserSettings>) => void;
}

export default function Layout({ settings, onUpdateSettings }: LayoutProps) {
  const { t, locale, setLocale } = useI18n()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 flex flex-col transform transition-transform',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* App title */}
        <div className="flex items-center gap-3 px-4 py-6">
          <Wallet className="text-primary-400 h-6 w-6 shrink-0" />
          <span className="text-white font-semibold text-lg leading-tight">
            {t('layout.appTitle')}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navLinks.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
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
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>

        {/* Language switcher */}
        <div className="px-4 py-3 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2">{t('layout.language')}</p>
          <div className="flex gap-1">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLocale(l.code)}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  locale === l.code
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme toggle */}
        <div className="px-4 py-3 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2">{t('layout.theme')}</p>
          <button
            onClick={() => onUpdateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' })}
            className="flex items-center gap-2 w-full py-1.5 px-2 rounded-md text-xs font-semibold bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors"
            aria-label={t('layout.theme')}
          >
            {settings.theme === 'light' ? (
              <><Moon className="h-3.5 w-3.5" /> Dark</>
            ) : (
              <><Sun className="h-3.5 w-3.5" /> Light</>
            )}
          </button>
        </div>

        {/* Currency switcher */}
        <div className="px-4 py-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2">{t('layout.primaryCurrency')}</p>
          <div className="flex gap-1">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                onClick={() => onUpdateSettings({ primaryCurrency: c })}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  settings.primaryCurrency === c
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 flex items-center gap-3 px-3 py-2 bg-gray-900 border-b border-gray-800">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          className="text-gray-400 hover:text-gray-200 transition-colors p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-white font-semibold text-base">{t('layout.appTitle')}</span>
      </div>

      {/* Main content */}
      <main className="lg:ml-64 flex-1 min-h-screen p-3 sm:p-4 lg:p-8 pt-16 sm:pt-16 lg:pt-8">
        <Outlet />
      </main>
    </div>
  )
}
