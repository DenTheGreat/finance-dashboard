import { describe, it, expect } from 'vitest';
import { getMonthlyBreakdown, getSavingsAdvice, getExpensesByCategory } from '../advisor';
import type { Transaction } from '../../types';

function makeTx(overrides: Partial<Transaction> & Pick<Transaction, 'amount' | 'type' | 'category'>): Transaction {
  return {
    id: Math.random().toString(),
    currency: 'USD',
    description: 'test',
    date: '2025-01-15',
    ...overrides,
  };
}

describe('getMonthlyBreakdown', () => {
  it('calculates income and expenses for a given month', () => {
    const transactions: Transaction[] = [
      makeTx({ type: 'income', amount: 5000, category: 'Salary', date: '2025-01-10' }),
      makeTx({ type: 'expense', amount: 1500, category: 'Housing', date: '2025-01-05' }),
      makeTx({ type: 'expense', amount: 300, category: 'Food', date: '2025-01-12' }),
    ];

    const result = getMonthlyBreakdown(transactions, 0, 2025, 'USD', 4.0);
    expect(result.totalIncome).toBe(5000);
    expect(result.totalExpenses).toBe(1800);
    expect(result.netBalance).toBe(3200);
  });

  it('filters transactions by month and year', () => {
    const transactions: Transaction[] = [
      makeTx({ type: 'income', amount: 5000, category: 'Salary', date: '2025-01-10' }),
      makeTx({ type: 'expense', amount: 200, category: 'Food', date: '2025-02-10' }), // different month
      makeTx({ type: 'expense', amount: 100, category: 'Food', date: '2024-01-10' }), // different year
    ];

    const result = getMonthlyBreakdown(transactions, 0, 2025, 'USD', 4.0);
    expect(result.totalIncome).toBe(5000);
    expect(result.totalExpenses).toBe(0);
  });

  it('categorizes needs correctly', () => {
    const transactions: Transaction[] = [
      makeTx({ type: 'income', amount: 5000, category: 'Salary', date: '2025-01-10' }),
      makeTx({ type: 'expense', amount: 1500, category: 'Housing', date: '2025-01-05' }),
      makeTx({ type: 'expense', amount: 200, category: 'Transportation', date: '2025-01-06' }),
      makeTx({ type: 'expense', amount: 400, category: 'Food', date: '2025-01-07' }),
    ];

    const result = getMonthlyBreakdown(transactions, 0, 2025, 'USD', 4.0);
    expect(result.needs).toBe(2100); // Housing + Transportation + Food
  });

  it('categorizes wants correctly', () => {
    const transactions: Transaction[] = [
      makeTx({ type: 'income', amount: 5000, category: 'Salary', date: '2025-01-10' }),
      makeTx({ type: 'expense', amount: 100, category: 'Entertainment', date: '2025-01-05' }),
      makeTx({ type: 'expense', amount: 200, category: 'Shopping', date: '2025-01-06' }),
    ];

    const result = getMonthlyBreakdown(transactions, 0, 2025, 'USD', 4.0);
    expect(result.wants).toBe(300);
  });

  it('tracks debt payments separately', () => {
    const transactions: Transaction[] = [
      makeTx({ type: 'income', amount: 5000, category: 'Salary', date: '2025-01-10' }),
      makeTx({ type: 'expense', amount: 500, category: 'Debt Payment', date: '2025-01-15' }),
    ];

    const result = getMonthlyBreakdown(transactions, 0, 2025, 'USD', 4.0);
    expect(result.debtPayments).toBe(500);
    expect(result.totalExpenses).toBe(500);
  });

  it('converts mixed currencies to primary', () => {
    const transactions: Transaction[] = [
      makeTx({ type: 'income', amount: 5000, category: 'Salary', currency: 'USD', date: '2025-01-10' }),
      makeTx({ type: 'expense', amount: 400, category: 'Food', currency: 'PLN', date: '2025-01-05' }),
    ];

    // PLN expense should be converted: 400 PLN / 4.0 = 100 USD
    const result = getMonthlyBreakdown(transactions, 0, 2025, 'USD', 4.0);
    expect(result.totalIncome).toBe(5000);
    expect(result.totalExpenses).toBe(100);
  });

  it('handles empty transactions', () => {
    const result = getMonthlyBreakdown([], 0, 2025, 'USD', 4.0);
    expect(result.totalIncome).toBe(0);
    expect(result.totalExpenses).toBe(0);
    expect(result.netBalance).toBe(0);
  });

  it('uses per-transaction exchangeRateAtTime instead of global rate', () => {
    const transactions: Transaction[] = [
      makeTx({ type: 'income', amount: 5000, category: 'Salary', currency: 'USD', date: '2025-01-10' }),
      makeTx({ type: 'expense', amount: 400, category: 'Food', currency: 'PLN', date: '2025-01-05', exchangeRateAtTime: 4.0 }),
    ];

    // Per-tx rate is 4.0, global rate is 5.0. Should use 4.0: 400/4.0 = 100 USD
    const result = getMonthlyBreakdown(transactions, 0, 2025, 'USD', 5.0);
    expect(result.totalExpenses).toBe(100);
  });

  it('falls back to global rate when exchangeRateAtTime is undefined', () => {
    const transactions: Transaction[] = [
      makeTx({ type: 'income', amount: 5000, category: 'Salary', currency: 'USD', date: '2025-01-10' }),
      makeTx({ type: 'expense', amount: 400, category: 'Food', currency: 'PLN', date: '2025-01-05' }),
    ];

    // No per-tx rate, global rate is 4.0: 400/4.0 = 100 USD
    const result = getMonthlyBreakdown(transactions, 0, 2025, 'USD', 4.0);
    expect(result.totalExpenses).toBe(100);
  });

  it('puts uncategorized expenses into wants', () => {
    const transactions: Transaction[] = [
      makeTx({ type: 'expense', amount: 50, category: 'Other', date: '2025-01-10' }),
    ];

    const result = getMonthlyBreakdown(transactions, 0, 2025, 'USD', 4.0);
    expect(result.wants).toBe(50);
  });
});

