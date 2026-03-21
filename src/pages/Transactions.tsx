import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import {
  Plus,
  Trash2,
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  ChevronDown,
  ChevronRight,
  Check,
} from 'lucide-react';
import type { AppData, Transaction } from '../types';
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  CATEGORY_COLORS,
} from '../types';
import { convertCurrency } from '../utils/currency';
import { useI18n } from '../i18n';

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

interface TransactionsProps {
  data: AppData;
  onAdd: (tx: Omit<Transaction, 'id'>) => void;
  onDelete: (id: string) => void;
  onUpdateCategory: (id: string, category: string) => void;
  onAddRule: (keyword: string, category: string) => void;
  onBulkDelete: (ids: Set<string>) => void;
  onBulkUpdateCategory: (ids: Set<string>, category: string) => void;
}

type SortCol = 'date' | 'description' | 'category' | 'amount' | 'currency' | 'type';
type SortDir = 'asc' | 'desc' | 'none';
type GroupBy = 'none' | 'category' | 'merchant' | 'month';

interface ColFilters {
  description: string;
  categories: Set<string>;
  types: Set<string>;
  currencies: Set<string>;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
}

const EMPTY_FILTERS: ColFilters = {
  description: '',
  categories: new Set(),
  types: new Set(),
  currencies: new Set(),
  dateFrom: '',
  dateTo: '',
  amountMin: '',
  amountMax: '',
};

const INPUT_CLASS =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

// Shared grid template for aligned columns:
// checkbox(36px) | date(110px) | description(1fr) | category(140px) | amount(120px) | saldo(100px) | cur(50px) | type(80px) | del(36px)
const GRID_COLS = 'grid grid-cols-[36px_110px_1fr_140px_120px_100px_50px_80px_36px] items-center min-h-[44px]';

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function merchantFromDesc(desc: string): string {
  if (!desc) return 'Unknown';
  return desc.split(/\s+/).slice(0, 2).join(' ');
}

function monthKey(iso: string): string {
  return iso.slice(0, 7); // "YYYY-MM"
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return format(new Date(Number(y), Number(m) - 1, 1), 'MMMM yyyy');
}

// ---------------------------------------------------------------------------
// FilterDropdown component
// ---------------------------------------------------------------------------

interface FilterDropdownProps {
  column: SortCol;
  filters: ColFilters;
  setFilters: (f: ColFilters) => void;
  transactions: Transaction[];
  active: boolean;
}

