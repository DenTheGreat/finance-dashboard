import { addMonths, addYears, format, isBefore, isAfter, startOfDay } from 'date-fns';
import type { PlannedExpense, PlannedIncome, Currency, Recurrence } from '../../types';
import { convertCurrency } from '../../utils/currency';

export type Kind = 'income' | 'expense';
export type PlannedItem = PlannedExpense | PlannedIncome;

export interface FormState {
  name: string;
  amount: string;
  currency: Currency;
  category: string;
  recurrence: Recurrence;
  startDate: string;
  endDate: string;
  isActive: boolean;
  notes: string;
}

export type DeleteTarget = { id: string; kind: Kind; name: string };

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  once: 'Once',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export const defaultForm = (primaryCurrency: Currency, kind: Kind): FormState => ({
  name: '',
  amount: '',
  currency: primaryCurrency,
  category: kind === 'income' ? 'Salary' : 'Other',
  recurrence: 'monthly',
  startDate: format(new Date(), 'yyyy-MM-dd'),
  endDate: '',
  isActive: true,
  notes: '',
});

export function getNextDueDate(item: PlannedItem): Date | null {
  if (!item.isActive) return null;
  const start = startOfDay(new Date(item.startDate));
  const now = startOfDay(new Date());
  if (item.recurrence === 'once') return isBefore(start, now) ? null : start;
  let next = start;
  const end = item.endDate ? startOfDay(new Date(item.endDate)) : null;
  if (isAfter(start, now)) return start;
  let iterations = 0;
  while (isBefore(next, now) && iterations < 1200) {
    next = item.recurrence === 'monthly' ? addMonths(next, 1) : addYears(next, 1);
    iterations++;
  }
  if (end && isAfter(next, end)) return null;
  return next;
}

export function formatNextDueDate(date: Date | null, formatDate: (iso: string) => string): string {
  if (!date) return '—';
  return formatDate(format(date, 'yyyy-MM-dd'));
}

export function isApplicableToMonth(item: PlannedItem, monthStr: string): boolean {
  const [year, month] = monthStr.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const itemStart = new Date(item.startDate);
  const itemEnd = item.endDate ? new Date(item.endDate) : null;
  if (!item.isActive) return false;
  if (itemEnd && itemEnd < monthStart) return false;
  if (itemStart > monthEnd) return false;
  if (item.recurrence === 'once') return itemStart >= monthStart && itemStart <= monthEnd;
  return true;
}

export function monthlyEstimateForMonth(
  items: PlannedItem[],
  monthStr: string,
  primaryCurrency: Currency,
  exchangeRate: number,
  exchangeRates?: Record<string, number>,
): number {
  return items
    .filter((i) => isApplicableToMonth(i, monthStr))
    .reduce((sum, i) => {
      const converted = convertCurrency(i.amount, i.currency, primaryCurrency, exchangeRate, exchangeRates);
      if (i.recurrence === 'monthly') return sum + converted;
      if (i.recurrence === 'yearly') return sum + converted / 12;
      return sum + converted;
    }, 0);
}

export type TransactionList = {
  id: string;
  amount: number;
  date: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
}[];

export function isPaidInMonth(
  item: PlannedItem,
  monthStr: string,
  transactions: TransactionList,
): boolean {
  if (!isApplicableToMonth(item, monthStr)) return false;
  const [year, month] = monthStr.split('-').map(Number);
  const monthStart = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
  const monthEnd = format(new Date(year, month, 0), 'yyyy-MM-dd');
  return transactions.some((tx) => {
    if (tx.date < monthStart || tx.date > monthEnd) return false;
    const amountMatch = Math.abs(tx.amount - item.amount) < 0.01;
    const descriptionMatch =
      tx.description.toLowerCase().includes(item.name.toLowerCase()) ||
      item.name.toLowerCase().includes(tx.description.toLowerCase());
    return amountMatch && descriptionMatch;
  });
}
