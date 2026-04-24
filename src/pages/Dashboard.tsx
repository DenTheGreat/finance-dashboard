import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Wallet, TrendingUp, TrendingDown, Target, X, Search, Calendar, ArrowRight } from 'lucide-react';
import type { AppData, Transaction } from '../types';
import { CATEGORY_COLORS } from '../types';
import {
  getMonthlyBreakdown,
  getSavingsAdvice,
  getExpensesByCategory,
} from '../utils/advisor';
import { calculatePlannedVsActual, getUpcomingPlannedExpenses } from '../utils/planning';
import { useI18n } from '../i18n';

interface DashboardProps {
  data: AppData;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; payload: { color: string } }[];
}

function CustomPieTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm shadow-lg">
      <p className="text-gray-300 font-medium">{item.name}</p>
      <p className="text-white font-bold">{item.value.toFixed(2)}</p>
    </div>
  );
}

function getCurrencyTotals(transactions: Transaction[], month: number, year: number) {
  const result: Record<string, { income: number; expenses: number }> = {};
  for (const t of transactions) {
    const d = new Date(t.date);
    if (d.getMonth() !== month || d.getFullYear() !== year) continue;
    const currency = t.currency || 'USD';
    if (!result[currency]) result[currency] = { income: 0, expenses: 0 };
    if (t.type === 'income') result[currency].income += t.amount;
    else result[currency].expenses += t.amount;
  }
  return result;
}

