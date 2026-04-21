import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, X, Calendar, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { addMonths, addYears, format, isBefore, isAfter, startOfDay } from 'date-fns';
import type { PlannedExpense, Currency, ExpenseCategory, Recurrence } from '../types';
import { EXPENSE_CATEGORIES } from '../types';
import { useI18n } from '../i18n';

interface PlanningProps {
  plannedExpenses: PlannedExpense[];
  primaryCurrency: Currency;
  onAddPlannedExpense: (expense: Omit<PlannedExpense, 'id'>) => void;
  onUpdatePlannedExpense: (id: string, updates: Partial<PlannedExpense>) => void;
  onDeletePlannedExpense: (id: string) => void;
}

interface FormState {
  name: string;
  amount: string;
  currency: Currency;
  category: ExpenseCategory;
  recurrence: Recurrence;
  startDate: string;
  endDate: string;
  isActive: boolean;
  notes: string;
}

const defaultForm = (primaryCurrency: Currency): FormState => ({
  name: '',
  amount: '',
  currency: primaryCurrency,
  category: 'Other',
  recurrence: 'monthly',
  startDate: format(new Date(), 'yyyy-MM-dd'),
  endDate: '',
  isActive: true,
  notes: '',
});

function getNextDueDate(expense: PlannedExpense): Date | null {
  if (!expense.isActive) return null;

  const start = startOfDay(new Date(expense.startDate));
  const now = startOfDay(new Date());

  if (expense.recurrence === 'once') {
    return isBefore(start, now) ? null : start;
  }

  let next = start;
  const end = expense.endDate ? startOfDay(new Date(expense.endDate)) : null;

  // If start is in the future, that's the next due date
  if (isAfter(start, now)) return start;

  // Advance until we find a date >= now
  const maxIterations = 1200; // safety limit (~100 years monthly)
  let iterations = 0;
  while (isBefore(next, now) && iterations < maxIterations) {
    if (expense.recurrence === 'monthly') {
      next = addMonths(next, 1);
    } else {
      next = addYears(next, 1);
    }
    iterations++;
  }

  // Check if past end date
  if (end && isAfter(next, end)) return null;

  return next;
}

function formatNextDueDate(date: Date | null, formatDate: (iso: string) => string): string {
  if (!date) return '—';
  return formatDate(format(date, 'yyyy-MM-dd'));
}

