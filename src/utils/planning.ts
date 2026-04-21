import type { PlannedExpense, ExpenseCategory, AppData, Transaction } from '../types';

export function isExpenseApplicable(expense: PlannedExpense, month: string): boolean {
  if (!expense.isActive) {
    return false;
  }

  const [year, monthNum] = month.split('-').map(Number);
  const monthStart = new Date(year, monthNum - 1, 1);
  const monthEnd = new Date(year, monthNum, 0);

  const expenseStart = new Date(expense.startDate);
  if (expenseStart > monthEnd) {
    return false;
  }

  if (expense.endDate) {
    const expenseEnd = new Date(expense.endDate);
    if (expenseEnd < monthStart) {
      return false;
    }
  }

  if (expense.recurrence === 'once') {
    return expenseStart >= monthStart && expenseStart <= monthEnd;
  }

  if (expense.recurrence === 'yearly') {
    const startMonth = expenseStart.getMonth();
    const startDay = expenseStart.getDate();
    return startMonth === monthNum - 1 && startDay <= monthEnd.getDate();
  }

  return true;
}

export function getPlannedExpensesForMonth(
  expenses: PlannedExpense[],
  month: string,
): PlannedExpense[] {
  return expenses.filter((expense) => isExpenseApplicable(expense, month));
}

interface CategoryComparison {
  category: ExpenseCategory;
  planned: number;
  actual: number;
  remaining: number;
}

interface PlannedVsActualResult {
  byCategory: CategoryComparison[];
  totalPlanned: number;
  totalActual: number;
  totalRemaining: number;
}

function getTransactionsForMonth(transactions: Transaction[], month: string): Transaction[] {
  const [year, monthNum] = month.split('-').map(Number);
  return transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === monthNum - 1;
  });
}

function groupTransactionsByCategory(
  transactions: Transaction[],
): Map<ExpenseCategory, number> {
  const map = new Map<ExpenseCategory, number>();
  for (const t of transactions) {
    if (t.type === 'expense') {
      const category = t.category as ExpenseCategory;
      const current = map.get(category) || 0;
      map.set(category, current + t.amount);
    }
  }
  return map;
}

export function calculatePlannedVsActual(
  data: AppData,
  month: string,
): PlannedVsActualResult {
  const plannedExpenses = getPlannedExpensesForMonth(data.plannedExpenses, month);
  const monthTransactions = getTransactionsForMonth(data.transactions, month);
  const actualByCategory = groupTransactionsByCategory(monthTransactions);

  const categorySet = new Set<ExpenseCategory>();
  for (const expense of plannedExpenses) {
    categorySet.add(expense.category);
  }
  for (const category of Array.from(actualByCategory.keys())) {
    categorySet.add(category);
  }

  const byCategory: CategoryComparison[] = [];
  let totalPlanned = 0;
  let totalActual = 0;

  for (const category of Array.from(categorySet)) {
    const planned = plannedExpenses
      .filter((e) => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0);

    const actual = actualByCategory.get(category) || 0;

    totalPlanned += planned;
    totalActual += actual;

    byCategory.push({
      category,
      planned,
      actual,
      remaining: planned + actual,
    });
  }

  byCategory.sort((a, b) => b.planned - a.planned);

  return {
    byCategory,
    totalPlanned,
    totalActual,
    totalRemaining: totalPlanned + totalActual,
  };
}

export function getUpcomingPlannedExpenses(
  expenses: PlannedExpense[],
  fromDate: Date,
  daysAhead: number = 30,
): PlannedExpense[] {
  const endDate = new Date(fromDate);
  endDate.setDate(endDate.getDate() + daysAhead);

  return expenses.filter((expense) => {
    if (!expense.isActive) {
      return false;
    }

    const expenseStart = new Date(expense.startDate);
    if (expenseStart > endDate) {
      return false;
    }

    if (expense.endDate) {
      const expenseEnd = new Date(expense.endDate);
      if (expenseEnd < fromDate) {
        return false;
      }
    }

    if (expense.recurrence === 'once') {
      return expenseStart >= fromDate && expenseStart <= endDate;
    }

    if (expense.recurrence === 'yearly') {
      const startMonth = expenseStart.getMonth();
      const startDay = expenseStart.getDate();
      return (
        startMonth >= fromDate.getMonth() &&
        startMonth <= endDate.getMonth() &&
        startDay >= fromDate.getDate() &&
        startDay <= endDate.getDate()
      );
    }

    if (expense.recurrence === 'monthly') {
      const expenseDay = expenseStart.getDate();
      const fromDay = fromDate.getDate();
      const endDay = endDate.getDate();

      if (fromDate.getMonth() === endDate.getMonth()) {
        return expenseDay >= fromDay && expenseDay <= endDay;
      }

      if (fromDate.getMonth() === expenseStart.getMonth()) {
        return expenseDay >= fromDay;
      }

      if (endDate.getMonth() === expenseStart.getMonth()) {
        return expenseDay <= endDay;
      }

      return true;
    }

    return false;
  });
}
