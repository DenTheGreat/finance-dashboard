import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Debts from './pages/Debts';
import Savings from './pages/Savings';
import Settings from './pages/Settings';
import BankImport from './pages/BankImport';
import type { Transaction, Debt, SavingsGoal, UserSettings } from './types';
import {
  loadData,
  addTransaction,
  deleteTransaction,
  addDebt,
  updateDebt,
  deleteDebt,
  addSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  updateSettings,
  exportData,
  importData,
} from './store';
import { fetchLiveRate } from './utils/exchangeRate';
import { generateSeedData } from './utils/seed';

export default function App() {
  const [data, setData] = useState(loadData);

  // Fetch live exchange rate on mount if auto mode is enabled
  useEffect(() => {
    if (!data.settings.autoExchangeRate) return;
    fetchLiveRate().then((rate) => {
      if (rate) {
        setData((prev) => updateSettings(prev, { exchangeRate: rate }));
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddTransaction = useCallback((tx: Omit<Transaction, 'id'>) => {
    setData((prev) => addTransaction(prev, tx));
  }, []);

  const handleDeleteTransaction = useCallback((id: string) => {
    setData((prev) => deleteTransaction(prev, id));
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

  const handleUpdateSettings = useCallback((settings: Partial<UserSettings>) => {
    setData((prev) => updateSettings(prev, settings));
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

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard data={data} />} />
          <Route
            path="/transactions"
            element={
              <Transactions
                data={data}
                onAdd={handleAddTransaction}
                onDelete={handleDeleteTransaction}
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
            path="/import"
            element={
              <BankImport
                data={data}
                onAdd={handleAddTransaction}
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
              />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
