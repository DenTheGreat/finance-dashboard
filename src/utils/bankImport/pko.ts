import type { Currency, CategoryRule } from '../../types';
import type { ColumnMapping, ParsedBankTransaction } from './types';
import { parseCSVLine, parseAmount, parseDate, findColumnIndex, detectCategory } from './shared';

export const PKO_COLUMNS = {
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

interface PKOExtraInfo {
  description: string;
  counterparty: string;
  exchangeRate?: number;
}

function stripLabel(value: string, label: string): string {
  const prefix = label.endsWith(': ') ? label : label + ': ';
  if (value.startsWith(prefix)) return value.slice(prefix.length).trim();
  return value.trim();
}

function extractMerchant(locationField: string): string {
  let s = locationField.replace(/^Lokalizacja:\s*/i, '').trim();
  s = s.replace(/^Adres:\s*/i, '').trim();
  const stopMatch = s.match(/\s+Miasto:|\s+Kraj:/i);
  if (stopMatch && stopMatch.index !== undefined) {
    return s.slice(0, stopMatch.index).trim();
  }
  return s.trim();
}

export function extractPKOExtraColumns(fields: string[], txType: string): PKOExtraInfo {
  const type = txType.trim();
  const f = (i: number) => (fields[i] ?? '').trim();

  if (
    type === 'Płatność kartą' ||
    type === 'Przelew z karty'
  ) {
    const merchant = extractMerchant(f(7));
    const description = merchant || stripLabel(f(6), 'Tytuł');
    return { description, counterparty: merchant };
  }

  if (type === 'Płatność web - kod mobilny') {
    const merchant = extractMerchant(f(8));
    const title = stripLabel(f(6), 'Tytuł');
    const description = merchant || title;
    return { description, counterparty: merchant };
  }

  if (type === 'WYMIANA W KANTORZE - UZNANIE' || type === 'WYMIANA W KANTORZE - OBCIĄŻENIE') {
    const title = stripLabel(f(9), 'Tytuł');
    let exchangeRate: number | undefined;
    const rateMatch = title.match(/[A-Z]{3}\/[A-Z]{3}\s+([\d.,]+)/);
    if (rateMatch) {
      const rateStr = rateMatch[1].replace(',', '.');
      const parsed = parseFloat(rateStr);
      if (!isNaN(parsed)) exchangeRate = parsed;
    }
    const pairMatch = title.match(/([A-Z]{3}\/[A-Z]{3})/);
    const pair = pairMatch ? pairMatch[1] : 'FX';
    const desc = exchangeRate
      ? `Currency exchange ${pair} @ ${exchangeRate}`
      : `Currency exchange ${pair}`;
    const senderName = stripLabel(f(7), 'Nazwa nadawcy');
    return { description: desc, counterparty: senderName, exchangeRate };
  }

  if (
    type === 'Przelew na konto' ||
    type === 'Przelew na telefon przychodz. wew.' ||
    type === 'Przelew na telefon przychodz. zew.'
  ) {
    const counterparty = stripLabel(f(7), 'Nazwa nadawcy') || stripLabel(f(7), 'Nazwa odbiorcy');
    let title = '';
    if (f(8).startsWith('Tytuł:')) {
      title = stripLabel(f(8), 'Tytuł');
    } else if (f(9).startsWith('Tytuł:')) {
      title = stripLabel(f(9), 'Tytuł');
    }
    const description = title ? `${counterparty} - ${title}` : counterparty;
    return { description, counterparty };
  }

  if (type === 'Przelew z rachunku') {
    const counterparty = stripLabel(f(7), 'Nazwa odbiorcy');
    const title = stripLabel(f(8), 'Tytuł');
    const description = title ? `${counterparty} - ${title}` : counterparty;
    return { description, counterparty };
  }

  if (type === 'Obciążenie') {
    const counterparty = stripLabel(f(6), 'Nazwa odbiorcy');
    const title = stripLabel(f(8), 'Tytuł');
    const description = title ? `${counterparty} - ${title}` : counterparty;
    return { description, counterparty };
  }

  if (type === 'Polecenie Zapłaty') {
    const counterparty = stripLabel(f(7), 'Nazwa odbiorcy');
    const title = stripLabel(f(9), 'Tytuł');
    const description = title ? `${counterparty} - ${title}` : counterparty;
    return { description, counterparty };
  }

  return { description: f(6), counterparty: '' };
}

export function parsePKO(
  lines: string[],
  delimiter: string,
  headers: string[],
  appRules?: CategoryRule[],
): { transactions: ParsedBankTransaction[]; autoMapped: boolean; mapping: ColumnMapping; detectedCurrency?: Currency } {
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
  const typeIdx = autoMapped ? findColumnIndex(headers, PKO_COLUMNS.type) : -1;

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i], delimiter);
    if (fields.length < 2) continue;

    const rawAmount = fields[mapping.amount] || '0';
    const amount = parseAmount(rawAmount);
    if (isNaN(amount) || amount === 0) continue;

    const rawCurrency = mapping.currency >= 0 ? (fields[mapping.currency] || '').trim().toUpperCase() : '';
    const currency: Currency = rawCurrency === 'PLN' ? 'PLN' : rawCurrency === 'USD' ? 'USD' : rawCurrency === 'UAH' ? 'UAH' : 'PLN';

    const isIncome = amount > 0;

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

    let category = detectCategory(description, appRules);

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
        const titleField = (fields[8] ?? '').toUpperCase();
        if (titleField.includes('BILET')) {
          category = 'Transportation';
        }
      }
    }

    const suggestedCategory = isIncome && category === 'Other' ? 'Other Income' : category;

    const parsedDate = parseDate(fields[mapping.date] || '');
    if (!parsedDate) {
      continue;
    }

    const tx: ParsedBankTransaction = {
      date: parsedDate,
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

  return { transactions, autoMapped, mapping, detectedCurrency };
}
