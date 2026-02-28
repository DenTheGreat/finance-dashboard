import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadData,
  addTransaction,
  updateTransaction,
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
} from '../index';
import type { AppData, Transaction, Debt, SavingsGoal } from '../../types';

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123'),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

const DEFAULT_SETTINGS = {
  primaryCurrency: 'USD' as const,
  exchangeRate: 4.05,
  autoExchangeRate: true,
  monthlyBudget: undefined,
};

function emptyData(): AppData {
  return {
    transactions: [],
    debts: [],
    savingsGoals: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

describe('loadData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('returns default data when localStorage is empty', () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    const data = loadData();
    expect(data.transactions).toEqual([]);
    expect(data.debts).toEqual([]);
    expect(data.savingsGoals).toEqual([]);
    expect(data.settings.primaryCurrency).toBe('USD');
    expect(data.settings.exchangeRate).toBe(4.05);
  });

  it('parses stored data', () => {
    const stored: AppData = {
      transactions: [
        { id: '1', type: 'income', amount: 5000, currency: 'USD', category: 'Salary', description: 'Pay', date: '2025-01-01' },
      ],
      debts: [],
      savingsGoals: [],
      settings: { primaryCurrency: 'PLN', exchangeRate: 4.10, autoExchangeRate: false, monthlyBudget: 3000 },
    };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(stored));

    const data = loadData();
    expect(data.transactions).toHaveLength(1);
    expect(data.settings.primaryCurrency).toBe('PLN');
    expect(data.settings.monthlyBudget).toBe(3000);
  });

  it('returns defaults on corrupted JSON', () => {
    localStorageMock.getItem.mockReturnValueOnce('not-valid-json{{{');
    const data = loadData();
    expect(data.transactions).toEqual([]);
    expect(data.settings.primaryCurrency).toBe('USD');
  });

  it('fills in missing settings with defaults', () => {
    const partial = { transactions: [], debts: [], savingsGoals: [], settings: { primaryCurrency: 'PLN' } };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(partial));

    const data = loadData();
    expect(data.settings.primaryCurrency).toBe('PLN');
    expect(data.settings.exchangeRate).toBe(4.05); // default filled in
    expect(data.settings.autoExchangeRate).toBe(true);
  });

  it('fills in missing arrays with empty defaults', () => {
    const partial = { settings: { primaryCurrency: 'USD' } };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(partial));

    const data = loadData();
    expect(data.transactions).toEqual([]);
    expect(data.debts).toEqual([]);
    expect(data.savingsGoals).toEqual([]);
  });
});

describe('Transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('addTransaction adds a transaction with UUID', () => {
    const data = emptyData();
    const result = addTransaction(data, {
      type: 'expense',
      amount: 50,
      currency: 'USD',
      category: 'Food',
      description: 'Lunch',
      date: '2025-01-15',
    });

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].id).toBe('test-uuid-123');
    expect(result.transactions[0].amount).toBe(50);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('addTransaction does not mutate original data', () => {
    const data = emptyData();
    const result = addTransaction(data, {
      type: 'expense',
      amount: 50,
      currency: 'USD',
      category: 'Food',
      description: 'Lunch',
      date: '2025-01-15',
    });

    expect(data.transactions).toHaveLength(0);
    expect(result.transactions).toHaveLength(1);
  });

  it('updateTransaction replaces matching transaction', () => {
    const tx: Transaction = {
      id: 'tx-1',
      type: 'expense',
      amount: 50,
      currency: 'USD',
      category: 'Food',
      description: 'Lunch',
      date: '2025-01-15',
    };
    const data: AppData = { ...emptyData(), transactions: [tx] };

    const updated = updateTransaction(data, { ...tx, amount: 75, description: 'Dinner' });
    expect(updated.transactions[0].amount).toBe(75);
    expect(updated.transactions[0].description).toBe('Dinner');
  });

  it('deleteTransaction removes matching transaction', () => {
    const data: AppData = {
      ...emptyData(),
      transactions: [
        { id: 'tx-1', type: 'expense', amount: 50, currency: 'USD', category: 'Food', description: 'A', date: '2025-01-15' },
        { id: 'tx-2', type: 'expense', amount: 30, currency: 'USD', category: 'Food', description: 'B', date: '2025-01-16' },
      ],
    };

    const result = deleteTransaction(data, 'tx-1');
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].id).toBe('tx-2');
  });

  it('deleteTransaction saves to localStorage', () => {
    const data: AppData = {
      ...emptyData(),
      transactions: [
        { id: 'tx-1', type: 'expense', amount: 50, currency: 'USD', category: 'Food', description: 'A', date: '2025-01-15' },
      ],
    };

    deleteTransaction(data, 'tx-1');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });
});

