import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, X, Calendar, Pencil, ToggleLeft, ToggleRight, TrendingUp, TrendingDown } from 'lucide-react';
import { addMonths, addYears, format, isBefore, isAfter, startOfDay } from 'date-fns';
import type {
  PlannedExpense,
  PlannedIncome,
  Currency,
  ExpenseCategory,
  IncomeCategory,
  Recurrence,
} from '../types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';
import { convertCurrency, getCurrencySymbol } from '../utils/currency';
import { useI18n } from '../i18n';

interface PlanningProps {
  plannedExpenses: PlannedExpense[];
  plannedIncomes: PlannedIncome[];
  transactions: { id: string; amount: number; date: string; description: string; category: string; type: 'income' | 'expense' }[];
  primaryCurrency: Currency;
  exchangeRate: number;
  exchangeRates?: Record<string, number>;
  onAddPlannedExpense: (expense: Omit<PlannedExpense, 'id'>) => void;
  onUpdatePlannedExpense: (id: string, updates: Partial<PlannedExpense>) => void;
  onDeletePlannedExpense: (id: string) => void;
  onAddPlannedIncome: (income: Omit<PlannedIncome, 'id'>) => void;
  onUpdatePlannedIncome: (id: string, updates: Partial<PlannedIncome>) => void;
  onDeletePlannedIncome: (id: string) => void;
}

type Kind = 'income' | 'expense';

type PlannedItem = PlannedExpense | PlannedIncome;

interface FormState {
  name: string;
  amount: string;
  currency: Currency;
  category: string;
  recurrence: Recurrence;
  startDate: string;
  endDate: string;
  isActive: boolean;
  notes: string;
}

const defaultForm = (primaryCurrency: Currency, kind: Kind): FormState => ({
  name: '',
  amount: '',
  currency: primaryCurrency,
  category: kind === 'income' ? 'Salary' : 'Other',
  recurrence: 'monthly',
  startDate: format(new Date(), 'yyyy-MM-dd'),
  endDate: '',
  isActive: true,
  notes: '',
});

function getNextDueDate(item: PlannedItem): Date | null {
  if (!item.isActive) return null;

  const start = startOfDay(new Date(item.startDate));
  const now = startOfDay(new Date());

  if (item.recurrence === 'once') {
    return isBefore(start, now) ? null : start;
  }

  let next = start;
  const end = item.endDate ? startOfDay(new Date(item.endDate)) : null;

  if (isAfter(start, now)) return start;

  const maxIterations = 1200;
  let iterations = 0;
  while (isBefore(next, now) && iterations < maxIterations) {
    if (item.recurrence === 'monthly') {
      next = addMonths(next, 1);
    } else {
      next = addYears(next, 1);
    }
    iterations++;
  }

  if (end && isAfter(next, end)) return null;

  return next;
}

function formatNextDueDate(date: Date | null, formatDate: (iso: string) => string): string {
  if (!date) return '—';
  return formatDate(format(date, 'yyyy-MM-dd'));
}

function isApplicableToMonth(item: PlannedItem, monthStr: string): boolean {
  const [year, month] = monthStr.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const itemStart = new Date(item.startDate);
  const itemEnd = item.endDate ? new Date(item.endDate) : null;

  if (!item.isActive) return false;
  if (itemEnd && itemEnd < monthStart) return false;
  if (itemStart > monthEnd) return false;
  if (item.recurrence === 'once') {
    return itemStart >= monthStart && itemStart <= monthEnd;
  }

  return true;
}

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  once: 'Once',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

function monthlyEstimateForMonth(
  items: PlannedItem[],
  monthStr: string,
  primaryCurrency: Currency,
  exchangeRate: number,
  exchangeRates?: Record<string, number>,
): number {
  return items
    .filter((i) => isApplicableToMonth(i, monthStr))
    .reduce((sum, i) => {
      const converted = convertCurrency(i.amount, i.currency, primaryCurrency, exchangeRate, exchangeRates);
      if (i.recurrence === 'monthly') return sum + converted;
      if (i.recurrence === 'yearly') return sum + converted / 12;
      return sum + converted;
    }, 0);
}

function isPaidInMonth(
  item: PlannedItem,
  monthStr: string,
  transactions: PlanningProps['transactions']
): boolean {
  if (!isApplicableToMonth(item, monthStr)) return false;

  const [year, month] = monthStr.split('-').map(Number);
  const monthStart = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
  const monthEnd = format(new Date(year, month, 0), 'yyyy-MM-dd');

  return transactions.some((tx) => {
    if (tx.date < monthStart || tx.date > monthEnd) return false;
    const amountMatch = Math.abs(tx.amount - item.amount) < 0.01;
    const descriptionMatch = tx.description.toLowerCase().includes(item.name.toLowerCase()) ||
      item.name.toLowerCase().includes(tx.description.toLowerCase());
    return amountMatch && descriptionMatch;
  });
}

