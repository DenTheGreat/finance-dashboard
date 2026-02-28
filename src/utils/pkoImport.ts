import type { Currency, ExpenseCategory, IncomeCategory } from '../types';

// Known PKO BP CSV column headers (Polish)
const PKO_COLUMNS = {
  date: ['data operacji', 'data transakcji', 'data księgowania'],
  valueDate: ['data waluty'],
  type: ['typ transakcji', 'rodzaj transakcji'],
  amount: ['kwota', 'kwota transakcji'],
  currency: ['waluta'],
  balance: ['saldo po transakcji', 'saldo'],
  description: ['opis transakcji', 'tytuł', 'tytul', 'tytuł transakcji'],
  counterparty: ['nadawca / odbiorca', 'nadawca/odbiorca', 'nazwa kontrahenta', 'kontrahent'],
  account: ['numer rachunku', 'rachunek'],
};

// Auto-categorization keywords
const CATEGORY_KEYWORDS: Record<string, ExpenseCategory | IncomeCategory> = {
  // Housing
  'czynsz': 'Housing',
  'wynajem': 'Housing',
  'mieszkanie': 'Housing',
  'rent': 'Housing',
  'mortgage': 'Housing',
  'hipoteka': 'Housing',
  // Food
  'biedronka': 'Food',
  'lidl': 'Food',
  'żabka': 'Food',
  'zabka': 'Food',
  'auchan': 'Food',
  'carrefour': 'Food',
  'kaufland': 'Food',
  'stokrotka': 'Food',
  'netto': 'Food',
  'restaurant': 'Food',
  'restauracja': 'Food',
  'mcdonalds': 'Food',
  'kfc': 'Food',
  'uber eats': 'Food',
  'glovo': 'Food',
  'bolt food': 'Food',
  'pyszne': 'Food',
  // Transportation
  'uber': 'Transportation',
  'bolt': 'Transportation',
  'orlen': 'Transportation',
  'bp': 'Transportation',
  'shell': 'Transportation',
  'paliwo': 'Transportation',
  'mpk': 'Transportation',
  'ztm': 'Transportation',
  'koleje': 'Transportation',
  'pkp': 'Transportation',
  'flixbus': 'Transportation',
  'parking': 'Transportation',
  // Utilities
  'pge': 'Utilities',
  'tauron': 'Utilities',
  'enea': 'Utilities',
  'energa': 'Utilities',
  'wodociągi': 'Utilities',
  'wodociagi': 'Utilities',
  'internet': 'Utilities',
  'orange': 'Utilities',
  'play': 'Utilities',
  't-mobile': 'Utilities',
  'plus': 'Utilities',
  // Entertainment
  'netflix': 'Entertainment',
  'spotify': 'Entertainment',
  'hbo': 'Entertainment',
  'disney': 'Entertainment',
  'cinema': 'Entertainment',
  'kino': 'Entertainment',
  'multikino': 'Entertainment',
  'helios': 'Entertainment',
  // Shopping
  'allegro': 'Shopping',
  'amazon': 'Shopping',
  'zalando': 'Shopping',
  'mediamarkt': 'Shopping',
  'media markt': 'Shopping',
  'rtv euro': 'Shopping',
  'ikea': 'Shopping',
  'decathlon': 'Shopping',
  'rossmann': 'Shopping',
  'hebe': 'Shopping',
  // Healthcare
  'apteka': 'Healthcare',
  'pharmacy': 'Healthcare',
  'lekarz': 'Healthcare',
  'doctor': 'Healthcare',
  'medicover': 'Healthcare',
  'luxmed': 'Healthcare',
  'enel-med': 'Healthcare',
  // Insurance
  'ubezpieczenie': 'Insurance',
  'pzu': 'Insurance',
  'warta': 'Insurance',
  'ergo hestia': 'Insurance',
  // Education
  'uczelnia': 'Education',
  'szkoła': 'Education',
  'kurs': 'Education',
  'udemy': 'Education',
  'coursera': 'Education',
  // Subscriptions
  'subskrypcja': 'Subscriptions',
  'subscription': 'Subscriptions',
  'apple': 'Subscriptions',
  'google storage': 'Subscriptions',
  'youtube premium': 'Subscriptions',
  // Income
  'wynagrodzenie': 'Salary',
  'przelew z tytulu wynagrodzenia': 'Salary',
  'salary': 'Salary',
  'pensja': 'Salary',
};

