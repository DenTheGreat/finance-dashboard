import { v4 as uuidv4 } from 'uuid';
import type { AppData, Transaction, Debt, SavingsGoal, UserSettings } from '../types';

const STORAGE_KEY = 'finance-dashboard-data';

const DEFAULT_DATA: AppData = {
  transactions: [],
  debts: [],
  savingsGoals: [],
  settings: {
    primaryCurrency: 'USD',
    exchangeRate: 4.05, // approximate USD to PLN
    autoExchangeRate: true,
    monthlyBudget: undefined,
  },
};

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DATA };
    const parsed = JSON.parse(raw) as AppData;
    return {
      transactions: parsed.transactions || [],
      debts: parsed.debts || [],
      savingsGoals: parsed.savingsGoals || [],
      settings: { ...DEFAULT_DATA.settings, ...parsed.settings },
    };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Transactions
export function addTransaction(data: AppData, tx: Omit<Transaction, 'id'>): AppData {
  const updated = {
    ...data,
    transactions: [...data.transactions, { ...tx, id: uuidv4() }],
  };
  saveData(updated);
  return updated;
}

export function updateTransaction(data: AppData, tx: Transaction): AppData {
  const updated = {
    ...data,
    transactions: data.transactions.map((t) => (t.id === tx.id ? tx : t)),
  };
  saveData(updated);
  return updated;
}

export function deleteTransaction(data: AppData, id: string): AppData {
  const updated = {
    ...data,
    transactions: data.transactions.filter((t) => t.id !== id),
  };
  saveData(updated);
  return updated;
}

// Debts
export function addDebt(data: AppData, debt: Omit<Debt, 'id'>): AppData {
  const updated = {
    ...data,
    debts: [...data.debts, { ...debt, id: uuidv4() }],
  };
  saveData(updated);
  return updated;
}

export function updateDebt(data: AppData, debt: Debt): AppData {
  const updated = {
    ...data,
    debts: data.debts.map((d) => (d.id === debt.id ? debt : d)),
  };
  saveData(updated);
  return updated;
}

export function deleteDebt(data: AppData, id: string): AppData {
  const updated = {
    ...data,
    debts: data.debts.filter((d) => d.id !== id),
  };
  saveData(updated);
  return updated;
}

// Savings Goals
export function addSavingsGoal(data: AppData, goal: Omit<SavingsGoal, 'id'>): AppData {
  const updated = {
    ...data,
    savingsGoals: [...data.savingsGoals, { ...goal, id: uuidv4() }],
  };
  saveData(updated);
  return updated;
}

export function updateSavingsGoal(data: AppData, goal: SavingsGoal): AppData {
  const updated = {
    ...data,
    savingsGoals: data.savingsGoals.map((g) => (g.id === goal.id ? goal : g)),
  };
  saveData(updated);
  return updated;
}

export function deleteSavingsGoal(data: AppData, id: string): AppData {
  const updated = {
    ...data,
    savingsGoals: data.savingsGoals.filter((g) => g.id !== id),
  };
  saveData(updated);
  return updated;
}

// Settings
export function updateSettings(data: AppData, settings: Partial<UserSettings>): AppData {
  const updated = {
    ...data,
    settings: { ...data.settings, ...settings },
  };
  saveData(updated);
  return updated;
}

// Export / Import
export function exportData(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function importData(json: string): AppData | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed.transactions && parsed.settings) {
      saveData(parsed);
      return parsed as AppData;
    }
    return null;
  } catch {
    return null;
  }
}