export default function Planning({
  plannedExpenses,
  plannedIncomes,
  transactions,
  primaryCurrency,
  exchangeRate,
  exchangeRates,
  onAddPlannedExpense,
  onUpdatePlannedExpense,
  onDeletePlannedExpense,
  onAddPlannedIncome,
  onUpdatePlannedIncome,
  onDeletePlannedIncome,
}: PlanningProps) {
  const { t, formatCurrency, formatDate } = useI18n();
  const [showModal, setShowModal] = useState(false);
  const [modalKind, setModalKind] = useState<Kind>('expense');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; kind: Kind } | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm(primaryCurrency, 'expense'));
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  const monthlyExpenseEstimate = useMemo(
    () => monthlyEstimateForMonth(plannedExpenses, selectedMonth, primaryCurrency, exchangeRate, exchangeRates),
    [plannedExpenses, selectedMonth, primaryCurrency, exchangeRate, exchangeRates]
  );
  const monthlyIncomeEstimate = useMemo(
    () => monthlyEstimateForMonth(plannedIncomes, selectedMonth, primaryCurrency, exchangeRate, exchangeRates),
    [plannedIncomes, selectedMonth, primaryCurrency, exchangeRate, exchangeRates]
  );
  const monthlyNet = monthlyIncomeEstimate - monthlyExpenseEstimate;

  const handleMonthChange = (value: string) => {
    if (value) setSelectedMonth(value);
  };

  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setEditingId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showModal]);

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  function openAddModal(kind: Kind) {
    setModalKind(kind);
    setForm(defaultForm(primaryCurrency, kind));
    setEditingId(null);
    setShowModal(true);
  }

  function openEditModal(item: PlannedItem, kind: Kind) {
    setModalKind(kind);
    setForm({
      name: item.name,
      amount: String(item.amount),
      currency: item.currency,
      category: item.category,
      recurrence: item.recurrence,
      startDate: item.startDate,
      endDate: item.endDate || '',
      isActive: item.isActive,
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setShowModal(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.name.trim() || isNaN(amount) || amount <= 0) return;

    const base = {
      name: form.name.trim(),
      amount,
      currency: form.currency,
      recurrence: form.recurrence,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      isActive: form.isActive,
      notes: form.notes.trim() || undefined,
    };

    if (modalKind === 'income') {
      const payload = { ...base, category: form.category as IncomeCategory };
      if (editingId) onUpdatePlannedIncome(editingId, payload);
      else onAddPlannedIncome(payload);
    } else {
      const payload = { ...base, category: form.category as ExpenseCategory };
      if (editingId) onUpdatePlannedExpense(editingId, payload);
      else onAddPlannedExpense(payload);
    }

    setShowModal(false);
    setEditingId(null);
  }

  function handleToggleActive(item: PlannedItem, kind: Kind) {
    if (kind === 'income') onUpdatePlannedIncome(item.id, { isActive: !item.isActive });
    else onUpdatePlannedExpense(item.id, { isActive: !item.isActive });
  }

  function handleDelete(id: string, kind: Kind) {
    if (kind === 'income') onDeletePlannedIncome(id);
    else onDeletePlannedExpense(id);
    setDeleteConfirm(null);
  }

  const categoryOptions = modalKind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const currencySymbol = getCurrencySymbol(primaryCurrency);

  function renderCard(item: PlannedItem, kind: Kind) {
    const nextDue = getNextDueDate(item);
    const nextDueStr = formatNextDueDate(nextDue, formatDate);
    const isOverdue = nextDue && isBefore(nextDue, startOfDay(new Date()));
    const appliesToMonth = isApplicableToMonth(item, selectedMonth);
    const isPaid = appliesToMonth && isPaidInMonth(item, selectedMonth, transactions);
    const accent = kind === 'income' ? 'text-emerald-400' : 'text-white';
    const dotColor = item.isActive
      ? kind === 'income'
        ? '#34d399'
        : 'var(--color-primary-400, #a78bfa)'
      : '#4b5563';
    const isConfirming = deleteConfirm?.id === item.id && deleteConfirm?.kind === kind;

    return (
      <div
        key={item.id}
        className={`bg-gray-900 rounded-xl p-5 border flex flex-col gap-3 ${
          item.isActive ? 'border-gray-800' : 'border-gray-800/50 opacity-60'
        } ${appliesToMonth ? 'ring-1 ring-primary-500/30' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: dotColor }}
            />
            <h3 className="text-white font-semibold truncate">{item.name}</h3>
            {appliesToMonth && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-primary-500/20 text-primary-400">
                Active
              </span>
            )}
            {appliesToMonth && (
              <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {isPaid ? 'Paid' : 'Pending'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => openEditModal(item, kind)}
              className="text-gray-600 hover:text-primary-400 transition-colors p-0.5"
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {isConfirming ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDelete(item.id, kind)}
                  className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm({ id: item.id, kind })}
                className="text-gray-600 hover:text-red-400 transition-colors p-0.5"
                aria-label={t('common.delete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div>
          <p className={`font-bold text-lg leading-tight ${accent}`}>
            {kind === 'income' ? '+' : ''}{formatCurrency(item.amount, item.currency)}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">{RECURRENCE_LABELS[item.recurrence]}</p>
        </div>

        <div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-800 text-gray-300">
            {item.category}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <Calendar className="h-3.5 w-3.5 text-gray-500 shrink-0" />
          {item.isActive ? (
            <span className={isOverdue ? 'text-red-400' : 'text-gray-400'}>
              {nextDue ? `Next: ${nextDueStr}` : 'No upcoming date'}
            </span>
          ) : (
            <span className="text-gray-500 italic">Paused</span>
          )}
        </div>

        {item.endDate && (
          <div className="text-xs text-gray-500">Ends {formatDate(item.endDate)}</div>
        )}

        {item.notes && <p className="text-gray-500 text-xs truncate">{item.notes}</p>}

        <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
          <button
            onClick={() => handleToggleActive(item, kind)}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            {item.isActive ? (
              <>
                <ToggleRight className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400">Active</span>
              </>
            ) : (
              <>
                <ToggleLeft className="h-4 w-4 text-gray-500" />
                <span className="text-gray-500">Paused</span>
              </>
            )}
          </button>
          <span className="text-gray-600 text-xs">{formatDate(item.startDate)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Planning</h1>
          <p className="text-gray-400 text-sm mt-1">
            Track expected income and recurring expenses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm">Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
          <div className="bg-emerald-500/10 p-3 rounded-lg">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">Monthly Income</p>
            <p className="text-emerald-400 font-semibold text-lg mt-0.5">
              {formatCurrency(monthlyIncomeEstimate, primaryCurrency)}
            </p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
          <div className="bg-red-500/10 p-3 rounded-lg">
            <TrendingDown className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">Monthly Expenses</p>
            <p className="text-white font-semibold text-lg mt-0.5">
              {formatCurrency(monthlyExpenseEstimate, primaryCurrency)}
            </p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
          <div className={`p-3 rounded-lg ${monthlyNet >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            <span className={`font-bold text-sm ${monthlyNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {currencySymbol}
            </span>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">Monthly Net</p>
            <p className={`font-semibold text-lg mt-0.5 ${monthlyNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(monthlyNet, primaryCurrency)}
            </p>
          </div>
        </div>
      </div>

      {/* Income section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Expected Income
            <span className="text-gray-500 text-sm font-normal">({plannedIncomes.length})</span>
          </h2>
          <button
            onClick={() => openAddModal('income')}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors shrink-0 min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Income</span>
            <span className="sm:hidden">{t('common.add')}</span>
          </button>
        </div>

        {plannedIncomes.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-800 rounded-xl py-8 text-center">
            <p className="text-gray-500 text-sm">No expected income yet. Add your salary or other recurring income.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plannedIncomes.map((item) => renderCard(item, 'income'))}
          </div>
        )}
      </section>

      {/* Expense section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-400" />
            Planned Expenses
            <span className="text-gray-500 text-sm font-normal">({plannedExpenses.length})</span>
          </h2>
          <button
            onClick={() => openAddModal('expense')}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors shrink-0 min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Expense</span>
            <span className="sm:hidden">{t('common.add')}</span>
          </button>
        </div>

        {plannedExpenses.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-800 rounded-xl py-8 text-center">
            <p className="text-gray-500 text-sm">No planned expenses yet. Add recurring expenses to track upcoming payments.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plannedExpenses.map((item) => renderCard(item, 'expense'))}
          </div>
        )}
      </section>

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
        >
          <div className="w-full max-w-md bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
              <h2 className="text-white font-semibold text-lg">
                {editingId
                  ? modalKind === 'income'
                    ? 'Edit Expected Income'
                    : 'Edit Planned Expense'
                  : modalKind === 'income'
                    ? 'Add Expected Income'
                    : 'Add Planned Expense'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                }}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder={
                    modalKind === 'income'
                      ? 'e.g. Main Salary, Freelance, Rental'
                      : 'e.g. Rent, Netflix, Car Insurance'
                  }
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    {t('form.currency')}
                  </label>
                  <select
                    name="currency"
                    value={form.currency}
                    onChange={handleFormChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
                  >
                    <option value="USD">USD</option>
                    <option value="PLN">PLN</option>
                    <option value="UAH">UAH</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Recurrence</label>
                  <select
                    name="recurrence"
                    value={form.recurrence}
                    onChange={handleFormChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
                  >
                    <option value="once">Once</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleFormChange}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    End Date <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleFormChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={form.isActive}
                    onChange={handleFormChange}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
                </label>
                <span className="text-sm text-gray-300">{form.isActive ? 'Active' : 'Paused'}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Notes <span className="text-gray-500">(optional)</span>
                </label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  placeholder="Additional details..."
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-primary-500 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-colors ${
                    modalKind === 'income'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-primary-600 hover:bg-primary-500'
                  }`}
                >
                  {editingId ? 'Save Changes' : modalKind === 'income' ? 'Add Income' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
