import { v4 as uuidv4 } from 'uuid';
import type { AppData, Transaction, Debt, SavingsGoal } from '../types';

function tx(
  type: 'income' | 'expense',
  amount: number,
  currency: 'USD' | 'PLN',
  category: string,
  description: string,
  date: string,
): Transaction {
  return {
    id: uuidv4(),
    type,
    amount,
    currency: currency as any,
    category: category as any,
    description,
    date,
  };
}

export function generateSeedData(): AppData {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed

  // Helper: date string for current month
  const d = (day: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  // Helper: date string for previous month
  const pm = m === 0 ? 11 : m - 1;
  const py = m === 0 ? y - 1 : y;
  const pd = (day: number) => `${py}-${String(pm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const transactions: Transaction[] = [
    // === CURRENT MONTH ===
    // Income
    tx('income', 5200, 'USD', 'Salary', 'Monthly salary - Tech Corp', d(1)),
    tx('income', 8500, 'PLN', 'Salary', 'Wynagrodzenie - Firma XYZ', d(1)),
    tx('income', 450, 'USD', 'Freelance', 'Logo design project - Fiverr', d(5)),
    tx('income', 1200, 'PLN', 'Freelance', 'Web development freelance', d(10)),
    tx('income', 85, 'USD', 'Investment', 'Stock dividend - AAPL', d(15)),

    // Housing
    tx('expense', 1500, 'USD', 'Housing', 'Rent payment - February', d(1)),
    tx('expense', 2800, 'PLN', 'Housing', 'Czynsz za mieszkanie', d(1)),

    // Food
    tx('expense', 156.32, 'PLN', 'Food', 'Biedronka - groceries', d(2)),
    tx('expense', 89.50, 'PLN', 'Food', 'Lidl - weekly shopping', d(8)),
    tx('expense', 45.00, 'USD', 'Food', 'Whole Foods - groceries', d(6)),
    tx('expense', 32.50, 'USD', 'Food', 'Chipotle lunch', d(9)),
    tx('expense', 67.80, 'PLN', 'Food', 'Żabka + snacks', d(12)),
    tx('expense', 120.00, 'PLN', 'Food', 'Restauracja - dinner with friends', d(14)),
    tx('expense', 55.00, 'USD', 'Food', 'Uber Eats delivery', d(16)),
    tx('expense', 210.45, 'PLN', 'Food', 'Auchan - big monthly shop', d(18)),

    // Transportation
    tx('expense', 200, 'PLN', 'Transportation', 'Orlen - fuel', d(3)),
    tx('expense', 45.00, 'USD', 'Transportation', 'Uber ride to airport', d(7)),
    tx('expense', 150, 'PLN', 'Transportation', 'ZTM monthly pass', d(1)),
    tx('expense', 85.50, 'PLN', 'Transportation', 'Bolt rides x3', d(11)),

    // Utilities
    tx('expense', 320, 'PLN', 'Utilities', 'PGE - electricity bill', d(5)),
    tx('expense', 89, 'PLN', 'Utilities', 'Orange - internet + mobile', d(5)),
    tx('expense', 65, 'USD', 'Utilities', 'Comcast internet', d(5)),

    // Entertainment
    tx('expense', 15.99, 'USD', 'Subscriptions', 'Netflix Premium', d(3)),
    tx('expense', 9.99, 'USD', 'Subscriptions', 'Spotify Family', d(3)),
    tx('expense', 14.99, 'USD', 'Subscriptions', 'YouTube Premium', d(3)),
    tx('expense', 85, 'PLN', 'Entertainment', 'Multikino - movies + popcorn', d(10)),
    tx('expense', 45, 'USD', 'Entertainment', 'Steam game purchase', d(13)),

    // Shopping
    tx('expense', 350, 'PLN', 'Shopping', 'Allegro - headphones', d(4)),
    tx('expense', 129.99, 'USD', 'Shopping', 'Amazon - keyboard', d(8)),
    tx('expense', 89, 'PLN', 'Shopping', 'Rossmann - personal care', d(12)),

    // Healthcare
    tx('expense', 200, 'PLN', 'Healthcare', 'Medicover - monthly plan', d(1)),
    tx('expense', 45, 'PLN', 'Healthcare', 'Apteka - medications', d(9)),

    // Education
    tx('expense', 29.99, 'USD', 'Education', 'Udemy course - TypeScript', d(6)),

    // Debt Payment
    tx('expense', 300, 'USD', 'Debt Payment', 'Student loan payment', d(15)),
    tx('expense', 500, 'PLN', 'Debt Payment', 'Car loan installment', d(15)),

    // Personal
    tx('expense', 60, 'PLN', 'Personal', 'Haircut', d(11)),
    tx('expense', 35, 'USD', 'Personal', 'Gym membership', d(1)),

    // === PREVIOUS MONTH ===
    tx('income', 5200, 'USD', 'Salary', 'Monthly salary - Tech Corp', pd(1)),
    tx('income', 8500, 'PLN', 'Salary', 'Wynagrodzenie - Firma XYZ', pd(1)),
    tx('income', 300, 'USD', 'Freelance', 'Freelance consulting', pd(12)),
    tx('expense', 1500, 'USD', 'Housing', 'Rent payment - January', pd(1)),
    tx('expense', 2800, 'PLN', 'Housing', 'Czynsz za mieszkanie', pd(1)),
    tx('expense', 420, 'PLN', 'Food', 'Grocery shopping total', pd(5)),
    tx('expense', 180, 'USD', 'Food', 'Various food expenses', pd(8)),
    tx('expense', 200, 'PLN', 'Transportation', 'Orlen - fuel', pd(3)),
    tx('expense', 320, 'PLN', 'Utilities', 'PGE - electricity', pd(5)),
    tx('expense', 89, 'PLN', 'Utilities', 'Orange - internet', pd(5)),
    tx('expense', 250, 'PLN', 'Shopping', 'Clothing purchase', pd(15)),
    tx('expense', 300, 'USD', 'Debt Payment', 'Student loan payment', pd(15)),
    tx('expense', 500, 'PLN', 'Debt Payment', 'Car loan installment', pd(15)),
  ];

  const debts: Debt[] = [
    {
      id: uuidv4(),
      name: 'Student Loan',
      totalAmount: 25000,
      paidAmount: 8500,
      currency: 'USD',
      interestRate: 4.5,
      minimumPayment: 300,
      dueDate: '2029-06-01',
    },
    {
      id: uuidv4(),
      name: 'Car Loan (Kredyt samochodowy)',
      totalAmount: 45000,
      paidAmount: 18000,
      currency: 'PLN',
      interestRate: 6.2,
      minimumPayment: 500,
      dueDate: '2027-12-01',
    },
    {
      id: uuidv4(),
      name: 'Credit Card',
      totalAmount: 3200,
      paidAmount: 1800,
      currency: 'USD',
      interestRate: 19.9,
      minimumPayment: 100,
    },
  ];

  const savingsGoals: SavingsGoal[] = [
    {
      id: uuidv4(),
      name: 'Emergency Fund',
      targetAmount: 15000,
      currentAmount: 6200,
      currency: 'USD',
    },
    {
      id: uuidv4(),
      name: 'Wakacje (Vacation)',
      targetAmount: 8000,
      currentAmount: 3500,
      currency: 'PLN',
      deadline: `${y}-07-01`,
    },
    {
      id: uuidv4(),
      name: 'New Laptop',
      targetAmount: 2500,
      currentAmount: 1800,
      currency: 'USD',
      deadline: `${y}-05-01`,
    },
    {
      id: uuidv4(),
      name: 'Mieszkanie (Apartment Down Payment)',
      targetAmount: 80000,
      currentAmount: 22000,
      currency: 'PLN',
      deadline: `${y + 2}-01-01`,
    },
  ];

  return {
    transactions,
    debts,
    savingsGoals,
    settings: {
      primaryCurrency: 'USD',
      exchangeRate: 4.05,
      autoExchangeRate: true,
      monthlyBudget: 4000,
    },
  };
}