export default function Dashboard({ data }: DashboardProps) {
  const { t, tc, formatCurrency, formatDate } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const { transactions, settings } = data;
  const { primaryCurrency, exchangeRate } = settings;

  const breakdown = useMemo(
    () => getMonthlyBreakdown(transactions, month, year, primaryCurrency, exchangeRate, settings.exchangeRates),
    [transactions, month, year, primaryCurrency, exchangeRate, settings.exchangeRates],
  );

  const advice = useMemo(() => getSavingsAdvice(breakdown), [breakdown]);

  const expensesByCategory = useMemo(
    () => getExpensesByCategory(transactions, month, year, primaryCurrency, exchangeRate, settings.exchangeRates),
    [transactions, month, year, primaryCurrency, exchangeRate, settings.exchangeRates],
  );

  const pieData = expensesByCategory.map(({ category, amount, color }) => ({
    name: tc(category),
    value: amount,
    color,
    rawCategory: category,
  }));

  // Dashboard search
  const [dashSearch, setDashSearch] = useState('');

  // Recent transactions (sorted newest first), filtered by selected category + search
  const recentTransactions = useMemo(() => {
    let txs = selectedCategory
      ? transactions.filter((tx) => tx.category === selectedCategory)
      : transactions;

    if (dashSearch.trim()) {
      const tokens = dashSearch.trim().toLowerCase().split(/\s+/);
      txs = txs.filter((tx) =>
        tokens.every((token) => {
          const amountMatch = token.match(/^([><]=?)([\d.]+)$/);
          if (amountMatch) {
            const op = amountMatch[1];
            const val = parseFloat(amountMatch[2]);
            if (isNaN(val)) return true;
            if (op === '>') return tx.amount > val;
            if (op === '<') return tx.amount < val;
            if (op === '>=') return tx.amount >= val;
            if (op === '<=') return tx.amount <= val;
          }
          if (token.startsWith('type:')) return tx.type.includes(token.split(':')[1]);
          if (token.startsWith('cur:') || token.startsWith('currency:')) return tx.currency.toLowerCase() === token.split(':')[1];
          if (token.startsWith('source:')) return (tx.source || '').toLowerCase().includes(token.split(':')[1]);
          return (
            tx.description.toLowerCase().includes(token) ||
            tx.category.toLowerCase().includes(token) ||
            (tx.counterparty || '').toLowerCase().includes(token)
          );
        }),
      );
    }

    return [...txs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, selectedCategory || dashSearch ? 50 : 5);
  }, [transactions, selectedCategory, dashSearch]);

  const currencyTotals = useMemo(
    () => getCurrencyTotals(transactions, month, year),
    [transactions, month, year],
  );
  const totalIncomePrimary = breakdown.totalIncome;
  const totalExpensesPrimary = breakdown.totalExpenses;
  const totalBalancePrimary = breakdown.netBalance;

  // Secondary currencies (all except primary)
  const secondaryCurrencies = Object.entries(currencyTotals)
    .filter(([cur]) => cur !== primaryCurrency)
    .filter(([, totals]) => totals.income > 0 || totals.expenses > 0);

  const savingsRate = breakdown.totalIncome > 0
    ? (breakdown.netBalance / breakdown.totalIncome) * 100
    : 0;

  // Planned vs Actual for current month
  const currentMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
  const plannedVsActual = useMemo(
    () => calculatePlannedVsActual(data, currentMonth),
    [data, currentMonth],
  );

  // Upcoming planned expenses (next 30 days)
  const upcomingExpenses = useMemo(
    () => getUpcomingPlannedExpenses(data.plannedExpenses, now, 30),
    [data.plannedExpenses],
  );

  const STATUS_BADGE: Record<
    'excellent' | 'good' | 'fair' | 'needs_attention',
    { labelKey: string; classes: string }
  > = {
    excellent: { labelKey: 'status.excellent', classes: 'bg-green-500/20 text-green-400' },
    good: { labelKey: 'status.good', classes: 'bg-blue-500/20 text-blue-400' },
    fair: { labelKey: 'status.fair', classes: 'bg-yellow-500/20 text-yellow-400' },
    needs_attention: {
      labelKey: 'status.needsAttention',
      classes: 'bg-red-500/20 text-red-400',
    },
  };

  const badge = STATUS_BADGE[advice.status];

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <h1 className="text-2xl font-bold text-white">{t('dashboard.title')}</h1>

      {/* Top row - 4 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Balance */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{t('dashboard.totalBalance')}</span>
            <Wallet className="h-5 w-5 text-gray-500" />
          </div>
          <p
            className={`text-2xl font-bold ${
              totalBalancePrimary >= 0 ? 'text-accent-400' : 'text-danger-400'
            }`}
          >
            {formatCurrency(totalBalancePrimary, primaryCurrency)}
          </p>
          {secondaryCurrencies.map(([cur, totals]) => {
            const bal = totals.income - totals.expenses;
            return (
              <p key={cur} className={`text-xs ${bal >= 0 ? 'text-gray-400' : 'text-red-400'}`}>
                {formatCurrency(bal, cur)} ({cur})
              </p>
            );
          })}
          <p className="text-xs text-gray-500">{t('dashboard.thisMonth')}</p>
        </div>

        {/* Monthly Income */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{t('dashboard.monthlyIncome')}</span>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-400">
            {formatCurrency(totalIncomePrimary, primaryCurrency)}
          </p>
          {secondaryCurrencies.filter(([, t]) => t.income > 0).map(([cur, totals]) => (
            <p key={cur} className="text-xs text-gray-400">
              {formatCurrency(totals.income, cur)} ({cur})
            </p>
          ))}
          <p className="text-xs text-gray-500">{t('dashboard.thisMonth')}</p>
        </div>

        {/* Monthly Expenses */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{t('dashboard.monthlyExpenses')}</span>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-400">
            {formatCurrency(totalExpensesPrimary, primaryCurrency)}
          </p>
          {secondaryCurrencies.filter(([, t]) => t.expenses > 0).map(([cur, totals]) => (
            <p key={cur} className="text-xs text-gray-400">
              {formatCurrency(totals.expenses, cur)} ({cur})
            </p>
          ))}
          <p className="text-xs text-gray-500">{t('dashboard.thisMonth')}</p>
        </div>

        {/* Savings Rate */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{t('dashboard.savingsRate')}</span>
            <Target className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-400">
            {savingsRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500">{t('dashboard.goal')}: {advice.optimalSavingsRate}%</p>
        </div>
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Pie chart - Expenses by Category */}
        <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800">
          <h2 className="text-base font-semibold text-white mb-4">
            {t('dashboard.expensesByCategory')}
          </h2>
          {pieData.length > 0 ? (
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                    cursor="pointer"
                    onClick={(_, index) => {
                      const raw = pieData[index]?.rawCategory;
                      setSelectedCategory(prev => prev === raw ? null : raw);
                    }}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        opacity={selectedCategory && selectedCategory !== entry.rawCategory ? 0.3 : 1}
                        stroke={selectedCategory === entry.rawCategory ? '#fff' : 'none'}
                        strokeWidth={selectedCategory === entry.rawCategory ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} isAnimationActive={false} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-wrap sm:flex-col gap-x-3 gap-y-1.5 w-full sm:min-w-[130px] sm:w-auto">
                {pieData.map((entry) => {
                  const isSelected = selectedCategory === entry.rawCategory;
                  return (
                    <button
                      key={entry.rawCategory}
                      onClick={() => setSelectedCategory(prev => prev === entry.rawCategory ? null : entry.rawCategory)}
                      aria-pressed={isSelected}
                      className={`flex items-center gap-2 text-left transition-all ${
                        selectedCategory && !isSelected ? 'opacity-30' : ''
                      } ${isSelected ? 'font-semibold' : ''}`}
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className={`text-xs truncate ${isSelected ? 'text-gray-200' : 'text-gray-400'}`}>{entry.name}</span>
                      {isSelected && <X size={10} className="text-gray-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-gray-500 text-sm">
              {t('dashboard.noExpenseData')}
            </div>
          )}
        </div>

        {/* Savings Advisor */}
        <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">{t('dashboard.savingsAdvisor')}</h2>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.classes}`}
            >
              {t(badge.labelKey)}
            </span>
          </div>

          {/* 50/30/20 bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{t('advisor.needs')}</span>
              <span>{t('advisor.wants')}</span>
              <span>{t('advisor.savings')}</span>
            </div>
            <div className="flex rounded-full overflow-hidden h-3 bg-gray-800">
              {/* Needs segment */}
              <div
                className="bg-indigo-500 transition-all"
                style={{
                  width: `${Math.min(Math.max(advice.needsPercent, 0), 100)}%`,
                }}
                title={`${t('advisor.needs')}: ${advice.needsPercent.toFixed(1)}%`}
              />
              {/* Wants segment */}
              <div
                className="bg-pink-500 transition-all"
                style={{
                  width: `${Math.min(Math.max(advice.wantsPercent, 0), 100)}%`,
                }}
                title={`${t('advisor.wants')}: ${advice.wantsPercent.toFixed(1)}%`}
              />
              {/* Savings segment */}
              <div
                className="bg-emerald-500 transition-all"
                style={{
                  width: `${Math.min(Math.max(advice.savingsPercent, 0), 100)}%`,
                }}
                title={`${t('advisor.savings')}: ${advice.savingsPercent.toFixed(1)}%`}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{advice.needsPercent.toFixed(0)}%</span>
              <span>{advice.wantsPercent.toFixed(0)}%</span>
              <span>{advice.savingsPercent.toFixed(0)}%</span>
            </div>
          </div>

          {/* Target legend */}
          <div className="flex gap-4 text-xs text-gray-500 mb-4">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
              {t('advisor.target')} 50%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-pink-500" />
              {t('advisor.target')} 30%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              {t('advisor.target')} 20%
            </span>
          </div>

          {/* Tips */}
          <ul className="space-y-2">
            {advice.tips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <span className="text-gray-500 mt-0.5 shrink-0">&#8226;</span>
                {t(tip)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Planned vs Actual + Upcoming Expenses */}
      {(plannedVsActual.byCategory.length > 0 || upcomingExpenses.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Planned vs Actual */}
          {plannedVsActual.byCategory.length > 0 && (
            <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800">
              <h2 className="text-base font-semibold text-white mb-4">
                {t('planning.plannedVsActual')}
              </h2>
              <div className="space-y-2">
                {plannedVsActual.byCategory.map((item) => {
                  const color = CATEGORY_COLORS[item.category] || '#64748b';
                  const isOver = item.remaining < 0;
                  return (
                    <div key={item.category} className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm text-gray-300 w-24 truncate">{tc(item.category)}</span>
                      <div className="flex-1 flex items-center justify-end gap-2 text-xs">
                        <span className="text-gray-400">{formatCurrency(item.planned, primaryCurrency)}</span>
                        <span className="text-gray-600">/</span>
                        <span className="text-red-400">-{formatCurrency(item.actual, primaryCurrency)}</span>
                        <span
                          className={`font-semibold min-w-[60px] text-right ${
                            isOver ? 'text-red-400' : 'text-green-400'
                          }`}
                        >
                          {isOver ? '' : '+'}{formatCurrency(item.remaining, primaryCurrency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div className="border-t border-gray-800 pt-2 mt-2 flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-white/20" />
                  <span className="text-sm font-semibold text-white w-24">{t('planning.total')}</span>
                  <div className="flex-1 flex items-center justify-end gap-2 text-xs">
                    <span className="text-gray-300 font-semibold">{formatCurrency(plannedVsActual.totalPlanned, primaryCurrency)}</span>
                    <span className="text-gray-600">/</span>
                    <span className="text-red-400 font-semibold">-{formatCurrency(plannedVsActual.totalActual, primaryCurrency)}</span>
                    <span
                      className={`font-bold min-w-[60px] text-right ${
                        plannedVsActual.totalRemaining < 0 ? 'text-red-400' : 'text-green-400'
                      }`}
                    >
                      {plannedVsActual.totalRemaining < 0 ? '' : '+'}{formatCurrency(plannedVsActual.totalRemaining, primaryCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Expenses */}
          <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">
                {t('planning.upcoming')}
              </h2>
              <Link
                to="/planning"
                className="text-sm text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
              >
                {t('planning.viewAllPlanning')}
                <ArrowRight size={14} />
              </Link>
            </div>
            {upcomingExpenses.length > 0 ? (
              <div className="space-y-3">
                {upcomingExpenses.slice(0, 5).map((expense) => {
                  const expenseDate = new Date(expense.startDate);
                  const daysUntil = Math.ceil(
                    (expenseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                  );
                  const color = CATEGORY_COLORS[expense.category] || '#64748b';
                  return (
                    <div key={expense.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{expense.name}</p>
                          <p className="text-xs text-gray-500">{tc(expense.category)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="text-sm font-semibold text-gray-300">
                          {formatCurrency(expense.amount, expense.currency)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            daysUntil <= 3
                              ? 'bg-red-500/20 text-red-400'
                              : daysUntil <= 7
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          <Calendar size={10} className="inline mr-1" />
                          {daysUntil <= 0 ? t('planning.nextDue') : t('planning.daysUntil').replace('{days}', String(daysUntil))}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-6">
                {t('planning.noUpcomingExpenses')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bottom row - Recent Transactions */}
      <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white">
            {t('dashboard.recentTransactions')}
          </h2>
          <Link
            to="/transactions"
            className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
          >
            {t('dashboard.viewAll')}
          </Link>
        </div>

        {selectedCategory && (() => {
          const catColor = pieData.find(p => p.rawCategory === selectedCategory)?.color || '#64748b';
          return (
            <button
              onClick={() => setSelectedCategory(null)}
              className="inline-flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:opacity-80"
              style={{ backgroundColor: catColor + '25', color: catColor, border: `1px solid ${catColor}40` }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: catColor }} />
              {tc(selectedCategory)}
              <X size={12} />
            </button>
          );
        })()}

        {(selectedCategory || dashSearch) && (
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <Input
              type="text"
              value={dashSearch}
              onChange={(e) => setDashSearch(e.target.value)}
              placeholder={t('transactions.searchPlaceholder')}
              className="pl-8 text-xs"
            />
            {dashSearch && (
              <button onClick={() => setDashSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {recentTransactions.length > 0 ? (
          <div className="divide-y divide-gray-800">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                {/* Left: date + description + category */}
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                  <div className="text-xs text-gray-500 w-14 sm:w-20 shrink-0">
                    {formatDate(tx.date)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{tx.description}</p>
                    <p className="text-xs text-gray-500">{tc(tx.category)}</p>
                  </div>
                </div>

                {/* Right: amount */}
                <span
                  className={`text-sm font-semibold shrink-0 ml-4 ${
                    tx.type === 'income' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {tx.type === 'income' ? '+' : '-'}
                  {formatCurrency(tx.amount, tx.currency)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-6">
            {t('dashboard.noTransactions')}{' '}
            <Link to="/transactions" className="text-primary-400 hover:text-primary-300">
              {t('dashboard.addOne')}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