function detectCategory(description: string): ExpenseCategory | IncomeCategory {
  const lower = description.toLowerCase();
  for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return category;
    }
  }
  return 'Other';
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
  for (const candidate of candidates) {
    const idx = normalizedHeaders.indexOf(candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

function parsePKOAmount(raw: string): number {
  // PKO uses comma as decimal separator, space as thousands separator
  // e.g., "-1 234,56" or "1234,56" or "-50.00"
  let cleaned = raw.trim().replace(/\s/g, '');
  // Handle both comma and dot decimal separators
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // "1.234,56" format
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  return parseFloat(cleaned);
}

function parseDate(raw: string): string {
  const trimmed = raw.trim();
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // Try DD.MM.YYYY or DD-MM-YYYY or DD/MM/YYYY
  const match = trimmed.match(/^(\d{2})[.\-/](\d{2})[.\-/](\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  // Try YYYY.MM.DD
  const match2 = trimmed.match(/^(\d{4})[.\-/](\d{2})[.\-/](\d{2})$/);
  if (match2) return `${match2[1]}-${match2[2]}-${match2[3]}`;
  return trimmed;
}

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
  raw: string[];
}

export interface ParseResult {
  headers: string[];
  transactions: ParsedBankTransaction[];
  autoMapped: boolean;
  mapping: ColumnMapping;
}

function detectDelimiter(firstLine: string): string {
  // Check common delimiters
  const delimiters = [',', ';', '\t', '|'];
  let best = ',';
  let bestCount = 0;
  for (const d of delimiters) {
    const count = firstLine.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(csvText: string): ParseResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { headers: [], transactions: [], autoMapped: false, mapping: { date: 0, amount: 1, description: 2, currency: -1, counterparty: -1 } };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCSVLine(lines[0], delimiter);

  // Try auto-mapping PKO columns
  const dateIdx = findColumnIndex(headers, PKO_COLUMNS.date);
  const amountIdx = findColumnIndex(headers, PKO_COLUMNS.amount);
  const descIdx = findColumnIndex(headers, PKO_COLUMNS.description);
  const currencyIdx = findColumnIndex(headers, PKO_COLUMNS.currency);
  const counterpartyIdx = findColumnIndex(headers, PKO_COLUMNS.counterparty);

  const autoMapped = dateIdx !== -1 && amountIdx !== -1 && descIdx !== -1;

  const mapping: ColumnMapping = {
    date: dateIdx !== -1 ? dateIdx : 0,
    amount: amountIdx !== -1 ? amountIdx : 1,
    description: descIdx !== -1 ? descIdx : 2,
    currency: currencyIdx,
    counterparty: counterpartyIdx,
  };

  const transactions: ParsedBankTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i], delimiter);
    if (fields.length < 2) continue;

    const rawAmount = fields[mapping.amount] || '0';
    const amount = parsePKOAmount(rawAmount);
    if (isNaN(amount) || amount === 0) continue;

    const description = fields[mapping.description] || '';
    const counterparty = mapping.counterparty >= 0 ? (fields[mapping.counterparty] || '') : '';
    const fullDesc = counterparty ? `${counterparty} - ${description}` : description;

    const rawCurrency = mapping.currency >= 0 ? (fields[mapping.currency] || '').trim().toUpperCase() : '';
    const currency: Currency = rawCurrency === 'PLN' ? 'PLN' : rawCurrency === 'USD' ? 'USD' : 'PLN';

    const isIncome = amount > 0;
    const category = detectCategory(fullDesc);

    transactions.push({
      date: parseDate(fields[mapping.date] || ''),
      amount: Math.abs(amount),
      description: fullDesc.slice(0, 200),
      currency,
      counterparty,
      suggestedCategory: isIncome && category === 'Other' ? 'Other Income' : category,
      suggestedType: isIncome ? 'income' : 'expense',
      raw: fields,
    });
  }

  return { headers, transactions, autoMapped, mapping };
}
