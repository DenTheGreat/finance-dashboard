import { useState, useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Plus, Trash2, Search, X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import type { AppData, Transaction } from '../types';
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  CATEGORY_COLORS,
} from '../types';
import { formatCurrency } from '../utils/currency';

interface TransactionsProps {
  data: AppData;
  onAdd: (tx: Omit<Transaction, 'id'>) => void;
  onDelete: (id: string) => void;
}

type FilterType = 'all' | 'income' | 'expense';

const INPUT_CLASS =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

function getLastTwelveMonths(): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    months.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy'),
    });
  }
  return months;
}

export default function Transactions({ data, onAdd, onDelete }: TransactionsProps) {
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Form state
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState<'USD' | 'PLN'>(
    data.settings.primaryCurrency
  );
  const [formCategory, setFormCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formExchangeRate, setFormExchangeRate] = useState(
    String(data.settings.exchangeRate)
  );

  const months = useMemo(() => getLastTwelveMonths(), []);

  const categories = formType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function resetForm() {
    setFormType('expense');
    setFormAmount('');
    setFormCurrency(data.settings.primaryCurrency);
    setFormCategory(EXPENSE_CATEGORIES[0]);
    setFormDescription('');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setFormExchangeRate(String(data.settings.exchangeRate));
  }

  function handleOpenForm() {
    resetForm();
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
  }

  function handleFormTypeChange(type: 'income' | 'expense') {
    setFormType(type);
    setFormCategory(type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
  }

  function handleSave() {
    const amount = parseFloat(formAmount);
    if (!formAmount || isNaN(amount) || amount <= 0) return;
    if (!formDate) return;

    const tx: Omit<Transaction, 'id'> = {
      type: formType,
      amount,
      currency: formCurrency,
      category: formCategory as Transaction['category'],
      description: formDescription.trim(),
      date: formDate,
    };

    if (formCurrency === 'PLN') {
      const rate = parseFloat(formExchangeRate);
      if (!isNaN(rate) && rate > 0) {
        tx.exchangeRateAtTime = rate;
      }
    }

    onAdd(tx);

    setShowForm(false);
    resetForm();
  }

  const filtered = useMemo(() => {
    let txs = [...data.transactions];

    if (filterType !== 'all') {
      txs = txs.filter((t) => t.type === filterType);
    }

    if (filterMonth !== 'all') {
      const [year, month] = filterMonth.split('-').map(Number);
      const refDate = new Date(year, month - 1, 1);
      const start = startOfMonth(refDate).toISOString().slice(0, 10);
      const end = endOfMonth(refDate).toISOString().slice(0, 10);
      txs = txs.filter((t) => t.date >= start && t.date <= end);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      txs = txs.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }

    txs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return txs;
  }, [data.transactions, filterType, filterMonth, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Transactions</h1>
        <button
          onClick={handleOpenForm}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={18} />
          Add Transaction
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Type toggles */}
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
          {(['all', 'income', 'expense'] as FilterType[]).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                filterType === t
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-gray-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Month selector */}
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="all">All Months</option>
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search by description or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-100"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Transaction list */}
      <div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <ArrowUpCircle size={40} className="mb-3 opacity-30" />
            <p className="text-lg font-medium">No transactions yet.</p>
            <p className="text-sm mt-1">Add your first one!</p>
          </div>
        ) : (
          filtered.map((tx) => {
            const isIncome = tx.type === 'income';
            const color = CATEGORY_COLORS[tx.category] ?? '#64748b';
            return (
              <div
                key={tx.id}
                onMouseEnter={() => setHoveredId(tx.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="bg-gray-900 rounded-lg p-4 mb-2 border border-gray-800 flex items-center gap-4 group"
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {isIncome ? (
                    <ArrowUpCircle size={22} className="text-green-400" />
                  ) : (
                    <ArrowDownCircle size={22} className="text-red-400" />
                  )}
                </div>

                {/* Date */}
                <div className="flex-shrink-0 w-24 text-sm text-gray-400">
                  {format(new Date(tx.date + 'T00:00:00'), 'MMM d, yyyy')}
                </div>

                {/* Category badge */}
                <div className="flex-shrink-0">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: color + '30', color }}
                  >
                    {tx.category}
                  </span>
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0 text-sm text-gray-200 truncate">
                  {tx.description || (
                    <span className="text-gray-500 italic">No description</span>
                  )}
                </div>

                {/* Amount */}
                <div className="flex-shrink-0 text-right">
                  <div
                    className={`font-semibold text-base ${
                      isIncome ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(tx.amount, tx.currency)}
                  </div>
                  {tx.currency === 'PLN' && tx.exchangeRateAtTime && (
                    <div className="text-xs text-gray-500">
                      ~{formatCurrency(tx.amount / tx.exchangeRateAtTime, 'USD')} @ {tx.exchangeRateAtTime.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => onDelete(tx.id)}
                  className={`flex-shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-all ${
                    hoveredId === tx.id ? 'opacity-100' : 'opacity-0'
                  }`}
                  aria-label="Delete transaction"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add Transaction Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseForm();
          }}
        >
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-100">Add Transaction</h2>
              <button
                onClick={handleCloseForm}
                className="text-gray-400 hover:text-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Type toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Type
                </label>
                <div className="flex bg-gray-900 rounded-lg p-1 gap-1">
                  <button
                    onClick={() => handleFormTypeChange('income')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                      formType === 'income'
                        ? 'bg-green-600 text-white'
                        : 'text-gray-400 hover:text-gray-100'
                    }`}
                  >
                    <ArrowUpCircle size={15} />
                    Income
                  </button>
                  <button
                    onClick={() => handleFormTypeChange('expense')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                      formType === 'expense'
                        ? 'bg-red-600 text-white'
                        : 'text-gray-400 hover:text-gray-100'
                    }`}
                  >
                    <ArrowDownCircle size={15} />
                    Expense
                  </button>
                </div>
              </div>

              {/* Amount + Currency row */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="w-28">
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Currency
                  </label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value as 'USD' | 'PLN')}
                    className={INPUT_CLASS}
                  >
                    <option value="USD">USD</option>
                    <option value="PLN">PLN</option>
                  </select>
                </div>
              </div>

              {/* Exchange Rate (PLN only) */}
              {formCurrency === 'PLN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Exchange Rate (USD→PLN)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formExchangeRate}
                    onChange={(e) => setFormExchangeRate(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className={INPUT_CLASS}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Optional description..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleSave}
                  disabled={!formAmount || parseFloat(formAmount) <= 0}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleCloseForm}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
