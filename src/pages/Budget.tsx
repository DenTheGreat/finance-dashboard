import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Target, Check, X, Plus } from 'lucide-react';
import type { AppData, ExpenseCategory } from '../types';
import { EXPENSE_CATEGORIES, CATEGORY_COLORS } from '../types';
import { convertCurrency, getCurrencySymbol } from '../utils/currency';
import { useI18n } from '../i18n';
import MonthSelector from './planning/MonthSelector';
import { Input } from '@/components/ui/input';

interface BudgetProps {
  data: AppData;
  onSetBudget: (month: string, category: ExpenseCategory, amount: number) => void;
}

export default function Budget({ data, onSetBudget }: BudgetProps) {
  const { formatCurrency } = useI18n();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { primaryCurrency, exchangeRate, exchangeRates } = data.settings;
  const symbol = getCurrencySymbol(primaryCurrency);

  // Compute actual spending per category for selected month
  const actualByCategory = useMemo(() => {
    const result: Record<string, number> = {};
    for (const tx of data.transactions) {
      if (tx.type !== 'expense') continue;
      if (!tx.date.startsWith(selectedMonth)) continue;
      const converted = convertCurrency(tx.amount, tx.currency, primaryCurrency, exchangeRate, exchangeRates);
      result[tx.category] = (result[tx.category] ?? 0) + converted;
    }
    return result;
  }, [data.transactions, selectedMonth, primaryCurrency, exchangeRate, exchangeRates]);

  // Budget map for selected month
  const budgetByCategory = useMemo(() => {
    const result: Record<string, number> = {};
    for (const b of data.monthlyBudgets) {
      if (b.month === selectedMonth) result[b.category] = b.amount;
    }
    return result;
  }, [data.monthlyBudgets, selectedMonth]);

  // Rows: include any category with budget OR spending
  const rows = useMemo(() => {
    const cats = new Set<string>();
    for (const c of EXPENSE_CATEGORIES) {
      if (budgetByCategory[c] || actualByCategory[c]) cats.add(c);
    }
    // Also include any non-builtin custom category that had spending
    for (const c of Object.keys(actualByCategory)) cats.add(c);
    return [...cats].sort((a, b) => (budgetByCategory[b] ?? 0) - (budgetByCategory[a] ?? 0));
  }, [budgetByCategory, actualByCategory]);

  const totalBudgeted = Object.values(budgetByCategory).reduce((s, v) => s + v, 0);
  const totalSpent = Object.values(actualByCategory).reduce((s, v) => s + v, 0);

  function startEdit(category: string, current: number) {
    setEditing(category);
    setEditValue(current ? String(current) : '');
  }

  function commitEdit(category: string) {
    const amount = parseFloat(editValue);
    if (!isNaN(amount) && amount >= 0) {
      onSetBudget(selectedMonth, category as ExpenseCategory, amount);
    }
    setEditing(null);
    setEditValue('');
  }

  function cancelEdit() {
    setEditing(null);
    setEditValue('');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex items-center gap-3">
          <Target className="h-6 w-6 sm:h-7 sm:w-7 text-primary-400" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Budget</h1>
            <p className="text-gray-400 text-sm mt-1">Set monthly targets per category</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
          {selectedMonth !== format(new Date(), 'yyyy-MM') && (
            <button
              onClick={() => setSelectedMonth(format(new Date(), 'yyyy-MM'))}
              className="px-2 py-1 text-xs text-primary-400 hover:text-primary-300 border border-primary-500/30 rounded transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-wide">Total Budgeted</p>
          <p className="text-white font-semibold text-lg mt-1">
            {formatCurrency(totalBudgeted, primaryCurrency)}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-wide">Total Spent</p>
          <p className="text-red-400 font-semibold text-lg mt-1">
            {formatCurrency(totalSpent, primaryCurrency)}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-wide">Remaining</p>
          <p className={`font-semibold text-lg mt-1 ${totalBudgeted - totalSpent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(totalBudgeted - totalSpent, primaryCurrency)}
          </p>
        </div>
      </div>

      {/* Rows */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
        {rows.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">
            No budgets or spending yet for this month. Try a different month or start tracking expenses.
          </div>
        ) : (
          rows.map((category) => {
            const budget = budgetByCategory[category] ?? 0;
            const actual = actualByCategory[category] ?? 0;
            const color = CATEGORY_COLORS[category] ?? '#64748b';
            const hasBudget = budget > 0;
            const isOver = hasBudget && actual > budget;
            const pct = hasBudget ? Math.min((actual / budget) * 100, 100) : 0;
            const isEditing = editing === category;

            return (
              <div key={category} className="p-4 sm:p-5">
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-medium text-white min-w-0 flex-1 truncate">
                    {category}
                  </span>

                  {/* Budget */}
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">{symbol}</span>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit(category);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        onBlur={() => commitEdit(category)}
                        className="w-24 h-8 text-sm"
                      />
                      <button
                        onMouseDown={(e) => { e.preventDefault(); commitEdit(category); }}
                        className="text-emerald-400 hover:text-emerald-300 p-1"
                        aria-label="Save"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); cancelEdit(); }}
                        className="text-gray-400 hover:text-gray-200 p-1"
                        aria-label="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : hasBudget ? (
                    <button
                      onClick={() => startEdit(category, budget)}
                      className="text-sm text-gray-300 hover:text-primary-300 px-2 py-1 rounded hover:bg-gray-800 transition-colors"
                    >
                      {formatCurrency(budget, primaryCurrency)}
                    </button>
                  ) : (
                    <button
                      onClick={() => startEdit(category, 0)}
                      className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 border border-primary-500/30 rounded px-2 py-1 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Set budget
                    </button>
                  )}

                  {isOver && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-900/40 text-red-400 border border-red-800">
                      Over budget
                    </span>
                  )}
                </div>

                {/* Spent + Progress */}
                <div className="mt-3 ml-6">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                    <span>
                      Spent: <span className={isOver ? 'text-red-400 font-semibold' : 'text-gray-300'}>
                        {formatCurrency(actual, primaryCurrency)}
                      </span>
                    </span>
                    {hasBudget && (
                      <span className={isOver ? 'text-red-400' : 'text-gray-500'}>
                        {((actual / budget) * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  {hasBudget && (
                    <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
                      <div
                        className={`h-full transition-all ${isOver ? 'bg-red-500' : 'bg-primary-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {rows.length > 0 && (
        <div className="text-xs text-gray-500 text-center">
          Click any budget amount to edit. Press Enter to save, Esc to cancel.
        </div>
      )}

    </div>
  );
}