describe('Debts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('addDebt adds a debt with UUID', () => {
    const data = emptyData();
    const result = addDebt(data, {
      name: 'Car Loan',
      totalAmount: 20000,
      paidAmount: 5000,
      currency: 'USD',
      interestRate: 5.5,
    });

    expect(result.debts).toHaveLength(1);
    expect(result.debts[0].id).toBe('test-uuid-123');
    expect(result.debts[0].name).toBe('Car Loan');
  });

  it('updateDebt replaces matching debt', () => {
    const debt: Debt = {
      id: 'debt-1',
      name: 'Car Loan',
      totalAmount: 20000,
      paidAmount: 5000,
      currency: 'USD',
    };
    const data: AppData = { ...emptyData(), debts: [debt] };

    const result = updateDebt(data, { ...debt, paidAmount: 8000 });
    expect(result.debts[0].paidAmount).toBe(8000);
  });

  it('deleteDebt removes matching debt', () => {
    const data: AppData = {
      ...emptyData(),
      debts: [
        { id: 'debt-1', name: 'Car Loan', totalAmount: 20000, paidAmount: 5000, currency: 'USD' },
        { id: 'debt-2', name: 'Student Loan', totalAmount: 50000, paidAmount: 10000, currency: 'USD' },
      ],
    };

    const result = deleteDebt(data, 'debt-1');
    expect(result.debts).toHaveLength(1);
    expect(result.debts[0].id).toBe('debt-2');
  });
});

describe('Savings Goals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('addSavingsGoal adds a goal with UUID', () => {
    const data = emptyData();
    const result = addSavingsGoal(data, {
      name: 'Emergency Fund',
      targetAmount: 10000,
      currentAmount: 2000,
      currency: 'USD',
    });

    expect(result.savingsGoals).toHaveLength(1);
    expect(result.savingsGoals[0].id).toBe('test-uuid-123');
    expect(result.savingsGoals[0].name).toBe('Emergency Fund');
  });

  it('updateSavingsGoal replaces matching goal', () => {
    const goal: SavingsGoal = {
      id: 'goal-1',
      name: 'Emergency Fund',
      targetAmount: 10000,
      currentAmount: 2000,
      currency: 'USD',
    };
    const data: AppData = { ...emptyData(), savingsGoals: [goal] };

    const result = updateSavingsGoal(data, { ...goal, currentAmount: 5000 });
    expect(result.savingsGoals[0].currentAmount).toBe(5000);
  });

  it('deleteSavingsGoal removes matching goal', () => {
    const data: AppData = {
      ...emptyData(),
      savingsGoals: [
        { id: 'goal-1', name: 'Emergency Fund', targetAmount: 10000, currentAmount: 2000, currency: 'USD' },
        { id: 'goal-2', name: 'Vacation', targetAmount: 3000, currentAmount: 500, currency: 'USD' },
      ],
    };

    const result = deleteSavingsGoal(data, 'goal-1');
    expect(result.savingsGoals).toHaveLength(1);
    expect(result.savingsGoals[0].id).toBe('goal-2');
  });
});

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('updateSettings does partial merge', () => {
    const data = emptyData();
    const result = updateSettings(data, { primaryCurrency: 'PLN' });

    expect(result.settings.primaryCurrency).toBe('PLN');
    expect(result.settings.exchangeRate).toBe(4.05); // unchanged
    expect(result.settings.autoExchangeRate).toBe(true); // unchanged
  });

  it('updateSettings saves to localStorage', () => {
    const data = emptyData();
    updateSettings(data, { monthlyBudget: 5000 });
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });
});

describe('Export / Import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('exportData returns JSON string', () => {
    const data = emptyData();
    const json = exportData(data);
    const parsed = JSON.parse(json);
    expect(parsed.transactions).toEqual([]);
    expect(parsed.settings.primaryCurrency).toBe('USD');
  });

  it('round-trip export/import preserves data', () => {
    const data: AppData = {
      ...emptyData(),
      transactions: [
        { id: 'tx-1', type: 'income', amount: 5000, currency: 'USD', category: 'Salary', description: 'Pay', date: '2025-01-01' },
      ],
    };

    const json = exportData(data);
    const imported = importData(json);

    expect(imported).not.toBeNull();
    expect(imported!.transactions).toHaveLength(1);
    expect(imported!.transactions[0].amount).toBe(5000);
  });

  it('importData rejects invalid JSON', () => {
    const result = importData('not-valid-json{{{');
    expect(result).toBeNull();
  });

  it('importData rejects JSON without required fields', () => {
    const result = importData(JSON.stringify({ foo: 'bar' }));
    expect(result).toBeNull();
  });

  it('importData saves valid data to localStorage', () => {
    const data = emptyData();
    data.transactions.push({
      id: 'tx-1', type: 'income', amount: 5000, currency: 'USD',
      category: 'Salary', description: 'Pay', date: '2025-01-01',
    });

    importData(JSON.stringify(data));
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });
});
