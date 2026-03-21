import type { Currency, ExpenseCategory, IncomeCategory, CategoryRule } from '../types';
import { loadCustomRules } from './customRules';

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

// Known Monobank CSV column headers (Ukrainian, note: "i" in "Дата i час" is LATIN i)
const MONO_COLUMNS = {
  date: ['дата i час операції', 'дата і час операції'],
  description: ['деталі операції'],
  mcc: ['mcc'],
  amountCard: ['сума в валюті картки (uah)', 'сума в валюті картки'],
  amountOp: ['сума в валюті операції'],
  currency: ['валюта'],
  rate: ['курс'],
  commission: ['сума комісій (uah)'],
  cashback: ['сума кешбеку (uah)'],
  balance: ['залишок після операції'],
};

// Known PrivatBank CSV column headers
const PRIVAT_COLUMNS = {
  date: ['дата операції', 'дата', 'trandate'],
  description: ['опис операції', 'деталі операції', 'description'],
  category: ['категорія'],
  card: ['картка', 'card'],
  amount: ['сума (uah)', 'сума', 'amount', 'cardamount'],
  currency: ['валюта операції', 'валюта'],
  amountOp: ['сума'],
  balance: ['залишок', 'rest'],
};

// MCC-based category detection for Monobank
const MCC_CATEGORIES: Record<string, ExpenseCategory | IncomeCategory> = {
  // Food
  '5411': 'Food', '5412': 'Food', '5422': 'Food', '5441': 'Food',
  '5451': 'Food', '5462': 'Food', '5499': 'Food', '5812': 'Food',
  '5813': 'Food', '5814': 'Food',
  // Transportation
  '4011': 'Transportation', '4111': 'Transportation', '4112': 'Transportation',
  '4121': 'Transportation', '4131': 'Transportation', '4789': 'Transportation',
  '5541': 'Transportation', '5542': 'Transportation', '7512': 'Transportation',
  // Healthcare
  '5912': 'Healthcare', '8011': 'Healthcare', '8021': 'Healthcare',
  '8031': 'Healthcare', '8041': 'Healthcare', '8042': 'Healthcare',
  '8043': 'Healthcare', '8049': 'Healthcare', '8050': 'Healthcare',
  '8062': 'Healthcare', '8071': 'Healthcare', '8099': 'Healthcare',
  // Entertainment
  '7832': 'Entertainment', '7841': 'Entertainment', '7911': 'Entertainment',
  '7922': 'Entertainment', '7929': 'Entertainment', '7932': 'Entertainment',
  '7933': 'Entertainment', '7941': 'Entertainment', '7991': 'Entertainment',
  '7993': 'Entertainment', '7994': 'Entertainment', '7995': 'Entertainment',
  '7996': 'Entertainment', '7997': 'Entertainment', '7998': 'Entertainment',
  '7999': 'Entertainment',
  // Shopping
  '5200': 'Shopping', '5211': 'Shopping', '5231': 'Shopping',
  '5251': 'Shopping', '5261': 'Shopping', '5271': 'Shopping',
  '5300': 'Shopping', '5310': 'Shopping', '5311': 'Shopping',
  '5331': 'Shopping', '5399': 'Shopping', '5611': 'Shopping',
  '5621': 'Shopping', '5631': 'Shopping', '5641': 'Shopping',
  '5651': 'Shopping', '5661': 'Shopping', '5691': 'Shopping',
  '5699': 'Shopping', '5712': 'Shopping', '5713': 'Shopping',
  '5714': 'Shopping', '5719': 'Shopping', '5722': 'Shopping',
  '5732': 'Shopping', '5733': 'Shopping', '5734': 'Shopping',
  '5735': 'Shopping', '5921': 'Shopping', '5931': 'Shopping',
  '5941': 'Shopping', '5942': 'Shopping', '5943': 'Shopping',
  '5944': 'Shopping', '5945': 'Shopping', '5946': 'Shopping',
  '5947': 'Shopping', '5948': 'Shopping', '5949': 'Shopping',
  '5950': 'Shopping', '5970': 'Shopping', '5971': 'Shopping',
  '5972': 'Shopping', '5973': 'Shopping', '5977': 'Shopping',
  '5978': 'Shopping', '5983': 'Shopping', '5992': 'Shopping',
  '5993': 'Shopping', '5994': 'Shopping', '5995': 'Shopping',
  '5996': 'Shopping', '5997': 'Shopping', '5998': 'Shopping',
  '5999': 'Shopping',
  // Utilities
  '4814': 'Utilities', '4816': 'Utilities', '4899': 'Utilities',
  '4900': 'Utilities',
  // Education
  '8211': 'Education', '8220': 'Education', '8241': 'Education',
  '8244': 'Education', '8249': 'Education', '8299': 'Education',
  // Insurance
  '6300': 'Insurance', '6381': 'Insurance',
  // Subscriptions
  '5815': 'Subscriptions', '5816': 'Subscriptions', '5817': 'Subscriptions',
  '5818': 'Subscriptions',
  // Housing
  '6513': 'Housing',
  // Personal
  '7230': 'Personal', '7251': 'Personal', '7298': 'Personal',
};