describe('getSavingsAdvice', () => {
  it('returns excellent status when savings >= 20%', () => {
    const advice = getSavingsAdvice({
      totalIncome: 5000,
      totalExpenses: 3500,
      needs: 2500,
      wants: 1000,
      savings: 1500,
      debtPayments: 0,
      netBalance: 1500,
    });

    expect(advice.status).toBe('excellent');
    expect(advice.savingsPercent).toBe(30);
  });

  it('returns good status when savings >= 10% and < 20%', () => {
    const advice = getSavingsAdvice({
      totalIncome: 5000,
      totalExpenses: 4250,
      needs: 3000,
      wants: 1250,
      savings: 750,
      debtPayments: 0,
      netBalance: 750,
    });

    expect(advice.status).toBe('good');
    expect(advice.savingsPercent).toBe(15);
  });

  it('returns fair status when savings >= 0% and < 10%', () => {
    const advice = getSavingsAdvice({
      totalIncome: 5000,
      totalExpenses: 4800,
      needs: 3500,
      wants: 1300,
      savings: 200,
      debtPayments: 0,
      netBalance: 200,
    });

    expect(advice.status).toBe('fair');
  });

  it('returns needs_attention when spending exceeds income', () => {
    const advice = getSavingsAdvice({
      totalIncome: 3000,
      totalExpenses: 3500,
      needs: 2500,
      wants: 1000,
      savings: -500,
      debtPayments: 0,
      netBalance: -500,
    });

    expect(advice.status).toBe('needs_attention');
    expect(advice.savingsPercent).toBeLessThan(0);
  });

  it('handles zero income', () => {
    const advice = getSavingsAdvice({
      totalIncome: 0,
      totalExpenses: 0,
      needs: 0,
      wants: 0,
      savings: 0,
      debtPayments: 0,
      netBalance: 0,
    });

    expect(advice.status).toBe('needs_attention');
    expect(advice.tips).toContain('Start by tracking your income to get personalized advice.');
  });

  it('adjusts optimal rate for debt payments', () => {
    const advice = getSavingsAdvice({
      totalIncome: 5000,
      totalExpenses: 4000,
      needs: 2500,
      wants: 1000,
      savings: 1000,
      debtPayments: 500,
      netBalance: 1000,
    });

    expect(advice.optimalSavingsRate).toBeLessThanOrEqual(20);
  });

  it('provides tips array', () => {
    const advice = getSavingsAdvice({
      totalIncome: 5000,
      totalExpenses: 4000,
      needs: 2500,
      wants: 1500,
      savings: 1000,
      debtPayments: 0,
      netBalance: 1000,
    });

    expect(advice.tips.length).toBeGreaterThan(0);
  });

  it('warns about high needs spending with excellent savings', () => {
    const advice = getSavingsAdvice({
      totalIncome: 5000,
      totalExpenses: 3500,
      needs: 3000,   // 60% - above 50%
      wants: 500,
      savings: 1500,
      debtPayments: 0,
      netBalance: 1500,
    });

    expect(advice.status).toBe('excellent');
    expect(advice.tips.some(t => t.includes('needs spending'))).toBe(true);
  });

  it('warns about high wants spending with good savings', () => {
    const advice = getSavingsAdvice({
      totalIncome: 5000,
      totalExpenses: 4250,
      needs: 2000,
      wants: 2250, // 45% - above 30%
      savings: 750,
      debtPayments: 0,
      netBalance: 750,
    });

    expect(advice.status).toBe('good');
    expect(advice.tips.some(t => t.includes('wants') || t.includes('entertainment'))).toBe(true);
  });
});

