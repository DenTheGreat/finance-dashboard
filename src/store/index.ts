import { v4 as uuidv4 } from 'uuid';
import type { AppData, Transaction, Debt, SavingsGoal, UserSettings, PlannedExpense, PlannedIncome, ExpenseCategory } from '../types';
import { INCOME_CATEGORIES } from '../types';

const STORAGE_KEY = 'finance-dashboard-data';

const DEFAULT_DATA: AppData = {
  transactions: [],
  debts: [],
  savingsGoals: [],
  plannedExpenses: [],
  plannedIncomes: [],
  monthlyBudgets: [],
  settings: {
    primaryCurrency: 'PLN',
    exchangeRate: 4.05,
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
      plannedExpenses: parsed.plannedExpenses || [],
      plannedIncomes: parsed.plannedIncomes || [],
      monthlyBudgets: parsed.monthlyBudgets || [],
      settings: { ...DEFAULT_DATA.settings, ...parsed.settings },
      categoryRules: parsed.categoryRules || [],
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

export function updateTransactionCategory(data: AppData, id: string, category: string): AppData {
  const tx = data.transactions.find((t) => t.id === id);
  if (!tx) return data;
  const isIncome = INCOME_CATEGORIES.includes(category as typeof INCOME_CATEGORIES[number]);
  return updateTransaction(data, {
    ...tx,
    category: category as Transaction['category'],
    type: isIncome ? 'income' : 'expense',
  });
}

export function updateTransactionFields(data: AppData, id: string, updates: Partial<Transaction>): AppData {
  const tx = data.transactions.find((t) => t.id === id);
  if (!tx) return data;
  return updateTransaction(data, { ...tx, ...updates });
}

export function deleteTransaction(data: AppData, id: string): AppData {
  const updated = {
    ...data,
    transactions: data.transactions.filter((t) => t.id !== id),
  };
  saveData(updated);
  return updated;
}

export function clearTransactions(data: AppData): AppData {
  const updated = { ...data, transactions: [] };
  saveData(updated);
  return updated;
}

export function deduplicateTransactions(data: AppData): { data: AppData; removed: number } {
  const seen = new Set<string>();
  const unique: Transaction[] = [];
  for (const tx of data.transactions) {
    const key = `${tx.date}|${tx.amount}|${tx.type}|${tx.description}|${tx.currency}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(tx);
    }
  }
  const removed = data.transactions.length - unique.length;
  const updated = { ...data, transactions: unique };
  saveData(updated);
  return { data: updated, removed };
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

// Planned Expenses
export function addPlannedExpense(data: AppData, expense: Omit<PlannedExpense, 'id'>): AppData {
  const updated = {
    ...data,
    plannedExpenses: [...data.plannedExpenses, { ...expense, id: uuidv4() }],
  };
  saveData(updated);
  return updated;
}

export function updatePlannedExpense(data: AppData, id: string, updates: Partial<PlannedExpense>): AppData {
  const updated = {
    ...data,
    plannedExpenses: data.plannedExpenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
  };
  saveData(updated);
  return updated;
}

export function deletePlannedExpense(data: AppData, id: string): AppData {
  const updated = {
    ...data,
    plannedExpenses: data.plannedExpenses.filter((e) => e.id !== id),
  };
  saveData(updated);
  return updated;
}

// Planned Incomes
export function addPlannedIncome(data: AppData, income: Omit<PlannedIncome, 'id'>): AppData {
  const updated = {
    ...data,
    plannedIncomes: [...(data.plannedIncomes || []), { ...income, id: uuidv4() }],
  };
  saveData(updated);
  return updated;
}

export function updatePlannedIncome(data: AppData, id: string, updates: Partial<PlannedIncome>): AppData {
  const updated = {
    ...data,
    plannedIncomes: (data.plannedIncomes || []).map((e) => (e.id === id ? { ...e, ...updates } : e)),
  };
  saveData(updated);
  return updated;
}

export function deletePlannedIncome(data: AppData, id: string): AppData {
  const updated = {
    ...data,
    plannedIncomes: (data.plannedIncomes || []).filter((e) => e.id !== id),
  };
  saveData(updated);
  return updated;
}

// Monthly Budgets
export function setCategoryBudget(data: AppData, month: string, category: ExpenseCategory, amount: number): AppData {
  const existing = data.monthlyBudgets.findIndex(b => b.month === month && b.category === category);
  if (existing !== -1) {
    const updated = {
      ...data,
      monthlyBudgets: data.monthlyBudgets.map((b, i) => i === existing ? { ...b, amount } : b),
    };
    saveData(updated);
    return updated;
  }
  const updated = {
    ...data,
    monthlyBudgets: [...data.monthlyBudgets, { month, category, amount }],
  };
  saveData(updated);
  return updated;
}

export function getCategoryBudget(data: AppData, month: string, category: ExpenseCategory): number {
  const budget = data.monthlyBudgets.find(b => b.month === month && b.category === category);
  return budget?.amount ?? 0;
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

// Category Rules
export function addCategoryRule(data: AppData, keyword: string, category: string): AppData {
  const rules = [...(data.categoryRules || [])];
  const lower = keyword.toLowerCase().trim();
  const existing = rules.findIndex(r => r.keyword === lower);
  if (existing !== -1) {
    rules[existing] = { keyword: lower, category };
  } else {
    rules.push({ keyword: lower, category });
  }
  const updated = { ...data, categoryRules: rules };
  saveData(updated);
  return updated;
}

export function deleteCategoryRule(data: AppData, keyword: string): AppData {
  const rules = (data.categoryRules || []).filter(r => r.keyword !== keyword.toLowerCase().trim());
  const updated = { ...data, categoryRules: rules };
  saveData(updated);
  return updated;
}

// Batch update historical rates (date → rates map)
export function batchUpdateTransactionRates(
  data: AppData,
  dateRatesMap: Map<string, Record<string, number>>,
): AppData {
  const updated = {
    ...data,
    transactions: data.transactions.map((t) => {
      if (t.exchangeRatesAtTime) return t; // already has rates
      const rates = dateRatesMap.get(t.date);
      return rates ? { ...t, exchangeRatesAtTime: rates } : t;
    }),
  };
  saveData(updated);
  return updated;
}

// Batch operations
export function deleteTransactions(data: AppData, ids: Set<string>): AppData {
  const updated = { ...data, transactions: data.transactions.filter(t => !ids.has(t.id)) };
  saveData(updated);
  return updated;
}

export function updateTransactionsCategory(data: AppData, ids: Set<string>, category: string): AppData {
  const isIncome = INCOME_CATEGORIES.includes(category as typeof INCOME_CATEGORIES[number]);
  const updated = {
    ...data,
    transactions: data.transactions.map(t =>
      ids.has(t.id)
        ? { ...t, category: category as Transaction['category'], type: isIncome ? 'income' as const : 'expense' as const }
        : t
    ),
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
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.transactions) ||
      !parsed.settings ||
      typeof parsed.settings !== 'object'
    ) return null;
    const result: AppData = {
      transactions: parsed.transactions,
      debts: Array.isArray(parsed.debts) ? parsed.debts : [],
      savingsGoals: Array.isArray(parsed.savingsGoals) ? parsed.savingsGoals : [],
      plannedExpenses: Array.isArray(parsed.plannedExpenses) ? parsed.plannedExpenses : [],
      plannedIncomes: Array.isArray(parsed.plannedIncomes) ? parsed.plannedIncomes : [],
      monthlyBudgets: Array.isArray(parsed.monthlyBudgets) ? parsed.monthlyBudgets : [],
      settings: { ...DEFAULT_DATA.settings, ...parsed.settings },
      categoryRules: Array.isArray(parsed.categoryRules) ? parsed.categoryRules : [],
    };
    saveData(result);
    return result;
  } catch {
    return null;
  }
}
