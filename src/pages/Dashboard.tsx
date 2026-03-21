import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Wallet, TrendingUp, TrendingDown, Target, X } from 'lucide-react';
import type { AppData, Transaction } from '../types';
import {
  getMonthlyBreakdown,
  getSavingsAdvice,
  getExpensesByCategory,
} from '../utils/advisor';
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

  // Monthly breakdown
  const breakdown = getMonthlyBreakdown(
    transactions,
    month,
    year,
    primaryCurrency,
    exchangeRate,
    settings.exchangeRates,
  );

  // Savings advice
  const advice = getSavingsAdvice(breakdown);

  // Expenses by category for pie chart
  const expensesByCategory = getExpensesByCategory(
    transactions,
    month,
    year,
    primaryCurrency,
    exchangeRate,
    settings.exchangeRates,
  );

  const pieData = expensesByCategory.map(({ category, amount, color }) => ({
    name: tc(category),
    value: amount,
    color,
    rawCategory: category,
  }));

  // Recent transactions (sorted newest first), filtered by selected category
  const filteredTransactions = selectedCategory
    ? transactions.filter((t) => t.category === selectedCategory)
    : transactions;
  const recentTransactions = [...filteredTransactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, selectedCategory ? 20 : 5);

  // Per-currency totals
  const currencyTotals = getCurrencyTotals(transactions, month, year);
  const usdTotals = currencyTotals.USD || { income: 0, expenses: 0 };
  const plnTotals = currencyTotals.PLN || { income: 0, expenses: 0 };
  const uahTotals = currencyTotals.UAH || { income: 0, expenses: 0 };
  const usdBalance = usdTotals.income - usdTotals.expenses;
  const plnBalance = plnTotals.income - plnTotals.expenses;
  const uahBalance = uahTotals.income - uahTotals.expenses;

  const savingsRate = breakdown.totalIncome > 0
    ? (breakdown.netBalance / breakdown.totalIncome) * 100
    : 0;

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
      <div className="grid grid-cols-4 gap-4">
        {/* Total Balance */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{t('dashboard.totalBalance')}</span>
            <Wallet className="h-5 w-5 text-gray-500" />
          </div>
          <p
            className={`text-2xl font-bold ${
              usdBalance >= 0 ? 'text-accent-400' : 'text-danger-400'
            }`}
          >
            {formatCurrency(usdBalance, 'USD')}
          </p>
          <p
            className={`text-sm font-semibold ${
              plnBalance >= 0 ? 'text-accent-400' : 'text-danger-400'
            }`}
          >
            {formatCurrency(plnBalance, 'PLN')}
          </p>
          {(uahTotals.income > 0 || uahTotals.expenses > 0) && (
            <p
              className={`text-sm font-semibold ${
                uahBalance >= 0 ? 'text-accent-400' : 'text-danger-400'
              }`}
            >
              {formatCurrency(uahBalance, 'UAH')}
            </p>
          )}
          <p className="text-xs text-gray-500">{t('dashboard.thisMonth')}</p>
        </div>

        {/* Monthly Income */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{t('dashboard.monthlyIncome')}</span>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-400">
            {formatCurrency(usdTotals.income, 'USD')}
          </p>
          {plnTotals.income > 0 && (
            <p className="text-sm font-semibold text-green-400">
              {formatCurrency(plnTotals.income, 'PLN')}
            </p>
          )}
          {uahTotals.income > 0 && (
            <p className="text-sm font-semibold text-green-400">
              {formatCurrency(uahTotals.income, 'UAH')}
            </p>
          )}
          <p className="text-xs text-gray-500">{t('dashboard.thisMonth')}</p>
        </div>

        {/* Monthly Expenses */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{t('dashboard.monthlyExpenses')}</span>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-400">
            {formatCurrency(usdTotals.expenses, 'USD')}
          </p>
          {plnTotals.expenses > 0 && (
            <p className="text-sm font-semibold text-red-400">
              {formatCurrency(plnTotals.expenses, 'PLN')}
            </p>
          )}
          {uahTotals.expenses > 0 && (
            <p className="text-sm font-semibold text-red-400">
              {formatCurrency(uahTotals.expenses, 'UAH')}
            </p>
          )}
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
      <div className="grid grid-cols-2 gap-6">
        {/* Pie chart - Expenses by Category */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-base font-semibold text-white mb-4">
            {t('dashboard.expensesByCategory')}
          </h2>
          {pieData.length > 0 ? (
            <div className="flex gap-4 items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
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
              <div className="flex flex-col gap-1.5 min-w-[130px]">
                {pieData.map((entry) => (
                  <button
                    key={entry.rawCategory}
                    onClick={() => setSelectedCategory(prev => prev === entry.rawCategory ? null : entry.rawCategory)}
                    className={`flex items-center gap-2 text-left transition-opacity ${
                      selectedCategory && selectedCategory !== entry.rawCategory ? 'opacity-30' : ''
                    }`}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs text-gray-400 truncate">{entry.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-500 text-sm">
              {t('dashboard.noExpenseData')}
            </div>
          )}
        </div>

        {/* Savings Advisor */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
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
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom row - Recent Transactions */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-white">
              {selectedCategory ? `${tc(selectedCategory)} ${t('dashboard.transactions')}` : t('dashboard.recentTransactions')}
            </h2>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-1 text-xs bg-gray-800 text-gray-400 hover:text-gray-200 px-2 py-1 rounded-full transition-colors"
              >
                {t('dashboard.clearFilter')}
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Link
            to="/transactions"
            className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
          >
            {t('dashboard.viewAll')}
          </Link>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="divide-y divide-gray-800">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                {/* Left: date + description + category */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="text-xs text-gray-500 w-20 shrink-0">
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
