import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Check,
  X,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import type { AppData, Transaction } from '../types';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  CATEGORY_COLORS,
} from '../types';
import { formatCurrency } from '../utils/currency';
import {
  parseCSV,
  type ParseResult,
  type ParsedBankTransaction,
  type ColumnMapping,
} from '../utils/pkoImport';

interface BankImportProps {
  data: AppData;
  onAdd: (tx: Omit<Transaction, 'id'>) => void;
}

type Step = 1 | 2 | 3;

const INPUT_CLASS =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm';

const SELECT_CLASS =
  'bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-xs';

export default function BankImport({ data, onAdd }: BankImportProps) {
  const [step, setStep] = useState<Step>(1);
  const [dragging, setDragging] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);

  // Column mapping UI state (indices into headers)
  const [mappingDate, setMappingDate] = useState<number>(0);
  const [mappingAmount, setMappingAmount] = useState<number>(1);
  const [mappingDesc, setMappingDesc] = useState<number>(2);
  const [mappingCurrency, setMappingCurrency] = useState<number>(-1);
  const [mappingCounterparty, setMappingCounterparty] = useState<number>(-1);

  // Per-transaction mutable category selections (index -> category)
  const [categoryOverrides, setCategoryOverrides] = useState<
    Record<number, string>
  >({});

  // Which transactions are selected for import (Set of indices)
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Success state
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- File reading helpers ----

  function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please select a .csv file.');
      return;
    }
    setParseError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== 'string') {
        setParseError('Could not read file.');
        return;
      }
      const result = parseCSV(text);
      if (result.transactions.length === 0 && result.headers.length === 0) {
        setParseError('The file appears to be empty or unrecognised.');
        return;
      }
      setParseResult(result);

      // Initialise mapping UI from detected mapping
      setMappingDate(result.mapping.date);
      setMappingAmount(result.mapping.amount);
      setMappingDesc(result.mapping.description);
      setMappingCurrency(result.mapping.currency);
      setMappingCounterparty(result.mapping.counterparty);

      // Initialise category overrides and selection
      const initialCategories: Record<number, string> = {};
      const initialSelected = new Set<number>();
      result.transactions.forEach((tx, i) => {
        initialCategories[i] = tx.suggestedCategory;
        initialSelected.add(i);
      });
      setCategoryOverrides(initialCategories);
      setSelected(initialSelected);

      // Skip column mapping step if auto-mapped
      setStep(result.autoMapped ? 3 : 2);
    };
    reader.readAsText(file);
  }

  // ---- Drag & drop handlers ----

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }

  // ---- Column mapping: apply custom mapping ----

  function handleApplyMapping() {
    if (!parseResult) return;
    const customMapping: ColumnMapping = {
      date: mappingDate,
      amount: mappingAmount,
      description: mappingDesc,
      currency: mappingCurrency,
      counterparty: mappingCounterparty,
    };
    // Re-parse with custom mapping by rebuilding from raw rows
    // We reconstruct a CSV string using the original raw fields and re-invoke parseCSV
    // but that would strip the headers. Instead, we do an inline re-map.
    const remapped = remapTransactions(parseResult, customMapping);
    const initialCategories: Record<number, string> = {};
    const initialSelected = new Set<number>();
    remapped.forEach((tx, i) => {
      initialCategories[i] = tx.suggestedCategory;
      initialSelected.add(i);
    });
    setParseResult({ ...parseResult, transactions: remapped, autoMapped: false, mapping: customMapping });
    setCategoryOverrides(initialCategories);
    setSelected(initialSelected);
    setStep(3);
  }

  // ---- Import ----

  function handleImport() {
    if (!parseResult) return;
    let count = 0;
    parseResult.transactions.forEach((tx, i) => {
      if (!selected.has(i)) return;
      const category = (categoryOverrides[i] ?? tx.suggestedCategory) as Transaction['category'];
      const type = tx.suggestedType;
      const newTx: Omit<Transaction, 'id'> = {
        type,
        amount: tx.amount,
        currency: tx.currency,
        category,
        description: tx.description,
        date: tx.date,
      };

      if (tx.currency === 'PLN') {
        newTx.exchangeRateAtTime = data.settings.exchangeRate;
      }

      onAdd(newTx);
      count++;
    });
    setImportedCount(count);
    setStep(1);
    setParseResult(null);
    setFileName('');
    setSelected(new Set());
    setCategoryOverrides({});
  }

  // ---- Reset to step 1 ----

  function handleCancel() {
    setStep(1);
    setParseResult(null);
    setFileName('');
    setParseError(null);
    setSelected(new Set());
    setCategoryOverrides({});
    setImportedCount(null);
  }

  // ---- Selection helpers ----

  function toggleSelect(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function selectAll() {
    if (!parseResult) return;
    setSelected(new Set(parseResult.transactions.map((_, i) => i)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  // ---- Derived stats ----

  const transactions = parseResult?.transactions ?? [];
  const selectedTransactions = transactions.filter((_, i) => selected.has(i));
  const incomeItems = selectedTransactions.filter((t) => t.suggestedType === 'income');
  const expenseItems = selectedTransactions.filter((t) => t.suggestedType === 'expense');

  const totalIncome = incomeItems.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenseItems.reduce((s, t) => s + t.amount, 0);

  // Use PLN as default display currency for summary (most common for PKO)
  const summaryCurrency = transactions[0]?.currency ?? data.settings.primaryCurrency;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="h-7 w-7 text-primary-400" />
        <h1 className="text-2xl font-bold text-white">Bank Import</h1>
      </div>

      {/* Success banner */}
      {importedCount !== null && (
        <div className="bg-green-900/40 border border-green-700 rounded-xl p-5 flex items-start gap-3">
          <Check className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-green-300 font-semibold">
              Successfully imported {importedCount} transaction{importedCount !== 1 ? 's' : ''}!
            </p>
            <a
              href="/transactions"
              className="inline-flex items-center gap-1 mt-1 text-sm text-green-400 hover:text-green-300 underline underline-offset-2"
            >
              View transactions
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Step 1 - Upload */}
      {step === 1 && (
        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-4 rounded-xl p-10 border-2 border-dashed cursor-pointer transition-colors ${
              dragging
                ? 'border-primary-400 bg-primary-900/20'
                : 'border-gray-700 hover:border-primary-500 hover:bg-gray-800/50'
            }`}
          >
            <Upload
              className={`h-12 w-12 ${dragging ? 'text-primary-400' : 'text-gray-500'}`}
            />
            <div className="text-center">
              <p className="text-gray-200 font-medium text-base">
                Drop your bank CSV file here or click to browse
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Supports PKO BP, Santander, and generic CSV formats
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {parseError && (
            <div className="mt-4 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {parseError}
            </div>
          )}
        </section>
      )}

      {/* Step 2 - Column Mapping */}
      {step === 2 && parseResult && (
        <section className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Column Mapping</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                We could not auto-detect the format. Map your CSV columns below.
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* File name */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <FileSpreadsheet className="h-4 w-4 text-primary-400" />
            {fileName}
          </div>

          {/* Mapping selects */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MappingSelect
              label="Date column"
              value={mappingDate}
              onChange={setMappingDate}
              headers={parseResult.headers}
              required
            />
            <MappingSelect
              label="Amount column"
              value={mappingAmount}
              onChange={setMappingAmount}
              headers={parseResult.headers}
              required
            />
            <MappingSelect
              label="Description column"
              value={mappingDesc}
              onChange={setMappingDesc}
              headers={parseResult.headers}
              required
            />
            <MappingSelect
              label="Currency column"
              value={mappingCurrency}
              onChange={setMappingCurrency}
              headers={parseResult.headers}
              optional
            />
            <MappingSelect
              label="Counterparty column"
              value={mappingCounterparty}
              onChange={setMappingCounterparty}
              headers={parseResult.headers}
              optional
            />
          </div>

          {/* Preview */}
          <div>
            <p className="text-sm font-medium text-gray-400 mb-2">
              Preview (first 3 rows)
            </p>
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-xs text-gray-300">
                <thead>
                  <tr className="bg-gray-800">
                    {parseResult.headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left font-medium text-gray-400 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parseResult.transactions.slice(0, 3).map((tx, ri) => (
                    <tr key={ri} className="border-t border-gray-800">
                      {tx.raw.map((cell, ci) => (
                        <td key={ci} className="px-3 py-1.5 whitespace-nowrap max-w-[160px] truncate">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleApplyMapping}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              Apply Mapping
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Step 3 - Review & Import */}
      {step === 3 && parseResult && (
        <section className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-white">Review & Import</h2>
              <p className="text-sm text-gray-400 mt-0.5">{fileName}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Auto-mapped badge */}
              {parseResult.autoMapped ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-900/40 text-green-400 border border-green-800">
                  <Check className="h-3 w-3" />
                  PKO format detected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-900/40 text-blue-400 border border-blue-800">
                  <FileSpreadsheet className="h-3 w-3" />
                  Custom mapping
                </span>
              )}
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Summary bar */}
          <div className="bg-gray-800 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Transactions found</p>
              <p className="text-gray-100 font-semibold mt-0.5">{transactions.length}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Selected</p>
              <p className="text-gray-100 font-semibold mt-0.5">{selected.size}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Income</p>
              <p className="text-green-400 font-semibold mt-0.5">
                +{formatCurrency(totalIncome, summaryCurrency)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Expenses</p>
              <p className="text-red-400 font-semibold mt-0.5">
                -{formatCurrency(totalExpenses, summaryCurrency)}
              </p>
            </div>
          </div>

          {/* Select all / deselect all */}
          <div className="flex gap-3 items-center">
            <button
              onClick={selectAll}
              className="text-xs text-primary-400 hover:text-primary-300 underline underline-offset-2"
            >
              Select All
            </button>
            <span className="text-gray-700 text-xs">|</span>
            <button
              onClick={deselectAll}
              className="text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2"
            >
              Deselect All
            </button>
            <span className="text-gray-600 text-xs ml-auto">
              {selected.size} of {transactions.length} selected
            </span>
          </div>

          {/* Transaction list */}
          <div className="max-h-[500px] overflow-y-auto rounded-lg border border-gray-800 divide-y divide-gray-800">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No transactions could be parsed.</p>
              </div>
            ) : (
              transactions.map((tx, i) => {
                const isChecked = selected.has(i);
                const isIncome = tx.suggestedType === 'income';
                const currentCategory = categoryOverrides[i] ?? tx.suggestedCategory;
                const catColor = CATEGORY_COLORS[currentCategory] ?? '#64748b';
                const allCategories = isIncome
                  ? INCOME_CATEGORIES
                  : EXPENSE_CATEGORIES;

                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      isChecked ? 'bg-gray-900' : 'bg-gray-900/50 opacity-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(i)}
                      className="h-4 w-4 rounded border-gray-600 bg-gray-800 accent-primary-500 shrink-0 cursor-pointer"
                    />

                    {/* Date */}
                    <span className="text-xs text-gray-400 w-24 shrink-0">
                      {tx.date}
                    </span>

                    {/* Description */}
                    <span className="text-sm text-gray-200 flex-1 min-w-0 truncate" title={tx.description}>
                      {tx.description || (
                        <span className="text-gray-500 italic">No description</span>
                      )}
                    </span>

                    {/* Category select */}
                    <select
                      value={currentCategory}
                      onChange={(e) =>
                        setCategoryOverrides((prev) => ({
                          ...prev,
                          [i]: e.target.value,
                        }))
                      }
                      className={SELECT_CLASS}
                      style={{ borderColor: catColor + '60' }}
                    >
                      {allCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    {/* Type badge */}
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                        isIncome
                          ? 'bg-green-900/40 text-green-400'
                          : 'bg-red-900/40 text-red-400'
                      }`}
                    >
                      {isIncome ? 'income' : 'expense'}
                    </span>

                    {/* Amount */}
                    <span
                      className={`text-sm font-semibold w-28 text-right shrink-0 ${
                        isIncome ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {isIncome ? '+' : '-'}
                      {formatCurrency(tx.amount, tx.currency)}
                    </span>

                    {/* Currency badge */}
                    <span className="text-xs text-gray-500 w-8 shrink-0">
                      {tx.currency}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1 flex-wrap">
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              <Check className="h-4 w-4" />
              Import Selected ({selected.size})
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

// ---- Sub-components ----

interface StepIndicatorProps {
  current: Step;
}

function StepIndicator({ current }: StepIndicatorProps) {
  const steps = [
    { n: 1 as Step, label: 'Upload' },
    { n: 2 as Step, label: 'Map Columns' },
    { n: 3 as Step, label: 'Review & Import' },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, idx) => {
        const done = current > s.n;
        const active = current === s.n;
        return (
          <div key={s.n} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  done
                    ? 'bg-primary-600 text-white'
                    : active
                    ? 'bg-primary-600 text-white ring-4 ring-primary-600/20'
                    : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : s.n}
              </div>
              <span
                className={`text-xs mt-1 font-medium ${
                  active ? 'text-primary-400' : done ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 w-16 mx-2 mb-4 rounded-full transition-colors ${
                  current > s.n ? 'bg-primary-600' : 'bg-gray-800'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface MappingSelectProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  headers: string[];
  required?: boolean;
  optional?: boolean;
}

function MappingSelect({
  label,
  value,
  onChange,
  headers,
  optional,
}: MappingSelectProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-300">
        {label}
        {optional && <span className="text-gray-600 font-normal ml-1">(optional)</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={INPUT_CLASS}
      >
        {optional && <option value={-1}>-- none --</option>}
        {headers.map((h, i) => (
          <option key={i} value={i}>
            [{i}] {h}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---- Helper: remap transactions from raw rows using a custom ColumnMapping ----

function remapTransactions(
  result: ParseResult,
  mapping: ColumnMapping,
): ParsedBankTransaction[] {
  const { transactions } = result;
  // We re-derive fields from raw rows
  return transactions
    .map((tx) => {
      const raw = tx.raw;

      // Amount
      const rawAmount = raw[mapping.amount] ?? '0';
      let cleaned = rawAmount.trim().replace(/\s/g, '');
      if (cleaned.includes(',') && cleaned.includes('.')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else if (cleaned.includes(',')) {
        cleaned = cleaned.replace(',', '.');
      }
      const amount = parseFloat(cleaned);
      if (isNaN(amount) || amount === 0) return null;

      const description = raw[mapping.description] ?? '';
      const counterparty =
        mapping.counterparty >= 0 ? (raw[mapping.counterparty] ?? '') : '';
      const fullDesc = counterparty
        ? `${counterparty} - ${description}`
        : description;

      const rawCurrency =
        mapping.currency >= 0
          ? (raw[mapping.currency] ?? '').trim().toUpperCase()
          : '';
      const currency =
        rawCurrency === 'PLN'
          ? 'PLN'
          : rawCurrency === 'USD'
          ? 'USD'
          : ('PLN' as const);

      const isIncome = amount > 0;
      const suggestedCategory = detectCategoryFallback(fullDesc);

      // Date
      const rawDate = raw[mapping.date] ?? '';
      const date = parseDateFallback(rawDate);

      return {
        date,
        amount: Math.abs(amount),
        description: fullDesc.slice(0, 200),
        currency,
        counterparty,
        suggestedCategory:
          isIncome && suggestedCategory === 'Other'
            ? 'Other Income'
            : suggestedCategory,
        suggestedType: (isIncome ? 'income' : 'expense') as 'income' | 'expense',
        raw,
      } satisfies ParsedBankTransaction;
    })
    .filter((t): t is ParsedBankTransaction => t !== null);
}

function detectCategoryFallback(
  description: string,
): import('../types').ExpenseCategory | import('../types').IncomeCategory {
  // Simple keyword check matching pkoImport logic
  const lower = description.toLowerCase();
  if (lower.includes('wynagrodzenie') || lower.includes('salary') || lower.includes('pensja'))
    return 'Salary';
  if (lower.includes('biedronka') || lower.includes('lidl') || lower.includes('żabka') || lower.includes('restaurant') || lower.includes('mcdonalds') || lower.includes('kfc'))
    return 'Food';
  if (lower.includes('czynsz') || lower.includes('wynajem') || lower.includes('rent') || lower.includes('hipoteka'))
    return 'Housing';
  if (lower.includes('uber') || lower.includes('bolt') || lower.includes('orlen') || lower.includes('paliwo') || lower.includes('pkp'))
    return 'Transportation';
  if (lower.includes('pge') || lower.includes('tauron') || lower.includes('internet') || lower.includes('orange'))
    return 'Utilities';
  if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('kino'))
    return 'Entertainment';
  if (lower.includes('allegro') || lower.includes('amazon') || lower.includes('zalando'))
    return 'Shopping';
  if (lower.includes('apteka') || lower.includes('medicover') || lower.includes('luxmed'))
    return 'Healthcare';
  return 'Other';
}

function parseDateFallback(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/^(\d{2})[.\-/](\d{2})[.\-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = trimmed.match(/^(\d{4})[.\-/](\d{2})[.\-/](\d{2})$/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return trimmed;
}