describe('getExpensesByCategory', () => {
  it('groups expenses by category', () => {
    const transactions: Transaction[] = [
      makeTx({ type: 'expense', amount: 500, category: 'Food', date: '2025-01-10' }),
      makeTx({ type: 'expense', amount: 300, category: 'Food', date: '2025-01-15' }),
      makeTx({ type: 'expense', amount: 1500, category: 'Housing', date: '2025-01-01' }),
    ];

    const result = getExpensesByCategory(transactions, 0, 2025, 'USD', 4.0);
    expect(result).toHaveLength(2);

    const housing = result.find(r => r.category === 'Housing');
    const food = result.find(r => r.category === 'Food');
    expect(housing?.amount).toBe(1500);
    expect(food?.amount).toBe(800);
  });

  it('sorts by amount descending', () => {
    const transactions: Transaction[] = [
      makeTx({ type: 'expense', amount: 100, category: 'Food', date: '2025-01-10' }),
      makeTx({ type: 'expense', amount: 1500, category: 'Housing', date: '2025-01-01' }),
      makeTx({ type: 'expense', amount: 500, category: 'Entertainment', date: '2025-01-05' }),
    ];

    const result = getExpensesByCategory(transactions, 0, 2025, 'USD', 4.0);
    expect(result[0].category).toBe('Housing');
    expect(result[1].category).toBe('Entertainment');
    expect(result[2].category).toBe('Food');
  });

  it('excludes income transactions', () => {
    const transactions: Transaction[] = [
      makeTx({ type: 'income', amount: 5000, category: 'Salary', date: '2025-01-10' }),
      makeTx({ type: 'expense', amount: 200, category: 'Food', date: '2025-01-10' }),
    ];

    const result = getExpensesByCategory(transactions, 0, 2025, 'USD', 4.0);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Food');
  });

  it('assigns colors from CATEGORY_COLORS', () => {
    const transactions: Transaction[] = [
      makeTx({ type: 'expense', amount: 200, category: 'Food', date: '2025-01-10' }),
    ];

    const result = getExpensesByCategory(transactions, 0, 2025, 'USD', 4.0);
    expect(result[0].color).toBe('#ec4899'); // Food color
  });

  it('uses default color for unknown categories', () => {
    const transactions: Transaction[] = [
      makeTx({ type: 'expense', amount: 200, category: 'Other', date: '2025-01-10' }),
    ];

    const result = getExpensesByCategory(transactions, 0, 2025, 'USD', 4.0);
    expect(result[0].color).toBe('#64748b');
  });

  it('handles empty transactions', () => {
    const result = getExpensesByCategory([], 0, 2025, 'USD', 4.0);
    expect(result).toHaveLength(0);
  });

  it('converts mixed currencies', () => {
    const transactions: Transaction[] = [
      makeTx({ type: 'expense', amount: 400, category: 'Food', currency: 'PLN', date: '2025-01-10' }),
    ];

    // 400 PLN / 4.0 = 100 USD
    const result = getExpensesByCategory(transactions, 0, 2025, 'USD', 4.0);
    expect(result[0].amount).toBe(100);
  });

  it('uses per-transaction exchangeRateAtTime instead of global rate', () => {
    const transactions: Transaction[] = [
      makeTx({ type: 'expense', amount: 400, category: 'Food', currency: 'PLN', date: '2025-01-10', exchangeRateAtTime: 4.0 }),
    ];

    // Per-tx rate is 4.0, global rate is 5.0. Should use 4.0: 400/4.0 = 100 USD
    const result = getExpensesByCategory(transactions, 0, 2025, 'USD', 5.0);
    expect(result[0].amount).toBe(100);
  });

  it('falls back to global rate when exchangeRateAtTime is undefined', () => {
    const transactions: Transaction[] = [
      makeTx({ type: 'expense', amount: 500, category: 'Food', currency: 'PLN', date: '2025-01-10' }),
    ];

    // No per-tx rate, global rate is 5.0: 500/5.0 = 100 USD
    const result = getExpensesByCategory(transactions, 0, 2025, 'USD', 5.0);
    expect(result[0].amount).toBe(100);
  });
});
