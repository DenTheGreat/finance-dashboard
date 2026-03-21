import type { Currency, ExpenseCategory, IncomeCategory } from '../../types';

export type DetectedBank = 'PKO' | 'Monobank' | 'PrivatBank' | 'unknown';

export interface ColumnMapping {
  date: number;
  amount: number;
  description: number;
  currency: number;
  counterparty: number;
}

export interface ParsedBankTransaction {
  date: string;
  amount: number;
  description: string;
  currency: Currency;
  counterparty: string;
  suggestedCategory: ExpenseCategory | IncomeCategory;
  suggestedType: 'income' | 'expense';
  extractedExchangeRate?: number;
  raw: string[];
}

export interface ParseResult {
  headers: string[];
  transactions: ParsedBankTransaction[];
  autoMapped: boolean;
  mapping: ColumnMapping;
  detectedCurrency?: Currency;
  detectedBank?: DetectedBank;
}
