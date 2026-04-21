export type Currency = 'USD' | 'PLN' | 'UAH';

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
  | 'Taxes'
  | 'Entertainment'
  | 'Shopping'
  | 'Education'
  | 'Personal'
  | 'Transfers'
  | 'Subscriptions'
  | 'Debt Payment'
  | 'Other';

export const INCOME_CATEGORIES: IncomeCategory[] = [
  'Salary', 'Freelance', 'Investment', 'Rental', 'Gift', 'Other Income',
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Housing', 'Transportation', 'Food', 'Utilities', 'Healthcare',
  'Insurance', 'Taxes', 'Entertainment', 'Shopping', 'Education', 'Personal',
  'Transfers', 'Subscriptions', 'Debt Payment', 'Other',
];

export const NEEDS_CATEGORIES: ExpenseCategory[] = [
  'Housing', 'Transportation', 'Food', 'Utilities', 'Healthcare', 'Insurance', 'Taxes',
];

export const WANTS_CATEGORIES: ExpenseCategory[] = [
  'Entertainment', 'Shopping', 'Education', 'Personal', 'Transfers', 'Subscriptions',
];

export type TransactionSource = 'manual' | 'PKO' | 'Monobank' | 'PrivatBank' | 'import';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  category: IncomeCategory | ExpenseCategory;
  description: string;
  date: string; // ISO date string YYYY-MM-DD
  exchangeRateAtTime?: number; // USD→PLN rate when this transaction occurred
  source?: TransactionSource; // where this transaction came from
  counterparty?: string; // who received/sent the money
  notes?: string; // user notes
  recurring?: boolean;
  recurringInterval?: 'weekly' | 'monthly' | 'yearly';
  debtId?: string; // linked debt ID if this is a debt payment
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
  exchangeRates?: Record<string, number>; // rates from USD base (e.g., { PLN: 4.05, UAH: 41.5 })
  autoExchangeRate: boolean; // fetch live rate on load
  monthlyBudget?: number;
  locale?: 'en' | 'uk' | 'ru';
  theme?: 'dark' | 'light';
}

export type Recurrence = 'once' | 'monthly' | 'yearly';

export interface PlannedExpense {
  id: string;
  name: string;
  amount: number;
  currency: Currency;
  category: ExpenseCategory;
  recurrence: Recurrence;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // optional
  isActive: boolean;
  notes?: string;
  linkedTransactionIds?: string[];
}

export interface MonthlyBudget {
  month: string; // YYYY-MM format
  category: ExpenseCategory;
  amount: number;
}

export interface CategoryRule {
  keyword: string;
  category: string;
}

export interface AppData {
  transactions: Transaction[];
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  plannedExpenses: PlannedExpense[];
  monthlyBudgets: MonthlyBudget[];
  settings: UserSettings;
  categoryRules?: CategoryRule[];
}

export const CATEGORY_COLORS: Record<string, string> = {
  Housing: '#6366f1',
  Transportation: '#8b5cf6',
  Food: '#ec4899',
  Utilities: '#f59e0b',
  Healthcare: '#ef4444',
  Insurance: '#f97316',
  Taxes: '#b91c1c',
  Entertainment: '#10b981',
  Shopping: '#14b8a6',
  Education: '#3b82f6',
  Personal: '#a855f7',
  Subscriptions: '#06b6d4',
  Transfers: '#f472b6',
  'Debt Payment': '#dc2626',
  Other: '#64748b',
  Salary: '#10b981',
  Freelance: '#34d399',
  Investment: '#6366f1',
  Rental: '#8b5cf6',
  Gift: '#f59e0b',
  'Other Income': '#64748b',
};
