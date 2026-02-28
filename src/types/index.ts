export type Currency = 'USD' | 'PLN';

export type TransactionType = 'income' | 'expense';

export type IncomeCategory =
  | 'Salary'
  | 'Freelance'
  | 'Investment'
  | 'Rental'
  | 'Gift'
  | 'Other Income';

export type ExpenseCategory =
  | 'Housing'
  | 'Transportation'
  | 'Food'
  | 'Utilities'
  | 'Healthcare'
  | 'Insurance'
  | 'Entertainment'
  | 'Shopping'
  | 'Education'
  | 'Personal'
  | 'Subscriptions'
  | 'Debt Payment'
  | 'Other';

export const INCOME_CATEGORIES: IncomeCategory[] = [
  'Salary', 'Freelance', 'Investment', 'Rental', 'Gift', 'Other Income',
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Housing', 'Transportation', 'Food', 'Utilities', 'Healthcare',
  'Insurance', 'Entertainment', 'Shopping', 'Education', 'Personal',
  'Subscriptions', 'Debt Payment', 'Other',
];

export const NEEDS_CATEGORIES: ExpenseCategory[] = [
  'Housing', 'Transportation', 'Food', 'Utilities', 'Healthcare', 'Insurance',
];

export const WANTS_CATEGORIES: ExpenseCategory[] = [
  'Entertainment', 'Shopping', 'Education', 'Personal', 'Subscriptions',
];

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  category: IncomeCategory | ExpenseCategory;
  description: string;
  date: string; // ISO date string YYYY-MM-DD
  exchangeRateAtTime?: number; // USD→PLN rate when this transaction occurred
  recurring?: boolean;
  recurringInterval?: 'weekly' | 'monthly' | 'yearly';
}

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  paidAmount: number;
  currency: Currency;
  interestRate?: number;
  dueDate?: string;
  minimumPayment?: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: Currency;
  deadline?: string;
}

export interface UserSettings {
  primaryCurrency: Currency;
  exchangeRate: number; // USD to PLN rate
  autoExchangeRate: boolean; // fetch live rate on load
  monthlyBudget?: number;
}

export interface AppData {
  transactions: Transaction[];
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  settings: UserSettings;
}

export const CATEGORY_COLORS: Record<string, string> = {
  Housing: '#6366f1',
  Transportation: '#8b5cf6',
  Food: '#ec4899',
  Utilities: '#f59e0b',
  Healthcare: '#ef4444',
  Insurance: '#f97316',
  Entertainment: '#10b981',
  Shopping: '#14b8a6',
  Education: '#3b82f6',
  Personal: '#a855f7',
  Subscriptions: '#06b6d4',
  'Debt Payment': '#dc2626',
  Other: '#64748b',
  Salary: '#10b981',
  Freelance: '#34d399',
  Investment: '#6366f1',
  Rental: '#8b5cf6',
  Gift: '#f59e0b',
  'Other Income': '#64748b',
};
