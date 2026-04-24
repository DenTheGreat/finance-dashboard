import { useState, useMemo } from 'react';
import { Plus, Trash2, Calendar, Pencil, TrendingUp, TrendingDown } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

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

// ─── Pure helpers (unchanged) ────────────────────────────────────────────────

function MonthSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [y, m] = value.split('-').map(Number);
  const label = format(new Date(y, m - 1, 1), 'MMMM yyyy');
  const today = format(new Date(), 'yyyy-MM');

  function shift(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    onChange(format(d, 'yyyy-MM'));
  }

  return (
    <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => shift(-1)}
        className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        aria-label="Previous month"
      >
        ‹
      </button>
      <span className="px-4 py-2 text-white text-sm font-medium min-w-[130px] text-center select-none">
        {label}
      </span>
      <button
        onClick={() => shift(1)}
        className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        aria-label="Next month"
      >
        ›
      </button>
      <button
        onClick={() => onChange(today)}
        className={`px-2 py-1 mr-1 text-xs text-primary-400 hover:text-primary-300 border border-primary-500/30 rounded transition-colors ${value === today ? 'invisible' : ''}`}
        aria-label="Go to current month"
      >
        Today
      </button>
    </div>
  );
}

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  once: 'Once',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

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
  if (item.recurrence === 'once') return isBefore(start, now) ? null : start;
  let next = start;
  const end = item.endDate ? startOfDay(new Date(item.endDate)) : null;
  if (isAfter(start, now)) return start;
  let iterations = 0;
  while (isBefore(next, now) && iterations < 1200) {
    next = item.recurrence === 'monthly' ? addMonths(next, 1) : addYears(next, 1);
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
  if (item.recurrence === 'once') return itemStart >= monthStart && itemStart <= monthEnd;
  return true;
}

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
  transactions: PlanningProps['transactions'],
): boolean {
  if (!isApplicableToMonth(item, monthStr)) return false;
  const [year, month] = monthStr.split('-').map(Number);
  const monthStart = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
  const monthEnd = format(new Date(year, month, 0), 'yyyy-MM-dd');
  return transactions.some((tx) => {
    if (tx.date < monthStart || tx.date > monthEnd) return false;
    const amountMatch = Math.abs(tx.amount - item.amount) < 0.01;
    const descriptionMatch =
      tx.description.toLowerCase().includes(item.name.toLowerCase()) ||
      item.name.toLowerCase().includes(tx.description.toLowerCase());
    return amountMatch && descriptionMatch;
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; kind: Kind; name: string } | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm(primaryCurrency, 'expense'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

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

  const categoryOptions = modalKind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function renderCard(item: PlannedItem, kind: Kind) {
    const nextDue = getNextDueDate(item);
    const nextDueStr = formatNextDueDate(nextDue, formatDate);
    const isOverdue = nextDue && isBefore(nextDue, startOfDay(new Date()));
    const appliesToMonth = isApplicableToMonth(item, selectedMonth);
    const isPaid = appliesToMonth && isPaidInMonth(item, selectedMonth, transactions);
    const dotColor = item.isActive
      ? kind === 'income' ? '#34d399' : 'var(--color-primary-400, #a78bfa)'
      : '#4b5563';

    return (
      <div
        key={item.id}
        className={`bg-gray-900 rounded-xl p-5 border flex flex-col gap-3 transition-opacity ${
          item.isActive ? 'border-gray-800' : 'border-gray-800/50 opacity-60'
        } ${appliesToMonth ? 'ring-1 ring-primary-500/30' : ''}`}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
            <h3 className="text-white font-semibold truncate">{item.name}</h3>
            {appliesToMonth && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary-500/40 text-primary-400 bg-primary-500/10">
                Active
              </Badge>
            )}
            {appliesToMonth && (
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${
                  isPaid
                    ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                    : 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                }`}
              >
                {isPaid ? 'Paid' : 'Pending'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-600 hover:text-primary-400"
              onClick={() => openEditModal(item, kind)}
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-600 hover:text-red-400"
              onClick={() => setDeleteTarget({ id: item.id, kind, name: item.name })}
              aria-label={t('common.delete')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Amount + recurrence */}
        <div>
          <p className={`font-bold text-lg leading-tight ${kind === 'income' ? 'text-emerald-400' : 'text-white'}`}>
            {kind === 'income' ? '+' : ''}{formatCurrency(item.amount, item.currency)}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">{RECURRENCE_LABELS[item.recurrence]}</p>
        </div>

        {/* Category badge */}
        <Badge variant="secondary" className="w-fit text-xs bg-gray-800 text-gray-300 hover:bg-gray-800">
          {item.category}
        </Badge>

        {/* Next due */}
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

        {item.endDate && <p className="text-xs text-gray-500">Ends {formatDate(item.endDate)}</p>}
        {item.notes && <p className="text-gray-500 text-xs truncate">{item.notes}</p>}

        {/* Footer: active toggle + start date */}
        <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
          <button
            onClick={() => handleToggleActive(item, kind)}
            className="flex items-center gap-2 text-xs font-medium transition-colors"
          >
            <Switch
              checked={item.isActive}
              className="h-4 w-7 data-[state=checked]:bg-emerald-500"
              aria-label={item.isActive ? 'Active' : 'Paused'}
            />
            <span className={item.isActive ? 'text-emerald-400' : 'text-gray-500'}>
              {item.isActive ? 'Active' : 'Paused'}
            </span>
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
          <p className="text-gray-400 text-sm mt-1">Track expected income and recurring expenses</p>
        </div>
        <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
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
          <Button
            onClick={() => openAddModal('income')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Income</span>
            <span className="sm:hidden">{t('common.add')}</span>
          </Button>
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
          <Button
            onClick={() => openAddModal('expense')}
            className="bg-primary-600 hover:bg-primary-500 text-white shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Expense</span>
            <span className="sm:hidden">{t('common.add')}</span>
          </Button>
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

      {/* Add/Edit Dialog */}
      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) setEditingId(null); }}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingId
                ? modalKind === 'income' ? 'Edit Expected Income' : 'Edit Planned Expense'
                : modalKind === 'income' ? 'Add Expected Income' : 'Add Planned Expense'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-gray-300">Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder={modalKind === 'income' ? 'e.g. Main Salary, Freelance' : 'e.g. Rent, Netflix'}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-gray-300">Amount</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setField('amount', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-primary-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300">{t('form.currency')}</Label>
                <Select value={form.currency} onValueChange={(v) => setField('currency', v as Currency)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {(['USD', 'PLN', 'UAH'] as Currency[]).map((c) => (
                      <SelectItem key={c} value={c} className="text-white focus:bg-gray-700">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-gray-300">Category</Label>
                <Select value={form.category} onValueChange={(v) => setField('category', v)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-white focus:bg-gray-700">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300">Recurrence</Label>
                <Select value={form.recurrence} onValueChange={(v) => setField('recurrence', v as Recurrence)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="once" className="text-white focus:bg-gray-700">Once</SelectItem>
                    <SelectItem value="monthly" className="text-white focus:bg-gray-700">Monthly</SelectItem>
                    <SelectItem value="yearly" className="text-white focus:bg-gray-700">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-gray-300">Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setField('startDate', e.target.value)}
                  required
                  className="bg-gray-800 border-gray-700 text-white [color-scheme:dark] focus-visible:ring-primary-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300">
                  End Date <span className="text-gray-500 font-normal">(optional)</span>
                </Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setField('endDate', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white [color-scheme:dark] focus-visible:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setField('isActive', v)}
                className="data-[state=checked]:bg-primary-600"
              />
              <Label className="text-gray-300 cursor-pointer">
                {form.isActive ? 'Active' : 'Paused'}
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300">
                Notes <span className="text-gray-500 font-normal">(optional)</span>
              </Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Additional details..."
                rows={2}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none focus-visible:ring-primary-500"
              />
            </div>

            <DialogFooter className="gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowModal(false); setEditingId(null); }}
                className="flex-1 border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                className={`flex-1 text-white ${
                  modalKind === 'income'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-primary-600 hover:bg-primary-500'
                }`}
              >
                {editingId ? 'Save Changes' : modalKind === 'income' ? 'Add Income' : 'Add Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