// Auto-categorization keywords (order matters: more specific entries must come before general ones)
const CATEGORY_KEYWORDS: Array<[string, ExpenseCategory | IncomeCategory]> = [
  // Housing
  ['czynsz', 'Housing'],
  ['wynajem', 'Housing'],
  ['mieszkanie', 'Housing'],
  ['rent', 'Housing'],
  ['mortgage', 'Housing'],
  ['hipoteka', 'Housing'],
  ['ewa ambroziak', 'Housing'],
  // Food — specific multi-word matches before single words like 'uber'
  ['uber eats', 'Food'],
  ['bolt food', 'Food'],
  ['green caffe nero', 'Food'],
  ['caffe nero', 'Food'],
  ['deli padre', 'Food'],
  ['magia ditalia', 'Food'],
  ['gelati', 'Food'],
  ['biedronka', 'Food'],
  ['lidl', 'Food'],
  ['żabka', 'Food'],
  ['zabka', 'Food'],
  ['auchan', 'Food'],
  ['carrefour', 'Food'],
  ['kaufland', 'Food'],
  ['stokrotka', 'Food'],
  ['netto', 'Food'],
  ['restaurant', 'Food'],
  ['restauracja', 'Food'],
  ['mcdonalds', 'Food'],
  ['kfc', 'Food'],
  ['glovo', 'Food'],
  ['pyszne', 'Food'],
  ['stolik', 'Food'],
  ['panda mart', 'Food'],
  ['la fabbrica', 'Food'],
  ['kasap', 'Food'],
  ['bao dao', 'Food'],
  ['goraco polecam', 'Food'],
  ['gorąco polecam', 'Food'],
  ['asian food market', 'Food'],
  ['da grasso', 'Food'],
  ['green lotus', 'Food'],
  // Transportation
  ['uber', 'Transportation'],
  ['bolt', 'Transportation'],
  ['orlen', 'Transportation'],
  ['bp', 'Transportation'],
  ['shell', 'Transportation'],
  ['paliwo', 'Transportation'],
  ['mpk', 'Transportation'],
  ['ztm', 'Transportation'],
  ['koleje', 'Transportation'],
  ['pkp', 'Transportation'],
  ['flixbus', 'Transportation'],
  ['parking', 'Transportation'],
  ['biletomat', 'Transportation'],
  // Utilities
  ['pge', 'Utilities'],
  ['tauron', 'Utilities'],
  ['enea', 'Utilities'],
  ['energa', 'Utilities'],
  ['wodociągi', 'Utilities'],
  ['wodociagi', 'Utilities'],
  ['internet', 'Utilities'],
  ['orange', 'Utilities'],
  ['play', 'Utilities'],
  ['t-mobile', 'Utilities'],
  ['plus', 'Utilities'],
  // Entertainment
  ['netflix', 'Entertainment'],
  ['spotify', 'Entertainment'],
  ['hbo', 'Entertainment'],
  ['disney', 'Entertainment'],
  ['cinema', 'Entertainment'],
  ['kino', 'Entertainment'],
  ['multikino', 'Entertainment'],
  ['helios', 'Entertainment'],
  // Shopping
  ['allegro', 'Shopping'],
  ['amazon', 'Shopping'],
  ['zalando', 'Shopping'],
  ['mediamarkt', 'Shopping'],
  ['media markt', 'Shopping'],
  ['rtv euro', 'Shopping'],
  ['ikea', 'Shopping'],
  ['decathlon', 'Shopping'],
  ['rossmann', 'Shopping'],
  ['hebe', 'Shopping'],
  ['aliexpress', 'Shopping'],
  ['zeccer', 'Shopping'],
  ['pepco', 'Shopping'],
  ['nova post', 'Shopping'],
  ['sklep zoologiczny', 'Shopping'],
  ['lite e-commerce', 'Shopping'],
  ['jmdif', 'Shopping'],
  ['mcdonalds', 'Food'],
  ['ziko apteka', 'Healthcare'],
  ['orange polska', 'Utilities'],
  // Healthcare
  ['nata dent', 'Healthcare'],
  ['stomatologi', 'Healthcare'],
  ['alfa lek', 'Healthcare'],
  ['receptomat', 'Healthcare'],
  ['apteka melissa', 'Healthcare'],
  ['melissa', 'Healthcare'],
  ['apteka', 'Healthcare'],
  ['pharmacy', 'Healthcare'],
  ['lekarz', 'Healthcare'],
  ['doctor', 'Healthcare'],
  ['medicover', 'Healthcare'],
  ['luxmed', 'Healthcare'],
  ['enel-med', 'Healthcare'],
  // Insurance
  ['ubezpieczenie', 'Insurance'],
  ['pzu', 'Insurance'],
  ['warta', 'Insurance'],
  ['ergo hestia', 'Insurance'],
  // Education
  ['uczelnia', 'Education'],
  ['szkoła', 'Education'],
  ['kurs', 'Education'],
  ['udemy', 'Education'],
  ['coursera', 'Education'],
  // Entertainment
  ['g2a.com', 'Entertainment'],
  ['g2a', 'Entertainment'],
  // Subscriptions
  ['higgsfield', 'Subscriptions'],
  ['subskrypcja', 'Subscriptions'],
  ['subscription', 'Subscriptions'],
  ['apple.com/bill', 'Subscriptions'],
  ['apple', 'Subscriptions'],
  ['google storage', 'Subscriptions'],
  ['youtube premium', 'Subscriptions'],
  // Personal
  ['barbershop', 'Personal'],
  ['brodski', 'Personal'],
  ['ww finance', 'Personal'],
  ['usługi księgowe', 'Personal'],
  ['księgow', 'Personal'],
  // Transfers (money sent to other people)
  ['odbiorca przelewu na telefon', 'Transfers'],
  ['przelew na telefon', 'Transfers'],
  ['transfergo', 'Transfers'],
  ['portmone', 'Transfers'],
  ['svitlana', 'Transfers'],
  ['zwrot kosztów', 'Transfers'],
  // Other
  ['wwf', 'Other'],
  // Income
  ['wynagrodzenie', 'Salary'],
  ['przelew z tytulu wynagrodzenia', 'Salary'],
  ['salary', 'Salary'],
  ['pensja', 'Salary'],
];

