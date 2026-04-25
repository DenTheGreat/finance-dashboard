import { useState, useMemo } from 'react';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import type { PlannedExpense, PlannedIncome, Currency, ExpenseCategory, IncomeCategory } from '../types';
import { getCurrencySymbol } from '../utils/currency';
import { useI18n } from '../i18n';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import MonthSelector from './planning/MonthSelector';
import PlanningCard from './planning/PlanningCard';
import PlanningFormDialog from './planning/PlanningFormDialog';
import {
  defaultForm,
  monthlyEstimateForMonth,
  isApplicableToMonth,
  type Kind,
  type FormState,
  type DeleteTarget,
  type PlannedItem,
  type TransactionList,
} from './planning/helpers';

interface PlanningProps {
  plannedExpenses: PlannedExpense[];
  plannedIncomes: PlannedIncome[];
  transactions: TransactionList;
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
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm(primaryCurrency, 'expense'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [showAllIncomes, setShowAllIncomes] = useState(false);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('');
  const [incomeCategoryFilter, setIncomeCategoryFilter] = useState('');

  const monthlyExpenseEstimate = useMemo(
    () => monthlyEstimateForMonth(plannedExpenses, selectedMonth, primaryCurrency, exchangeRate, exchangeRates),
    [plannedExpenses, selectedMonth, primaryCurrency, exchangeRate, exchangeRates],
  );
  const monthlyIncomeEstimate = useMemo(
    () => monthlyEstimateForMonth(plannedIncomes, selectedMonth, primaryCurrency, exchangeRate, exchangeRates),
    [plannedIncomes, selectedMonth, primaryCurrency, exchangeRate, exchangeRates],
  );
  const monthlyNet = monthlyIncomeEstimate - monthlyExpenseEstimate;
  const currencySymbol = getCurrencySymbol(primaryCurrency);

  const filteredExpenses = useMemo(() => {
    let list = showAllExpenses ? plannedExpenses : plannedExpenses.filter((i) => isApplicableToMonth(i, selectedMonth));
    if (expenseCategoryFilter) list = list.filter((i) => i.category === expenseCategoryFilter);
    return list;
  }, [plannedExpenses, showAllExpenses, selectedMonth, expenseCategoryFilter]);

  const filteredIncomes = useMemo(() => {
    let list = showAllIncomes ? plannedIncomes : plannedIncomes.filter((i) => isApplicableToMonth(i, selectedMonth));
    if (incomeCategoryFilter) list = list.filter((i) => i.category === incomeCategoryFilter);
    return list;
  }, [plannedIncomes, showAllIncomes, selectedMonth, incomeCategoryFilter]);

  const expenseCategories = useMemo(
    () => [...new Set(plannedExpenses.map((i) => i.category))].sort(),
    [plannedExpenses],
  );
  const incomeCategories = useMemo(
    () => [...new Set(plannedIncomes.map((i) => i.category))].sort(),
    [plannedIncomes],
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'income') onDeletePlannedIncome(deleteTarget.id);
    else onDeletePlannedExpense(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Planning</h1>
          <p className="text-gray-400 text-sm mt-1">Track expected income and recurring expenses</p>
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
            <span className="text-gray-500 text-sm font-normal">
              ({filteredIncomes.length}{!showAllIncomes || incomeCategoryFilter ? `/${plannedIncomes.length}` : ''})
            </span>
          </h2>
          <Button
            onClick={() => openAddModal('income')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Income</span>
            <span className="sm:hidden">{t('common.add')}</span>
          </Button>
        </div>
        {plannedIncomes.length > 0 && (
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
              <Switch
                checked={showAllIncomes}
                onCheckedChange={setShowAllIncomes}
                className="data-[state=checked]:bg-emerald-600"
              />
              Show all
            </label>
            {incomeCategories.length > 1 && (
              <select
                value={incomeCategoryFilter}
                onChange={(e) => setIncomeCategoryFilter(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">All categories</option>
                {incomeCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>
        )}
        {plannedIncomes.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-800 rounded-xl py-8 text-center">
            <p className="text-gray-500 text-sm">No expected income yet. Add your salary or other recurring income.</p>
          </div>
        ) : filteredIncomes.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-800 rounded-xl py-8 text-center">
            <p className="text-gray-500 text-sm">No income matches the current filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIncomes.map((item) => (
              <PlanningCard
                key={item.id}
                item={item}
                kind="income"
                selectedMonth={selectedMonth}
                transactions={transactions}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                t={t}
                onEdit={openEditModal}
                onDelete={setDeleteTarget}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        )}
      </section>

      {/* Expense section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-400" />
            Planned Expenses
            <span className="text-gray-500 text-sm font-normal">
              ({filteredExpenses.length}{!showAllExpenses || expenseCategoryFilter ? `/${plannedExpenses.length}` : ''})
            </span>
          </h2>
          <Button
            onClick={() => openAddModal('expense')}
            className="bg-primary-600 hover:bg-primary-500 text-white shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Expense</span>
            <span className="sm:hidden">{t('common.add')}</span>
          </Button>
        </div>
        {plannedExpenses.length > 0 && (
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
              <Switch
                checked={showAllExpenses}
                onCheckedChange={setShowAllExpenses}
                className="data-[state=checked]:bg-primary-600"
              />
              Show all
            </label>
            {expenseCategories.length > 1 && (
              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All categories</option>
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>
        )}
        {plannedExpenses.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-800 rounded-xl py-8 text-center">
            <p className="text-gray-500 text-sm">No planned expenses yet. Add recurring expenses to track upcoming payments.</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-800 rounded-xl py-8 text-center">
            <p className="text-gray-500 text-sm">No expenses match the current filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExpenses.map((item) => (
              <PlanningCard
                key={item.id}
                item={item}
                kind="expense"
                selectedMonth={selectedMonth}
                transactions={transactions}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                t={t}
                onEdit={openEditModal}
                onDelete={setDeleteTarget}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        )}
      </section>

      <PlanningFormDialog
        open={showModal}
        onOpenChange={(open) => { setShowModal(open); if (!open) setEditingId(null); }}
        modalKind={modalKind}
        editingId={editingId}
        form={form}
        setField={setField}
        onSave={handleSave}
        t={t}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will permanently remove this planned {deleteTarget?.kind}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