function FilterDropdown({ column, filters, setFilters, transactions, active }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t, tc } = useI18n();

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((v) => !v);
  };

  function CheckboxList({
    items,
    selected,
    onChange,
    renderLabel,
  }: {
    items: string[];
    selected: Set<string>;
    onChange: (next: Set<string>) => void;
    renderLabel?: (item: string) => string;
  }) {
    const allChecked = items.every((i) => selected.has(i));
    return (
      <div className="space-y-1">
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none hover:text-gray-200">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={() => {
              if (allChecked) onChange(new Set());
              else onChange(new Set(items));
            }}
            className="accent-primary-500"
          />
          {allChecked ? t('transactions.deselectAll') : t('transactions.selectAll')}
        </label>
        <div className="border-t border-gray-700 pt-1 space-y-1 max-h-40 overflow-y-auto">
          {items.map((item) => (
            <label
              key={item}
              className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none hover:text-gray-100"
            >
              <input
                type="checkbox"
                checked={selected.has(item)}
                onChange={() => {
                  const next = new Set(selected);
                  if (next.has(item)) next.delete(item);
                  else next.add(item);
                  onChange(next);
                }}
                className="accent-primary-500"
              />
              {renderLabel ? renderLabel(item) : item}
            </label>
          ))}
        </div>
      </div>
    );
  }

  function renderContent() {
    if (column === 'description') {
      return (
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            autoFocus
            type="text"
            placeholder={t('filter.search')}
            value={filters.description}
            onChange={(e) => setFilters({ ...filters, description: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 pl-6 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      );
    }
    if (column === 'category') {
      const avail = Array.from(new Set(transactions.map((t) => t.category))).sort();
      return (
        <CheckboxList
          items={avail}
          selected={filters.categories}
          onChange={(next) => setFilters({ ...filters, categories: next })}
          renderLabel={(item) => tc(item)}
        />
      );
    }
    if (column === 'type') {
      return (
        <CheckboxList
          items={['income', 'expense']}
          selected={filters.types}
          onChange={(next) => setFilters({ ...filters, types: next })}
          renderLabel={(item) => t(`transactions.${item}`)}
        />
      );
    }
    if (column === 'currency') {
      const avail = Array.from(new Set(transactions.map((t) => t.currency))).sort();
      return (
        <CheckboxList
          items={avail}
          selected={filters.currencies}
          onChange={(next) => setFilters({ ...filters, currencies: next })}
        />
      );
    }
    if (column === 'date') {
      return (
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-400 block mb-1">{t('filter.from')}</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">{t('filter.to')}</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      );
    }
    if (column === 'amount') {
      return (
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-400 block mb-1">{t('filter.min')}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={filters.amountMin}
              onChange={(e) => setFilters({ ...filters, amountMin: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">{t('filter.max')}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder={t('filter.noLimit')}
              value={filters.amountMax}
              onChange={(e) => setFilters({ ...filters, amountMax: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={toggle}
        className={`p-0.5 rounded transition-colors ${
          active
            ? 'text-primary-400 bg-primary-900/40'
            : 'text-gray-600 hover:text-gray-300'
        }`}
        title={t('filter.filterBy', { column })}
      >
        <Filter size={11} />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 w-52">
          {renderContent()}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Transactions({ data, onAdd, onDelete, onUpdateCategory, onAddRule, onBulkDelete, onBulkUpdateCategory }: TransactionsProps) {
  const { t, tc, formatDate, formatCurrency } = useI18n();

  // --- Sort state ---
  const [sortCol, setSortCol] = useState<SortCol>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // --- Per-column filters ---
  const [filters, setFilters] = useState<ColFilters>({ ...EMPTY_FILTERS, categories: new Set(), types: new Set(), currencies: new Set() });

  // --- Group by ---
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const isMobile = useIsMobile();

  // --- Search bar ---
  const [searchQuery, setSearchQuery] = useState('');

  // --- Bulk selection ---
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // --- Add form ---
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState<import('../types').Currency>(data.settings.primaryCurrency);
  const [formCategory, setFormCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formExchangeRate, setFormExchangeRate] = useState(String(data.settings.exchangeRate));

  const formCategories = formType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function resetForm() {
    setFormType('expense');
    setFormAmount('');
    setFormCurrency(data.settings.primaryCurrency);
    setFormCategory(EXPENSE_CATEGORIES[0]);
    setFormDescription('');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setFormExchangeRate(String(data.settings.exchangeRate));
  }

  function handleOpenForm() { resetForm(); setShowForm(true); }
  function handleCloseForm() { setShowForm(false); }

  useEffect(() => {
    if (!showForm) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowForm(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showForm]);

  function handleFormTypeChange(type: 'income' | 'expense') {
    setFormType(type);
    setFormCategory(type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
  }

  function handleSave() {
    const amount = parseFloat(formAmount);
    if (!formAmount || isNaN(amount) || amount <= 0 || !formDate) return;
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
      if (!isNaN(rate) && rate > 0) tx.exchangeRateAtTime = rate;
    }
    onAdd(tx);
    setShowForm(false);
    resetForm();
  }

  // --- Sort handler ---
  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? 'none' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col || sortDir === 'none') return <ArrowUpDown size={12} className="text-gray-600" />;
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="text-primary-400" />
      : <ArrowDown size={12} className="text-primary-400" />;
  }

  // --- Filter active checks ---
  function isFilterActive(col: SortCol): boolean {
    switch (col) {
      case 'description': return filters.description.trim() !== '';
      case 'category': return filters.categories.size > 0;
      case 'type': return filters.types.size > 0;
      case 'currency': return filters.currencies.size > 0;
      case 'date': return filters.dateFrom !== '' || filters.dateTo !== '';
      case 'amount': return filters.amountMin !== '' || filters.amountMax !== '';
    }
  }

  const hasAnyFilter = (['description', 'category', 'type', 'currency', 'date', 'amount'] as SortCol[]).some(isFilterActive);

  function clearAllFilters() {
    setFilters({ description: '', categories: new Set(), types: new Set(), currencies: new Set(), dateFrom: '', dateTo: '', amountMin: '', amountMax: '' });
  }

  // --- Filtered + sorted transactions ---
  const filtered = useMemo(() => {
    let txs = [...data.transactions];

    // --- Search bar expression parsing ---
    if (searchQuery.trim()) {
      const tokens = searchQuery.trim().toLowerCase().split(/\s+/);
      txs = txs.filter((t) => {
        return tokens.every((token) => {
          // amount expressions: >100, <50, >=200, <=300
          const amountMatch = token.match(/^([><]=?)([\d.]+)$/);
          if (amountMatch) {
            const op = amountMatch[1];
            const val = parseFloat(amountMatch[2]);
            if (isNaN(val)) return true;
            if (op === '>') return t.amount > val;
            if (op === '<') return t.amount < val;
            if (op === '>=') return t.amount >= val;
            if (op === '<=') return t.amount <= val;
          }
          // exact amount: =100
          if (token.startsWith('=') && !token.startsWith('==')) {
            const val = parseFloat(token.slice(1));
            if (!isNaN(val)) return Math.abs(t.amount - val) < 0.01;
          }
          // category:food
          if (token.startsWith('category:') || token.startsWith('cat:')) {
            const cat = token.split(':')[1];
            return t.category.toLowerCase().includes(cat);
          }
          // type:income or type:expense
          if (token.startsWith('type:')) {
            const typ = token.split(':')[1];
            return t.type.toLowerCase().includes(typ);
          }
          // date:2026-03 or date:2026-03-15
          if (token.startsWith('date:')) {
            const d = token.split(':')[1];
            return t.date.startsWith(d);
          }
          // currency:pln
          if (token.startsWith('currency:') || token.startsWith('cur:')) {
            const cur = token.split(':')[1];
            return t.currency.toLowerCase() === cur;
          }
          // plain text: search in description, category, and type
          return (
            t.description.toLowerCase().includes(token) ||
            t.category.toLowerCase().includes(token) ||
            t.type.toLowerCase().includes(token)
          );
        });
      });
    }

    if (filters.description.trim()) {
      const q = filters.description.trim().toLowerCase();
      txs = txs.filter((t) => t.description.toLowerCase().includes(q));
    }
    if (filters.categories.size > 0) txs = txs.filter((t) => filters.categories.has(t.category));
    if (filters.types.size > 0) txs = txs.filter((t) => filters.types.has(t.type));
    if (filters.currencies.size > 0) txs = txs.filter((t) => filters.currencies.has(t.currency));
    if (filters.dateFrom) txs = txs.filter((t) => t.date >= filters.dateFrom);
    if (filters.dateTo) txs = txs.filter((t) => t.date <= filters.dateTo);
    if (filters.amountMin) {
      const min = parseFloat(filters.amountMin);
      if (!isNaN(min)) txs = txs.filter((t) => t.amount >= min);
    }
    if (filters.amountMax) {
      const max = parseFloat(filters.amountMax);
      if (!isNaN(max)) txs = txs.filter((t) => t.amount <= max);
    }

    if (sortDir !== 'none') {
      txs.sort((a, b) => {
        let cmp = 0;
        switch (sortCol) {
          case 'date': cmp = a.date < b.date ? -1 : a.date > b.date ? 1 : 0; break;
          case 'description': cmp = a.description.localeCompare(b.description); break;
          case 'category': cmp = a.category.localeCompare(b.category); break;
          case 'amount': cmp = a.amount - b.amount; break;
          case 'currency': cmp = a.currency.localeCompare(b.currency); break;
          case 'type': cmp = a.type.localeCompare(b.type); break;
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
    } else {
      txs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    }

    return txs;
  }, [data.transactions, filters, sortCol, sortDir, searchQuery]);

  // --- Summary totals ---
  // --- Running balance (saldo) per transaction ---
  const saldoMap = useMemo(() => {
    const map = new Map<string, number>();
    // Accumulate from oldest to newest
    const sorted = [...filtered].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    let running = 0;
    for (const t of sorted) {
      running += t.type === 'income' ? t.amount : -t.amount;
      map.set(t.id, running);
    }
    return map;
  }, [filtered]);

  const summary = useMemo(() => {
    let income = 0;
    let expenses = 0;
    const byCurrency: Record<string, { income: number; expenses: number }> = {};
    filtered.forEach((t) => {
      if (!byCurrency[t.currency]) byCurrency[t.currency] = { income: 0, expenses: 0 };
      if (t.type === 'income') {
        income += t.amount;
        byCurrency[t.currency].income += t.amount;
      } else {
        expenses += t.amount;
        byCurrency[t.currency].expenses += t.amount;
      }
    });
    return { income, expenses, net: income - expenses, byCurrency };
  }, [filtered]);

  // --- Grouped transactions ---
  type Group = { key: string; label: string; txs: Transaction[]; total: number };
  const groups = useMemo((): Group[] => {
    if (groupBy === 'none') return [{ key: '__all__', label: '', txs: filtered, total: 0 }];

    const map = new Map<string, Transaction[]>();
    for (const tx of filtered) {
      let key: string;
      if (groupBy === 'category') key = tx.category;
      else if (groupBy === 'merchant') key = merchantFromDesc(tx.description);
      else key = monthKey(tx.date);
      const arr = map.get(key) ?? [];
      arr.push(tx);
      map.set(key, arr);
    }

    const result: Group[] = [];
    for (const [key, txs] of map) {
      const total = txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
      const label = groupBy === 'month' ? monthLabel(key) : (groupBy === 'category' ? tc(key) : key);
      result.push({ key, label, txs, total });
    }
    result.sort((a, b) => b.total - a.total);
    return result;
  }, [filtered, groupBy, tc]);

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // --- Flat list of virtual items (group headers + tx rows) ---
  type VirtualItem =
    | { kind: 'group-header'; groupKey: string }
    | { kind: 'tx'; tx: Transaction };

  const virtualItemList = useMemo((): VirtualItem[] => {
    if (groupBy === 'none') {
      return filtered.map((tx) => ({ kind: 'tx' as const, tx }));
    }
    const items: VirtualItem[] = [];
    for (const g of groups) {
      items.push({ kind: 'group-header', groupKey: g.key });
      if (!collapsedGroups.has(g.key)) {
        for (const tx of g.txs) {
          items.push({ kind: 'tx', tx });
        }
      }
    }
    return items;
  }, [groupBy, filtered, groups, collapsedGroups]);

  // --- Scroll container ref for virtualizer ---
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: virtualItemList.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  // --- Bulk selection ---
  const allIds = filtered.map((t) => t.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  function toggleSelectAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const handleBulkSetCategory = useCallback(() => {
    if (!bulkCategory) return;
    onBulkUpdateCategory(selected, bulkCategory);
    // Save first selected tx description as a rule
    const firstTx = data.transactions.find((t) => selected.has(t.id));
    if (firstTx?.description) {
      onAddRule(firstTx.description, bulkCategory);
    }
    setSelected(new Set());
    setBulkCategory('');
  }, [bulkCategory, selected, onBulkUpdateCategory, onAddRule, data.transactions]);

  const handleBulkDelete = useCallback(() => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onBulkDelete(selected);
    setSelected(new Set());
    setConfirmDelete(false);
  }, [confirmDelete, selected, onBulkDelete]);

  // --- Column header helper ---
  function ColHeader({ col, label, className = '' }: { col: SortCol; label: string; className?: string }) {
    return (
      <div
        className={`px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap ${className}`}
        onClick={() => handleSort(col)}
      >
        <div className="flex items-center gap-1">
          <span>{label}</span>
          <SortIcon col={col} />
          <FilterDropdown
            column={col}
            filters={filters}
            setFilters={setFilters}
            transactions={data.transactions}
            active={isFilterActive(col)}
          />
        </div>
      </div>
    );
  }

  // --- Transaction row ---
  function TxRow({ tx }: { tx: Transaction }) {
    const isIncome = tx.type === 'income';
    const color = CATEGORY_COLORS[tx.category] ?? '#64748b';
    const cats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    return (
      <div className={`${GRID_COLS} border-b border-gray-800 hover:bg-gray-800/40 transition-colors group`}>
        {/* Checkbox */}
        <div className="px-3 py-2 self-center">
          <input
            type="checkbox"
            checked={selected.has(tx.id)}
            onChange={() => toggleSelect(tx.id)}
            className="accent-primary-500"
          />
        </div>
        {/* Date */}
        <div className="px-3 py-2 text-sm text-gray-400 whitespace-nowrap">{formatDate(tx.date)}</div>
        {/* Description */}
        <div className="px-3 py-2 text-sm text-gray-200 truncate">
          {tx.description || <span className="text-gray-500 italic">{t('transactions.noDescription')}</span>}
        </div>
        {/* Category -- inline dropdown */}
        <div className="px-3 py-2">
          <select
            value={tx.category}
            onChange={(e) => onUpdateCategory(tx.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500 max-w-full"
            style={{ backgroundColor: color + '30', color }}
          >
            {cats.map((c) => (
              <option key={c} value={c} style={{ backgroundColor: '#1f2937', color: '#e5e7eb' }}>
                {tc(c)}
              </option>
            ))}
          </select>
        </div>
        {/* Amount */}
        <div className="px-3 py-2 text-right whitespace-nowrap leading-tight">
          <div className={`font-semibold text-sm ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
            {isIncome ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
          </div>
          <div className="text-xs text-gray-500 h-4">
            {tx.currency !== data.settings.primaryCurrency
              ? `≈${formatCurrency(
                  convertCurrency(
                    tx.amount,
                    tx.currency,
                    data.settings.primaryCurrency,
                    tx.exchangeRateAtTime ?? data.settings.exchangeRate,
                    data.settings.exchangeRates,
                  ),
                  data.settings.primaryCurrency,
                ).replace(/\s/g, '\u00A0')}`
              : '\u00A0'}
          </div>
        </div>
        {/* Saldo */}
        <div className="px-3 py-2 text-right whitespace-nowrap">
          <span className={`text-xs font-medium ${(saldoMap.get(tx.id) ?? 0) >= 0 ? 'text-gray-300' : 'text-red-400'}`}>
            {(saldoMap.get(tx.id) ?? 0) >= 0 ? '+' : ''}{(saldoMap.get(tx.id) ?? 0).toFixed(2)}
          </span>
        </div>
        {/* Currency */}
        <div className="px-3 py-2 text-xs text-gray-400">{tx.currency}</div>
        {/* Type */}
        <div className="px-3 py-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isIncome ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
            {t(`transactions.${tx.type}`)}
          </span>
        </div>
        {/* Delete */}
        <div className="px-3 py-2">
          <button
            onClick={() => onDelete(tx.id)}
            className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
            aria-label={t('transactions.delete')}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  // --- Mobile card renderer ---
  function TxCard({ tx }: { tx: Transaction }) {
    const isIncome = tx.type === 'income';
    const color = CATEGORY_COLORS[tx.category] ?? '#64748b';
    const cats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    return (
      <div className="border-b border-gray-800 p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <input
              type="checkbox"
              checked={selected.has(tx.id)}
              onChange={() => toggleSelect(tx.id)}
              className="accent-primary-500 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm text-gray-200 truncate">{tx.description || <span className="text-gray-500 italic">{t('transactions.noDescription')}</span>}</p>
              <p className="text-xs text-gray-500">{formatDate(tx.date)}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-sm font-semibold ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
              {isIncome ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
            </p>
            {tx.currency !== data.settings.primaryCurrency && (
              <p className="text-xs text-gray-500">
                ≈{formatCurrency(
                  convertCurrency(tx.amount, tx.currency, data.settings.primaryCurrency, tx.exchangeRateAtTime ?? data.settings.exchangeRate, data.settings.exchangeRates),
                  data.settings.primaryCurrency,
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={tx.category}
            onChange={(e) => onUpdateCategory(tx.id, e.target.value)}
            className="text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500"
            style={{ backgroundColor: color + '30', color }}
          >
            {cats.map((c) => (
              <option key={c} value={c} style={{ backgroundColor: '#1f2937', color: '#e5e7eb' }}>{tc(c)}</option>
            ))}
          </select>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isIncome ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
            {t(`transactions.${tx.type}`)}
          </span>
          <span className="text-xs text-gray-500 ml-auto">
            {t('transactions.saldo')}: {(saldoMap.get(tx.id) ?? 0).toFixed(2)}
          </span>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">{t('transactions.title')}</h1>
        <button
          onClick={handleOpenForm}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={18} />
          {t('transactions.addTransaction')}
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('transactions.searchPlaceholder')}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 pl-10 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Group by */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 whitespace-nowrap">{t('transactions.groupBy')}</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="none">{t('transactions.groupNone')}</option>
            <option value="category">{t('transactions.groupCategory')}</option>
            <option value="merchant">{t('transactions.groupMerchant')}</option>
            <option value="month">{t('transactions.groupMonth')}</option>
          </select>
        </div>

        {/* Clear all filters */}
        {hasAnyFilter && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 bg-primary-900/30 hover:bg-primary-900/50 border border-primary-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            <X size={12} />
            {t('transactions.clearAllFilters')}
          </button>
        )}

        <div className="ml-auto text-xs text-gray-500">
          {filtered.length} {filtered.length !== 1 ? t('transactions.transactions') : t('transactions.transaction')}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-800 overflow-x-auto">
        <div className={isMobile ? '' : 'min-w-[700px]'}>
          {/* Header — desktop only */}
          {!isMobile && <div className={`${GRID_COLS} bg-gray-900 border-b border-gray-700`}>
            <div className="px-3 py-2.5">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="accent-primary-500"
              />
            </div>
            <ColHeader col="date" label={t('transactions.date')} />
            <ColHeader col="description" label={t('transactions.description')} />
            <ColHeader col="category" label={t('transactions.category')} />
            <ColHeader col="amount" label={t('transactions.amount')} className="text-right" />
            <div className="px-3 py-2.5 text-xs font-semibold text-gray-400 text-right whitespace-nowrap">{t('transactions.saldo')}</div>
            <ColHeader col="currency" label={t('transactions.currency')} />
            <ColHeader col="type" label={t('transactions.type')} />
            <div className="px-3 py-2.5" />
          </div>}

          {/* Virtualized body */}
          {filtered.length === 0 ? (
            <div className="px-4 py-16 text-center text-gray-500 bg-gray-950">
              <Search size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-base font-medium">{t('transactions.noFound')}</p>
              <p className="text-sm mt-1">{t('transactions.tryAdjusting')}</p>
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="overflow-y-auto bg-gray-950"
              style={{ height: 'calc(100vh - 320px)', maxHeight: '600px' }}
            >
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((vItem) => {
                  const item = virtualItemList[vItem.index];
                  return (
                    <div
                      key={vItem.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${vItem.start}px)`,
                      }}
                    >
                      {item.kind === 'group-header' ? (() => {
                        const g = groups.find((gr) => gr.key === item.groupKey)!;
                        const collapsed = collapsedGroups.has(g.key);
                        return (
                          <div
                            className="bg-gray-900 border-b border-gray-700 px-3 py-2 cursor-pointer"
                            onClick={() => toggleGroup(g.key)}
                          >
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                              {collapsed
                                ? <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                                : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
                              <span>{g.label}</span>
                              <span className="text-xs font-normal text-gray-500 ml-1">
                                {g.txs.length} {g.txs.length !== 1 ? t('transactions.transactions') : t('transactions.transaction')}
                              </span>
                              <span className={`ml-auto text-sm font-semibold ${g.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {g.total >= 0 ? '+' : ''}{g.total.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })() : (
                        isMobile ? <TxCard tx={item.tx} /> : <TxRow tx={item.tx} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer totals */}
          {filtered.length > 0 && (
            isMobile ? (
              <div className="bg-gray-900 border-t-2 border-gray-700 p-3 space-y-2">
                <p className="text-xs text-gray-400 font-medium">
                  {t('transactions.totals')} ({filtered.length} {filtered.length !== 1 ? t('transactions.transactions') : t('transactions.transaction')})
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-green-400">+{summary.income.toFixed(2)}</span>
                  <span className="text-red-400">-{summary.expenses.toFixed(2)}</span>
                  <span className={`font-semibold ${summary.net >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    = {summary.net >= 0 ? '+' : ''}{summary.net.toFixed(2)}
                  </span>
                </div>
                {Object.entries(summary.byCurrency).map(([cur, totals]) => {
                  const net = totals.income - totals.expenses;
                  return (
                    <div key={cur} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 w-8">{cur}</span>
                      <span className="text-green-400">+{totals.income.toFixed(2)}</span>
                      <span className="text-red-400">-{totals.expenses.toFixed(2)}</span>
                      <span className={`font-medium ${net >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                        = {net >= 0 ? '+' : ''}{net.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`${GRID_COLS} bg-gray-900 border-t-2 border-gray-700`}>
                <div className="px-3 py-2.5 col-span-3 text-xs text-gray-400 font-medium">
                  {t('transactions.totals')} ({filtered.length} {filtered.length !== 1 ? t('transactions.transactions') : t('transactions.transaction')})
                </div>
                <div className="px-3 py-2.5" />
                <div className="px-3 py-2.5 text-right">
                  <div className="text-xs space-y-0.5">
                    <div className="text-green-400">+{summary.income.toFixed(2)}</div>
                    <div className="text-red-400">-{summary.expenses.toFixed(2)}</div>
                    <div className={`font-semibold border-t border-gray-700 pt-0.5 ${summary.net >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {summary.net >= 0 ? '+' : ''}{summary.net.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="px-3 py-2.5 text-right">
                  <div className={`text-xs font-semibold ${summary.net >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {summary.net >= 0 ? '+' : ''}{summary.net.toFixed(2)}
                  </div>
                </div>
                <div className="px-3 py-2.5 col-span-3">
                  <div className="text-xs space-y-0.5">
                    {Object.entries(summary.byCurrency).map(([cur, totals]) => {
                      const net = totals.income - totals.expenses;
                      return (
                        <div key={cur} className="flex items-center gap-2">
                          <span className="text-gray-500 w-8">{cur}</span>
                          <span className="text-green-400">+{totals.income.toFixed(2)}</span>
                          <span className="text-red-400">-{totals.expenses.toFixed(2)}</span>
                          <span className={`font-medium ${net >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                            = {net >= 0 ? '+' : ''}{net.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 shadow-2xl">
          <Check size={15} className="text-primary-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-200 whitespace-nowrap">
            {selected.size} {t('transactions.selected')}
          </span>
          <div className="h-4 w-px bg-gray-600" />
          {/* Batch category */}
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">{t('transactions.setCategory')}</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{tc(c)}</option>
            ))}
          </select>
          <button
            onClick={handleBulkSetCategory}
            disabled={!bulkCategory}
            className="text-sm font-medium text-primary-400 hover:text-primary-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('transactions.apply')}
          </button>
          <div className="h-4 w-px bg-gray-600" />
          {/* Delete */}
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">{t('transactions.confirmDeleteItems', { count: String(selected.size) })}</span>
              <button
                onClick={handleBulkDelete}
                className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
              >
                {t('transactions.yesDelete')}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                {t('transactions.cancel')}
              </button>
            </div>
          ) : (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={14} />
              {t('transactions.deleteSelected')}
            </button>
          )}
          {/* Dismiss */}
          <button
            onClick={() => { setSelected(new Set()); setConfirmDelete(false); }}
            className="ml-1 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showForm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseForm(); }}
        >
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-100">{t('transactions.addTransaction')}</h2>
              <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('form.type')}</label>
                <div className="flex bg-gray-900 rounded-lg p-1 gap-1">
                  {(['income', 'expense'] as const).map((tp) => (
                    <button
                      key={tp}
                      onClick={() => handleFormTypeChange(tp)}
                      className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                        formType === tp
                          ? tp === 'income' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                          : 'text-gray-400 hover:text-gray-100'
                      }`}
                    >
                      {t(`form.${tp}`)}
                    </button>
                  ))}
                </div>
              </div>
              {/* Amount + Currency */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('form.amount')}</label>
                  <input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="w-28">
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('form.currency')}</label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value as import('../types').Currency)}
                    className={INPUT_CLASS}
                  >
                    <option value="USD">USD</option>
                    <option value="PLN">PLN</option>
                    <option value="UAH">UAH</option>
                  </select>
                </div>
              </div>
              {/* Exchange rate */}
              {formCurrency === 'PLN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('form.exchangeRate')}</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={formExchangeRate}
                    onChange={(e) => setFormExchangeRate(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              )}
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('form.category')}</label>
                <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className={INPUT_CLASS}>
                  {formCategories.map((c) => <option key={c} value={c}>{tc(c)}</option>)}
                </select>
              </div>
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('form.description')}</label>
                <input
                  type="text" placeholder={t('form.optionalDescription')}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('form.date')}</label>
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
                  {t('transactions.save')}
                </button>
                <button
                  onClick={handleCloseForm}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium py-2 rounded-lg transition-colors"
                >
                  {t('transactions.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