function detectCategory(description: string, appRules?: CategoryRule[]): ExpenseCategory | IncomeCategory {
  const lower = description.toLowerCase();
  // Check app-level rules first (shared across users via export/import)
  if (appRules) {
    for (const rule of appRules) {
      if (lower.includes(rule.keyword)) {
        return rule.category as ExpenseCategory | IncomeCategory;
      }
    }
  }
  // Then check localStorage custom rules (user-local overrides)
  const customRules = loadCustomRules();
  for (const rule of customRules) {
    if (lower.includes(rule.keyword)) {
      return rule.category as ExpenseCategory | IncomeCategory;
    }
  }
  for (const [keyword, category] of CATEGORY_KEYWORDS) {
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
  // Try DD.MM.YYYY HH:MM:SS or DD.MM.YYYY HH:MM (Monobank / PrivatBank datetime)
  const matchDT = trimmed.match(/^(\d{2})[.\-/](\d{2})[.\-/](\d{4})\s+\d{2}:\d{2}/);
  if (matchDT) return `${matchDT[3]}-${matchDT[2]}-${matchDT[1]}`;
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
  extractedExchangeRate?: number;
  raw: string[];
}

interface PKOExtraInfo {
  description: string;
  counterparty: string;
  exchangeRate?: number;
}

/**
 * Strip a labelled prefix like "Tytuł: " or "Nazwa odbiorcy: " from a field value.
 */
function stripLabel(value: string, label: string): string {
  const prefix = label.endsWith(': ') ? label : label + ': ';
  if (value.startsWith(prefix)) return value.slice(prefix.length).trim();
  return value.trim();
}

/**
 * Extract the merchant name from a PKO location string.
 * Format: "Lokalizacja: Adres: MERCHANT Miasto: CITY Kraj: COUNTRY"
 * or:     "Lokalizacja: Adres: MERCHANT"
 */
function extractMerchant(locationField: string): string {
  // Remove leading "Lokalizacja: " if present
  let s = locationField.replace(/^Lokalizacja:\s*/i, '').trim();
  // Remove leading "Adres: " if present
  s = s.replace(/^Adres:\s*/i, '').trim();
  // Take everything up to " Miasto:" or " Kraj:"
  const stopMatch = s.match(/\s+Miasto:|\s+Kraj:/i);
  if (stopMatch && stopMatch.index !== undefined) {
    return s.slice(0, stopMatch.index).trim();
  }
  return s.trim();
}

/**
 * Parse extra (unnamed) columns 6-10 from a PKO BP CSV row according to
 * the transaction type in col2.
 *
 * @param fields   Full parsed row fields array (0-indexed)
 * @param txType   Value of column 2 ("Typ transakcji")
 */
function extractPKOExtraColumns(fields: string[], txType: string): PKOExtraInfo {
  const type = txType.trim();
  // Helper to safely get a field by index
  const f = (i: number) => (fields[i] ?? '').trim();

  // ---- Card payment / card transfer ----
  if (
    type === 'Płatność kartą' ||
    type === 'Przelew z karty'
  ) {
    // col7: location string with merchant
    const merchant = extractMerchant(f(7));
    const description = merchant || stripLabel(f(6), 'Tytuł');
    return { description, counterparty: merchant };
  }

  // ---- Web payment (mobile code) ----
  if (type === 'Płatność web - kod mobilny') {
    // col8: location with merchant
    const merchant = extractMerchant(f(8));
    const title = stripLabel(f(6), 'Tytuł');
    const description = merchant || title;
    return { description, counterparty: merchant };
  }

  // ---- Currency exchange (income) ----
  if (type === 'WYMIANA W KANTORZE - UZNANIE' || type === 'WYMIANA W KANTORZE - OBCIĄŻENIE') {
    // col9: "Tytuł: FX90710239 USD/PLN 3.6945  2 497,48 PLN -676,00 USD"
    const title = stripLabel(f(9), 'Tytuł');
    // Extract FX rate: "USD/PLN 3.6945" or "PLN/USD 3.6945"
    let exchangeRate: number | undefined;
    const rateMatch = title.match(/[A-Z]{3}\/[A-Z]{3}\s+([\d.,]+)/);
    if (rateMatch) {
      const rateStr = rateMatch[1].replace(',', '.');
      const parsed = parseFloat(rateStr);
      if (!isNaN(parsed)) exchangeRate = parsed;
    }
    // Build human-readable description
    const pairMatch = title.match(/([A-Z]{3}\/[A-Z]{3})/);
    const pair = pairMatch ? pairMatch[1] : 'FX';
    const desc = exchangeRate
      ? `Currency exchange ${pair} @ ${exchangeRate}`
      : `Currency exchange ${pair}`;
    const senderName = stripLabel(f(7), 'Nazwa nadawcy');
    return { description: desc, counterparty: senderName, exchangeRate };
  }

  // ---- Transfer to account / incoming transfer ----
  if (
    type === 'Przelew na konto' ||
    type === 'Przelew na telefon przychodz. wew.' ||
    type === 'Przelew na telefon przychodz. zew.'
  ) {
    // col7: sender name, col8 or col9: Tytuł
    const counterparty = stripLabel(f(7), 'Nazwa nadawcy') || stripLabel(f(7), 'Nazwa odbiorcy');
    // col8 for phone internal has "Tytuł:", col9 for konto
    let title = '';
    if (f(8).startsWith('Tytuł:')) {
      title = stripLabel(f(8), 'Tytuł');
    } else if (f(9).startsWith('Tytuł:')) {
      title = stripLabel(f(9), 'Tytuł');
    }
    const description = title ? `${counterparty} - ${title}` : counterparty;
    return { description, counterparty };
  }

  // ---- Transfer from account (outgoing) ----
  if (type === 'Przelew z rachunku') {
    const counterparty = stripLabel(f(7), 'Nazwa odbiorcy');
    const title = stripLabel(f(8), 'Tytuł');
    const description = title ? `${counterparty} - ${title}` : counterparty;
    return { description, counterparty };
  }

  // ---- Direct debit (Obciążenie) ----
  if (type === 'Obciążenie') {
    const counterparty = stripLabel(f(6), 'Nazwa odbiorcy');
    const title = stripLabel(f(8), 'Tytuł');
    const description = title ? `${counterparty} - ${title}` : counterparty;
    return { description, counterparty };
  }

  // ---- Direct debit mandate (Polecenie Zapłaty) ----
  if (type === 'Polecenie Zapłaty') {
    const counterparty = stripLabel(f(7), 'Nazwa odbiorcy');
    const title = stripLabel(f(9), 'Tytuł');
    const description = title ? `${counterparty} - ${title}` : counterparty;
    return { description, counterparty };
  }

  // ---- Fallback: use col6 as description ----
  return { description: f(6), counterparty: '' };
}

export type DetectedBank = 'PKO' | 'Monobank' | 'PrivatBank' | 'unknown';

export interface ParseResult {
  headers: string[];
  transactions: ParsedBankTransaction[];
  autoMapped: boolean;
  mapping: ColumnMapping;
  detectedCurrency?: Currency;
  detectedBank?: DetectedBank;
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

export function parseCSV(csvText: string, appRules?: CategoryRule[]): ParseResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { headers: [], transactions: [], autoMapped: false, mapping: { date: 0, amount: 1, description: 2, currency: -1, counterparty: -1 }, detectedBank: 'unknown' };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCSVLine(lines[0], delimiter);

  // --- Detect bank format from headers ---
  const monoDateIdx = findColumnIndex(headers, MONO_COLUMNS.date);
  const monoDescIdx = findColumnIndex(headers, MONO_COLUMNS.description);
  const monoAmountCardIdx = findColumnIndex(headers, MONO_COLUMNS.amountCard);
  const isMonobank = monoDateIdx !== -1 && monoDescIdx !== -1 && monoAmountCardIdx !== -1;

  const privatDateIdx = findColumnIndex(headers, PRIVAT_COLUMNS.date);
  const privatDescIdx = findColumnIndex(headers, PRIVAT_COLUMNS.description);
  const privatAmountIdx = findColumnIndex(headers, PRIVAT_COLUMNS.amount);
  const isPrivatBank = !isMonobank && privatDateIdx !== -1 && privatDescIdx !== -1 && privatAmountIdx !== -1;

  // --- Monobank parsing ---
  if (isMonobank) {
    const monoMccIdx = findColumnIndex(headers, MONO_COLUMNS.mcc);
    const monoCurrencyIdx = findColumnIndex(headers, MONO_COLUMNS.currency);
    const monoRateIdx = findColumnIndex(headers, MONO_COLUMNS.rate);

    const mapping: ColumnMapping = {
      date: monoDateIdx,
      amount: monoAmountCardIdx,
      description: monoDescIdx,
      currency: monoCurrencyIdx,
      counterparty: -1,
    };

    const transactions: ParsedBankTransaction[] = [];
    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i], delimiter);
      if (fields.length < 2) continue;

      const rawAmount = fields[monoAmountCardIdx] || '0';
      const amount = parsePKOAmount(rawAmount);
      if (isNaN(amount) || amount === 0) continue;

      const isIncome = amount > 0;
      const description = (fields[monoDescIdx] || '').trim();
      const mcc = monoMccIdx >= 0 ? (fields[monoMccIdx] || '').trim() : '';

      // Currency: Monobank amounts in "Сума в валюті картки (UAH)" are always UAH
      const currency: Currency = 'UAH';

      // Exchange rate from "Курс" column
      let extractedExchangeRate: number | undefined;
      if (monoRateIdx >= 0) {
        const rateStr = (fields[monoRateIdx] || '').trim();
        if (rateStr) {
          const parsed = parseFloat(rateStr.replace(',', '.'));
          if (!isNaN(parsed) && parsed > 0) extractedExchangeRate = parsed;
        }
      }

      // Category: try MCC first, then keyword matching
      let category: ExpenseCategory | IncomeCategory = 'Other';
      if (mcc && MCC_CATEGORIES[mcc]) {
        category = MCC_CATEGORIES[mcc];
      } else {
        category = detectCategory(description, appRules);
      }

      const suggestedCategory = isIncome && category === 'Other' ? 'Other Income' : category;

      const tx: ParsedBankTransaction = {
        date: parseDate(fields[monoDateIdx] || ''),
        amount: Math.abs(amount),
        description: description.slice(0, 200),
        currency,
        counterparty: '',
        suggestedCategory,
        suggestedType: isIncome ? 'income' : 'expense',
        raw: fields,
      };
      if (extractedExchangeRate !== undefined) {
        tx.extractedExchangeRate = extractedExchangeRate;
      }
      transactions.push(tx);
    }

    let detectedCurrency: Currency | undefined = 'UAH';
    return { headers, transactions, autoMapped: true, mapping, detectedCurrency, detectedBank: 'Monobank' };
  }

  // --- PrivatBank parsing ---
  if (isPrivatBank) {
    const privatCurrencyIdx = findColumnIndex(headers, PRIVAT_COLUMNS.currency);

    const mapping: ColumnMapping = {
      date: privatDateIdx,
      amount: privatAmountIdx,
      description: privatDescIdx,
      currency: privatCurrencyIdx,
      counterparty: -1,
    };

    const transactions: ParsedBankTransaction[] = [];
    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i], delimiter);
      if (fields.length < 2) continue;

      const rawAmount = fields[privatAmountIdx] || '0';
      const amount = parsePKOAmount(rawAmount);
      if (isNaN(amount) || amount === 0) continue;

      const isIncome = amount > 0;
      const description = (fields[privatDescIdx] || '').trim();

      // Currency detection
      const rawCurrency = privatCurrencyIdx >= 0 ? (fields[privatCurrencyIdx] || '').trim().toUpperCase() : '';
      const currency: Currency = rawCurrency === 'PLN' ? 'PLN' : rawCurrency === 'USD' ? 'USD' : rawCurrency === 'UAH' ? 'UAH' : 'UAH';

      // Category from PrivatBank's own category column, or keyword matching
      let category: ExpenseCategory | IncomeCategory = detectCategory(description, appRules);

      const suggestedCategory = isIncome && category === 'Other' ? 'Other Income' : category;

      const tx: ParsedBankTransaction = {
        date: parseDate(fields[privatDateIdx] || ''),
        amount: Math.abs(amount),
        description: description.slice(0, 200),
        currency,
        counterparty: '',
        suggestedCategory,
        suggestedType: isIncome ? 'income' : 'expense',
        raw: fields,
      };
      transactions.push(tx);
    }

    // Detect dominant currency
    let detectedCurrency: Currency | undefined;
    if (transactions.length > 0) {
      const counts: Partial<Record<Currency, number>> = {};
      for (const tx of transactions) {
        counts[tx.currency] = (counts[tx.currency] ?? 0) + 1;
      }
      detectedCurrency = (Object.entries(counts) as [Currency, number][]).reduce(
        (best, [cur, count]) => (count > (counts[best] ?? 0) ? cur : best),
        transactions[0].currency,
      );
    }

    return { headers, transactions, autoMapped: true, mapping, detectedCurrency, detectedBank: 'PrivatBank' };
  }

  // --- PKO BP parsing (existing logic) ---
  const dateIdx = findColumnIndex(headers, PKO_COLUMNS.date);
  const amountIdx = findColumnIndex(headers, PKO_COLUMNS.amount);
  const descIdx = findColumnIndex(headers, PKO_COLUMNS.description);
  const currencyIdx = findColumnIndex(headers, PKO_COLUMNS.currency);
  const counterpartyIdx = findColumnIndex(headers, PKO_COLUMNS.counterparty);

  const autoMapped = dateIdx !== -1 && amountIdx !== -1 && descIdx !== -1;
  const detectedBank: DetectedBank = autoMapped ? 'PKO' : 'unknown';

  const mapping: ColumnMapping = {
    date: dateIdx !== -1 ? dateIdx : 0,
    amount: amountIdx !== -1 ? amountIdx : 1,
    description: descIdx !== -1 ? descIdx : 2,
    currency: currencyIdx,
    counterparty: counterpartyIdx,
  };

  const transactions: ParsedBankTransaction[] = [];
  const typeIdx = autoMapped ? findColumnIndex(headers, PKO_COLUMNS.type) : -1;

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i], delimiter);
    if (fields.length < 2) continue;

    const rawAmount = fields[mapping.amount] || '0';
    const amount = parsePKOAmount(rawAmount);
    if (isNaN(amount) || amount === 0) continue;

    const rawCurrency = mapping.currency >= 0 ? (fields[mapping.currency] || '').trim().toUpperCase() : '';
    const currency: Currency = rawCurrency === 'PLN' ? 'PLN' : rawCurrency === 'USD' ? 'USD' : rawCurrency === 'UAH' ? 'UAH' : 'PLN';

    const isIncome = amount > 0;

    // Attempt PKO extra-column extraction when auto-mapped and Typ transakcji column exists
    let description: string;
    let counterparty: string;
    let extractedExchangeRate: number | undefined;

    if (autoMapped && typeIdx !== -1) {
      const txType = fields[typeIdx] ?? '';
      const extra = extractPKOExtraColumns(fields, txType);
      description = extra.description || fields[mapping.description] || '';
      counterparty = extra.counterparty || (mapping.counterparty >= 0 ? (fields[mapping.counterparty] || '') : '');
      extractedExchangeRate = extra.exchangeRate;
    } else {
      description = fields[mapping.description] || '';
      counterparty = mapping.counterparty >= 0 ? (fields[mapping.counterparty] || '') : '';
      description = counterparty ? `${counterparty} - ${description}` : description;
    }

    // Determine category
    let category = detectCategory(description, appRules);

    // Transaction-type hints override keyword matching
    if (autoMapped) {
      const txType = (fields[2] ?? '').trim();
      if (
        txType === 'WYMIANA W KANTORZE - UZNANIE' ||
        txType === 'WYMIANA W KANTORZE - OBCIĄŻENIE'
      ) {
        category = isIncome ? 'Other Income' : 'Other';
      } else if (
        isIncome &&
        (txType === 'Przelew na konto' ||
          txType.startsWith('Przelew na telefon przychodz.')) &&
        category === 'Other'
      ) {
        category = 'Other Income';
      } else if (txType === 'Obciążenie') {
        // Check title field (col8) for "BILET" → Transportation
        const titleField = (fields[8] ?? '').toUpperCase();
        if (titleField.includes('BILET')) {
          category = 'Transportation';
        }
      }
    }

    const suggestedCategory = isIncome && category === 'Other' ? 'Other Income' : category;

    const tx: ParsedBankTransaction = {
      date: parseDate(fields[mapping.date] || ''),
      amount: Math.abs(amount),
      description: description.slice(0, 200),
      currency,
      counterparty,
      suggestedCategory,
      suggestedType: isIncome ? 'income' : 'expense',
      raw: fields,
    };
    if (extractedExchangeRate !== undefined) {
      tx.extractedExchangeRate = extractedExchangeRate;
    }
    transactions.push(tx);
  }

  // Detect dominant currency from parsed transactions
  let detectedCurrency: Currency | undefined;
  if (transactions.length > 0) {
    const counts: Partial<Record<Currency, number>> = {};
    for (const tx of transactions) {
      counts[tx.currency] = (counts[tx.currency] ?? 0) + 1;
    }
    detectedCurrency = (Object.entries(counts) as [Currency, number][]).reduce(
      (best, [cur, count]) => (count > (counts[best] ?? 0) ? cur : best),
      transactions[0].currency,
    );
  }

  return { headers, transactions, autoMapped, mapping, detectedCurrency, detectedBank };
}
