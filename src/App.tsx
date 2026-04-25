import { useState, useCallback, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Debts from './pages/Debts';
import Savings from './pages/Savings';
import Settings from './pages/Settings';
import Planning from './pages/Planning';
import Budget from './pages/Budget';
import BankImport from './pages/BankImport';
import Onboarding from './components/Onboarding';
import type { Transaction, Debt, SavingsGoal, UserSettings, PlannedExpense, PlannedIncome, ExpenseCategory } from './types';
import { I18nContext, createI18nValue } from './i18n';
import type { Locale } from './i18n';
import {
  loadData,
  addTransaction,
  deleteTransaction,
  updateTransactionCategory,
  updateTransactionFields,
  clearTransactions,
  deduplicateTransactions,
  addCategoryRule,
  addDebt,
  updateDebt,
  deleteDebt,
  addSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  addPlannedExpense,
  updatePlannedExpense,
  deletePlannedExpense,
  addPlannedIncome,
  updatePlannedIncome,
  deletePlannedIncome,
  updateSettings,
  exportData,
  importData,
  deleteTransactions,
  updateTransactionsCategory,
  batchUpdateTransactionRates,
  setCategoryBudget,
  addCustomCategory,
  removeCustomCategory,
} from './store';
import { checkUpcomingReminders } from './utils/reminders';
import { fetchAllRates, fetchHistoricalRatesForDate } from './utils/exchangeRate';
import { generateSeedData } from './utils/seed';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [data, setData] = useState(loadData);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Fetch live exchange rates when auto mode is enabled
  const autoExchangeRate = data.settings.autoExchangeRate;
  useEffect(() => {
    if (!autoExchangeRate) return;
    fetchAllRates().then((rates) => {
      if (rates) {
        const plnRate = rates['PLN'];
        const updates: Partial<import('./types').UserSettings> = { exchangeRates: rates };
        if (typeof plnRate === 'number' && plnRate > 0) {
          updates.exchangeRate = plnRate;
        }
        setData((prev) => updateSettings(prev, updates));
      }
    });
  }, [autoExchangeRate]);

  // Backfill historical exchange rates for past foreign-currency transactions
  useEffect(() => {
    const { primaryCurrency } = data.settings;
    const today = new Date().toISOString().slice(0, 10);
    const uniqueDates = [
      ...new Set(
        data.transactions
          .filter((tx) => tx.currency !== primaryCurrency && !tx.exchangeRatesAtTime && tx.date < today)
          .map((tx) => tx.date),
      ),
    ];
    if (uniqueDates.length === 0) return;

    let cancelled = false;
    (async () => {
      const dateRatesMap = new Map<string, Record<string, number>>();
      for (const date of uniqueDates) {
        if (cancelled) break;
        const rates = await fetchHistoricalRatesForDate(date);
        if (rates) dateRatesMap.set(date, rates);
        await new Promise((r) => setTimeout(r, 80)); // polite pacing for free API
      }
      if (!cancelled && dateRatesMap.size > 0) {
        setData((prev) => batchUpdateTransactionRates(prev, dateRatesMap));
      }
    })();

    return () => { cancelled = true; };
  }, [data.transactions, data.settings.primaryCurrency]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddTransaction = useCallback((tx: Omit<Transaction, 'id'>) => {
    setData((prev) => addTransaction(prev, tx));
  }, []);

  const handleClearTransactions = useCallback(() => {
    setData((prev) => clearTransactions(prev));
  }, []);

  const handleAddCategoryRule = useCallback((keyword: string, category: string) => {
    setData((prev) => addCategoryRule(prev, keyword, category));
  }, []);

  const handleDeduplicateTransactions = useCallback((): number => {
    let removed = 0;
    setData((prev) => {
      const result = deduplicateTransactions(prev);
      removed = result.removed;
      return result.data;
    });
    return removed;
  }, []);

  const handleDeleteTransaction = useCallback((id: string) => {
    setData((prev) => deleteTransaction(prev, id));
  }, []);

  const handleUpdateTransactionCategory = useCallback((id: string, category: string) => {
    setData((prev) => updateTransactionCategory(prev, id, category));
  }, []);

  const handleBulkDelete = useCallback((ids: Set<string>) => {
    setData((prev) => deleteTransactions(prev, ids));
  }, []);

  const handleBulkUpdateCategory = useCallback((ids: Set<string>, category: string) => {
    setData((prev) => updateTransactionsCategory(prev, ids, category));
  }, []);

  const handleUpdateTransaction = useCallback((id: string, updates: Partial<import('./types').Transaction>) => {
    setData((prev) => updateTransactionFields(prev, id, updates));
  }, []);

  const handleAddDebt = useCallback((debt: Omit<Debt, 'id'>) => {
    setData((prev) => addDebt(prev, debt));
  }, []);

  const handleUpdateDebt = useCallback((debt: Debt) => {
    setData((prev) => updateDebt(prev, debt));
  }, []);

  const handleDeleteDebt = useCallback((id: string) => {
    setData((prev) => deleteDebt(prev, id));
  }, []);

  const handleAddSavingsGoal = useCallback((goal: Omit<SavingsGoal, 'id'>) => {
    setData((prev) => addSavingsGoal(prev, goal));
  }, []);

  const handleUpdateSavingsGoal = useCallback((goal: SavingsGoal) => {
    setData((prev) => updateSavingsGoal(prev, goal));
  }, []);

  const handleDeleteSavingsGoal = useCallback((id: string) => {
    setData((prev) => deleteSavingsGoal(prev, id));
  }, []);

  const handleAddPlannedExpense = useCallback((expense: Omit<PlannedExpense, 'id'>) => {
    setData((prev) => addPlannedExpense(prev, expense));
  }, []);

  const handleUpdatePlannedExpense = useCallback((id: string, updates: Partial<PlannedExpense>) => {
    setData((prev) => updatePlannedExpense(prev, id, updates));
  }, []);

  const handleDeletePlannedExpense = useCallback((id: string) => {
    setData((prev) => deletePlannedExpense(prev, id));
  }, []);

  const handleAddPlannedIncome = useCallback((income: Omit<PlannedIncome, 'id'>) => {
    setData((prev) => addPlannedIncome(prev, income));
  }, []);

  const handleUpdatePlannedIncome = useCallback((id: string, updates: Partial<PlannedIncome>) => {
    setData((prev) => updatePlannedIncome(prev, id, updates));
  }, []);

  const handleDeletePlannedIncome = useCallback((id: string) => {
    setData((prev) => deletePlannedIncome(prev, id));
  }, []);

  const handleUpdateSettings = useCallback((settings: Partial<UserSettings>) => {
    setData((prev) => updateSettings(prev, settings));
  }, []);

  const handleSetBudget = useCallback((month: string, category: ExpenseCategory, amount: number) => {
    setData((prev) => setCategoryBudget(prev, month, category, amount));
  }, []);

  const handleAddCustomCategory = useCallback((kind: 'income' | 'expense', name: string) => {
    setData((prev) => addCustomCategory(prev, kind, name));
  }, []);

  const handleRemoveCustomCategory = useCallback((kind: 'income' | 'expense', name: string) => {
    setData((prev) => removeCustomCategory(prev, kind, name));
  }, []);

  const handleExport = useCallback(() => {
    const json = exportData(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-dashboard-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const handleImport = useCallback((json: string) => {
    const imported = importData(json);
    if (imported) {
      setData(imported);
    }
  }, []);

  const handleLoadSeed = useCallback(() => {
    const seed = generateSeedData();
    localStorage.setItem('finance-dashboard-data', JSON.stringify(seed));
    setData(seed);
  }, []);

  const locale = (data.settings.locale ?? 'en') as Locale;
  const setLocale = useCallback((l: Locale) => {
    setData((prev) => updateSettings(prev, { locale: l }));
  }, []);
  const i18n = useMemo(() => createI18nValue(locale, setLocale), [locale, setLocale]);

  // First-run onboarding check
  useEffect(() => {
    const done = localStorage.getItem('finance-onboarding-done');
    if (done) return;
    const isEmpty =
      data.transactions.length === 0 &&
      data.plannedExpenses.length === 0 &&
      (data.plannedIncomes?.length ?? 0) === 0 &&
      data.savingsGoals.length === 0 &&
      data.debts.length === 0;
    if (isEmpty) setShowOnboarding(true);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reminders check (after a short delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      const days = parseInt(localStorage.getItem('reminders-days-ahead') ?? '3', 10) || 3;
      checkUpcomingReminders(data.plannedExpenses, data.plannedIncomes ?? [], days);
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply dark/light class to document root
  useEffect(() => {
    const theme = data.settings.theme ?? 'dark';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [data.settings.theme]);

  return (
    <I18nContext.Provider value={i18n}>
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout settings={data.settings} onUpdateSettings={handleUpdateSettings} />}>
          <Route path="/" element={<Dashboard data={data} />} />
          <Route
            path="/transactions"
            element={
              <Transactions
                data={data}
                onAdd={handleAddTransaction}
                onDelete={handleDeleteTransaction}
                onUpdateCategory={handleUpdateTransactionCategory}
                onUpdate={handleUpdateTransaction}
                onAddRule={handleAddCategoryRule}
                onBulkDelete={handleBulkDelete}
                onBulkUpdateCategory={handleBulkUpdateCategory}
              />
            }
          />
          <Route
            path="/debts"
            element={
              <Debts
                data={data}
                onAdd={handleAddDebt}
                onUpdate={handleUpdateDebt}
                onDelete={handleDeleteDebt}
              />
            }
          />
          <Route
            path="/savings"
            element={
              <Savings
                data={data}
                onAdd={handleAddSavingsGoal}
                onUpdate={handleUpdateSavingsGoal}
                onDelete={handleDeleteSavingsGoal}
              />
            }
          />
          <Route
            path="/planning"
            element={
              <Planning
                plannedExpenses={data.plannedExpenses}
                plannedIncomes={data.plannedIncomes || []}
                transactions={data.transactions}
                primaryCurrency={data.settings.primaryCurrency}
                exchangeRate={data.settings.exchangeRate}
                exchangeRates={data.settings.exchangeRates}
                onAddPlannedExpense={handleAddPlannedExpense}
                onUpdatePlannedExpense={handleUpdatePlannedExpense}
                onDeletePlannedExpense={handleDeletePlannedExpense}
                onAddPlannedIncome={handleAddPlannedIncome}
                onUpdatePlannedIncome={handleUpdatePlannedIncome}
                onDeletePlannedIncome={handleDeletePlannedIncome}
              />
            }
          />
          <Route
            path="/budget"
            element={<Budget data={data} onSetBudget={handleSetBudget} />}
          />
          <Route
            path="/bank-import"
            element={
              <BankImport
                data={data}
                onAdd={handleAddTransaction}
                onAddRule={handleAddCategoryRule}
                onUpdateSettings={handleUpdateSettings}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <Settings
                data={data}
                onUpdateSettings={handleUpdateSettings}
                onExport={handleExport}
                onImport={handleImport}
                onLoadSeed={handleLoadSeed}
                onClear={handleClearTransactions}
                onDeduplicate={handleDeduplicateTransactions}
                onAddTransaction={handleAddTransaction}
                onAddRule={handleAddCategoryRule}
                onAddCustomCategory={handleAddCustomCategory}
                onRemoveCustomCategory={handleRemoveCustomCategory}
              />
            }
          />
        </Route>
      </Routes>
      {showOnboarding && (
        <OnboardingHost onClose={() => setShowOnboarding(false)} />
      )}
    </BrowserRouter>
    </ErrorBoundary>
    </I18nContext.Provider>
  );
}

function OnboardingHost({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  return <Onboarding onClose={onClose} onNavigate={(path) => navigate(path)} />;
}