export default function Planning({
  plannedExpenses,
  primaryCurrency,
  onAddPlannedExpense,
  onUpdatePlannedExpense,
  onDeletePlannedExpense,
}: PlanningProps) {
  const { t, formatCurrency, formatDate } = useI18n();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm(primaryCurrency));

  const activeExpenses = useMemo(
    () => plannedExpenses.filter((e) => e.isActive),
    [plannedExpenses],
  );

  const totalMonthlyEstimate = useMemo(() => {
    return activeExpenses.reduce((sum, e) => {
      if (e.recurrence === 'monthly') return sum + e.amount;
      if (e.recurrence === 'yearly') return sum + e.amount / 12;
      return sum + e.amount;
    }, 0);
  }, [activeExpenses]);

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

  function openAddModal() {
    setForm(defaultForm('USD'));
    setEditingId(null);
    setShowModal(true);
  }

  function openEditModal(expense: PlannedExpense) {
    setForm({
      name: expense.name,
      amount: String(expense.amount),
      currency: expense.currency,
      category: expense.category,
      recurrence: expense.recurrence,
      startDate: expense.startDate,
      endDate: expense.endDate || '',
      isActive: expense.isActive,
      notes: expense.notes || '',
    });
    setEditingId(expense.id);
    setShowModal(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.name.trim() || isNaN(amount) || amount <= 0) return;

    if (editingId) {
      onUpdatePlannedExpense(editingId, {
        name: form.name.trim(),
        amount,
        currency: form.currency,
        category: form.category,
        recurrence: form.recurrence,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        isActive: form.isActive,
        notes: form.notes.trim() || undefined,
      });
    } else {
      onAddPlannedExpense({
        name: form.name.trim(),
        amount,
        currency: form.currency,
        category: form.category,
        recurrence: form.recurrence,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        isActive: form.isActive,
        notes: form.notes.trim() || undefined,
      });
    }

    setShowModal(false);
    setEditingId(null);
  }

  function handleToggleActive(expense: PlannedExpense) {
    onUpdatePlannedExpense(expense.id, { isActive: !expense.isActive });
  }

  function handleDelete(id: string) {
    onDeletePlannedExpense(id);
    setDeleteConfirmId(null);
  }

  const RECURRENCE_LABELS: Record<Recurrence, string> = {
    once: 'Once',
    monthly: 'Monthly',
    yearly: 'Yearly',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Planning</h1>
          <p className="text-gray-400 text-sm mt-1">
            Track recurring expenses and upcoming payments
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors shrink-0 min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Expense</span>
          <span className="sm:hidden">{t('common.add')}</span>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
          <div className="bg-primary-500/10 p-3 rounded-lg">
            <Calendar className="h-5 w-5 text-primary-400" />
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">Active Plans</p>
            <p className="text-white font-semibold text-lg mt-0.5">{activeExpenses.length}</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
          <div className="bg-emerald-500/10 p-3 rounded-lg">
            <span className="text-emerald-400 font-bold text-sm">{primaryCurrency === 'USD' ? '$' : primaryCurrency === 'PLN' ? 'zł' : '₴'}</span>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">Monthly Estimate</p>
            <p className="text-white font-semibold text-lg mt-0.5">
              {formatCurrency(totalMonthlyEstimate, primaryCurrency)}
            </p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
          <div className="bg-amber-500/10 p-3 rounded-lg">
            <span className="text-amber-400 font-bold text-sm">#</span>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">Total Plans</p>
            <p className="text-white font-semibold text-lg mt-0.5">{plannedExpenses.length}</p>
          </div>
        </div>
      </div>

      {/* Expense cards */}
      {plannedExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calendar className="h-14 w-14 text-gray-700 mb-4" />
          <p className="text-gray-400 text-lg font-medium">No planned expenses yet</p>
          <p className="text-gray-600 text-sm mt-1 mb-5">
            Add recurring expenses to track upcoming payments
          </p>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plannedExpenses.map((expense) => {
            const nextDue = getNextDueDate(expense);
            const nextDueStr = formatNextDueDate(nextDue, formatDate);
            const isOverdue = nextDue && isBefore(nextDue, startOfDay(new Date()));

            return (
              <div
                key={expense.id}
                className={`bg-gray-900 rounded-xl p-5 border flex flex-col gap-3 ${
                  expense.isActive ? 'border-gray-800' : 'border-gray-800/50 opacity-60'
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          expense.isActive ? 'var(--color-primary-400, #a78bfa)' : '#4b5563',
                      }}
                    />
                    <h3 className="text-white font-semibold truncate">{expense.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(expense)}
                      className="text-gray-600 hover:text-primary-400 transition-colors p-0.5"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {deleteConfirmId === expense.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(expense.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors p-0.5"
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <p className="text-white font-bold text-lg leading-tight">
                    {formatCurrency(expense.amount, expense.currency)}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {RECURRENCE_LABELS[expense.recurrence]}
                  </p>
                </div>

                {/* Category badge */}
                <div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-800 text-gray-300">
                    {expense.category}
                  </span>
                </div>

                {/* Next due date */}
                <div className="flex items-center gap-1.5 text-xs">
                  <Calendar className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                  {expense.isActive ? (
                    <span className={isOverdue ? 'text-red-400' : 'text-gray-400'}>
                      {nextDue ? `Next: ${nextDueStr}` : 'No upcoming date'}
                    </span>
                  ) : (
                    <span className="text-gray-500 italic">Paused</span>
                  )}
                </div>

                {/* End date */}
                {expense.endDate && (
                  <div className="text-xs text-gray-500">
                    Ends {formatDate(expense.endDate)}
                  </div>
                )}

                {/* Notes */}
                {expense.notes && (
                  <p className="text-gray-500 text-xs truncate">{expense.notes}</p>
                )}

                {/* Toggle active + footer */}
                <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleActive(expense)}
                    className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                  >
                    {expense.isActive ? (
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
                  <span className="text-gray-600 text-xs">
                    {formatDate(expense.startDate)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
        >
          <div className="w-full max-w-md bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
              <h2 className="text-white font-semibold text-lg">
                {editingId ? 'Edit Planned Expense' : 'Add Planned Expense'}
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

            {/* Modal form */}
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="e.g. Rent, Netflix, Car Insurance"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              {/* Amount + Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Amount
                  </label>
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

              {/* Category + Recurrence */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Category
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Recurrence
                  </label>
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

              {/* Start Date + End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Start Date
                  </label>
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

              {/* Active toggle */}
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
                <span className="text-sm text-gray-300">
                  {form.isActive ? 'Active' : 'Paused'}
                </span>
              </div>

              {/* Notes */}
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

              {/* Actions */}
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
                  className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {editingId ? 'Save Changes' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}