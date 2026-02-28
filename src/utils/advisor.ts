import type { Transaction, Currency } from '../types';
import { CATEGORY_COLORS } from '../types';
import { convertCurrency } from './currency';

interface BudgetBreakdown {
  totalIncome: number;
  totalExpenses: number;
  needs: number;
  wants: number;
  savings: number;
  debtPayments: number;
  netBalance: number;
}

interface SavingsAdvice {
  optimalSavingsRate: number;
  optimalSavingsAmount: number;
  currentSavingsRate: number;
  needsPercent: number;
  wantsPercent: number;
  savingsPercent: number;
  status: 'excellent' | 'good' | 'fair' | 'needs_attention';
  tips: string[];
}

const NEEDS = new Set([
  'Housing', 'Transportation', 'Food', 'Utilities', 'Healthcare', 'Insurance',
]);

const WANTS = new Set([
  'Entertainment', 'Shopping', 'Education', 'Personal', 'Subscriptions',
]);

export function getMonthlyBreakdown(
  transactions: Transaction[],
  month: number, // 0-indexed
  year: number,
  primaryCurrency: Currency,
  exchangeRate: number,
): BudgetBreakdown {
  const monthTransactions = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  let totalIncome = 0;
  let totalExpenses = 0;
  let needs = 0;
  let wants = 0;
  let debtPayments = 0;

  for (const t of monthTransactions) {
    const rate = t.exchangeRateAtTime ?? exchangeRate;
    const amount = convertCurrency(t.amount, t.currency, primaryCurrency, rate);
    if (t.type === 'income') {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
      if (t.category === 'Debt Payment') {
        debtPayments += amount;
      } else if (NEEDS.has(t.category)) {
        needs += amount;
      } else if (WANTS.has(t.category)) {
        wants += amount;
      } else {
        wants += amount; // uncategorized goes to wants
      }
    }
  }

  return {
    totalIncome,
    totalExpenses,
    needs,
    wants,
    savings: totalIncome - totalExpenses,
    debtPayments,
    netBalance: totalIncome - totalExpenses,
  };
}

export function getSavingsAdvice(breakdown: BudgetBreakdown): SavingsAdvice {
  const { totalIncome, needs, wants, savings } = breakdown;

  if (totalIncome === 0) {
    return {
      optimalSavingsRate: 20,
      optimalSavingsAmount: 0,
      currentSavingsRate: 0,
      needsPercent: 0,
      wantsPercent: 0,
      savingsPercent: 0,
      status: 'needs_attention',
      tips: ['Start by tracking your income to get personalized advice.'],
    };
  }

  const needsPercent = (needs / totalIncome) * 100;
  const wantsPercent = (wants / totalIncome) * 100;
  const savingsPercent = (savings / totalIncome) * 100;
  const currentSavingsRate = savingsPercent;

  // 50/30/20 rule as baseline, adjusted for debt
  let optimalRate = 20;
  if (breakdown.debtPayments > 0) {
    // If paying debt, aim for at least 10% savings + debt payments
    optimalRate = Math.max(10, 20 - (breakdown.debtPayments / totalIncome) * 100);
  }

  const tips: string[] = [];
  let status: SavingsAdvice['status'];

  if (savingsPercent >= 20) {
    status = 'excellent';
    tips.push('You\'re saving 20%+ of your income. Keep it up!');
    if (needsPercent > 50) {
      tips.push('Your needs spending is above 50%. See if you can reduce housing or transportation costs.');
    }
  } else if (savingsPercent >= 10) {
    status = 'good';
    tips.push(`You're saving ${savingsPercent.toFixed(1)}%. Try to reach 20% for optimal financial health.`);
    if (wantsPercent > 30) {
      tips.push('Consider cutting back on wants - entertainment, shopping, or subscriptions.');
    }
  } else if (savingsPercent >= 0) {
    status = 'fair';
    tips.push('You\'re breaking even or barely saving. Look for areas to cut expenses.');
    if (needsPercent > 60) {
      tips.push('Your essential expenses are high. Consider cheaper alternatives for housing or transport.');
    }
    if (wantsPercent > 30) {
      tips.push('Reduce discretionary spending to boost your savings rate.');
    }
  } else {
    status = 'needs_attention';
    tips.push('You\'re spending more than you earn. This needs immediate attention.');
    tips.push('Prioritize cutting non-essential expenses first.');
    if (wantsPercent > 20) {
      tips.push(`Cut wants spending by ${((wantsPercent - 20) * totalIncome / 100).toFixed(0)} to start saving.`);
    }
  }

  return {
    optimalSavingsRate: optimalRate,
    optimalSavingsAmount: (totalIncome * optimalRate) / 100,
    currentSavingsRate,
    needsPercent,
    wantsPercent,
    savingsPercent,
    status,
    tips,
  };
}

export function getExpensesByCategory(
  transactions: Transaction[],
  month: number,
  year: number,
  primaryCurrency: Currency,
  exchangeRate: number,
): { category: string; amount: number; color: string }[] {
  const monthExpenses = transactions.filter((t) => {
    const d = new Date(t.date);
    return t.type === 'expense' && d.getMonth() === month && d.getFullYear() === year;
  });

  const byCategory = new Map<string, number>();
  for (const t of monthExpenses) {
    const rate = t.exchangeRateAtTime ?? exchangeRate;
    const amount = convertCurrency(t.amount, t.currency, primaryCurrency, rate);
    byCategory.set(t.category, (byCategory.get(t.category) || 0) + amount);
  }

  return Array.from(byCategory.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      color: CATEGORY_COLORS[category] || '#64748b',
    }))
    .sort((a, b) => b.amount - a.amount);
}
