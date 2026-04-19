import type { CategoryRule } from '../../types';
import type { ParsedBankTransaction, ParseResult, ColumnMapping } from './types';
import { detectCategory, parseAmount, parseDate } from './shared';
import * as XLSX from 'xlsx';

interface PKOExcelRow {
  'Data operacji'?: string | Date;
  'Data waluty'?: string | Date;
  'Typ transakcji'?: string;
  'Kwota'?: string | number;
  'Waluta'?: string;
  'Saldo po transakcji'?: string | number;
  'Opis transakcji'?: string;
  [key: string]: string | number | Date | undefined;
}

function extractDescription(row: PKOExcelRow): string {
  const rawDesc = row['Opis transakcji'] || '';
  
  if (typeof rawDesc !== 'string') return String(rawDesc);
  
  const titleMatch = rawDesc.match(/Tytu[łl]:\s*(.+?)(?:\s{2,}|$)/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  return rawDesc.trim();
}

function extractCounterparty(row: PKOExcelRow): string {
  const rawDesc = row['Opis transakcji'] || '';
  
  if (typeof rawDesc !== 'string') return '';
  
  const senderMatch = rawDesc.match(/(?:Nazwa nadawcy|Nadawca|Od):\s*([^,\n]+)/i);
  const receiverMatch = rawDesc.match(/(?:Nazwa odbiorcy|Odbiorca|Do):\s*([^,\n]+)/i);
  
  return (senderMatch?.[1] || receiverMatch?.[1] || '').trim();
}

export function parsePKOExcel(
  arrayBuffer: ArrayBuffer,
  appRules?: CategoryRule[]
): ParseResult {
  const workbook = XLSX.read(arrayBuffer, {
    cellDates: true,
    cellNF: false,
    cellHTML: false,
    dense: true,
  });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const rows = XLSX.utils.sheet_to_json<PKOExcelRow>(sheet, {
    defval: '',
    blankrows: false,
  });

  if (rows.length === 0) {
    return {
      headers: [],
      transactions: [],
      autoMapped: false,
      mapping: { date: 0, amount: 1, description: 2, currency: -1, counterparty: -1 },
      detectedBank: 'unknown',
    };
  }

  const transactions: ParsedBankTransaction[] = [];
  const headers = Object.keys(rows[0]);

  for (const row of rows) {
    const rawAmount = row['Kwota'];
    let amount: number;
    
    if (typeof rawAmount === 'number') {
      amount = rawAmount;
    } else if (typeof rawAmount === 'string') {
      amount = parseAmount(rawAmount);
    } else {
      continue;
    }

    if (isNaN(amount) || amount === 0) continue;

    const isIncome = amount > 0;
    const description = extractDescription(row);
    const counterparty = extractCounterparty(row);
    const fullDesc = counterparty ? `${counterparty} - ${description}` : description;
    
    const rawCurrency = (row['Waluta'] || 'PLN').toString().trim().toUpperCase();
    const currency = rawCurrency === 'PLN' ? 'PLN' : rawCurrency === 'USD' ? 'USD' : rawCurrency === 'UAH' ? 'UAH' : 'PLN';

    let dateStr = '';
    const rawDate = row['Data operacji'];
    if (rawDate instanceof Date) {
      dateStr = rawDate.toISOString().slice(0, 10);
    } else if (typeof rawDate === 'string') {
      dateStr = parseDate(rawDate);
    }
    
    if (!dateStr) continue;

    const category = detectCategory(fullDesc, appRules);
    const suggestedCategory = isIncome && category === 'Other' ? 'Other Income' : category;

    const txType = row['Typ transakcji'] || '';
    let finalCategory = suggestedCategory;
    
    if (txType === 'WYMIANA W KANTORZE - UZNANIE' || txType === 'WYMIANA W KANTORZE - OBCIĄŻENIE') {
      finalCategory = isIncome ? 'Other Income' : 'Other';
    } else if (
      isIncome &&
      (txType === 'Przelew na konto' || txType?.startsWith('Przelew na telefon przychodz.')) &&
      category === 'Other'
    ) {
      finalCategory = 'Other Income';
    }

    transactions.push({
      date: dateStr,
      amount: Math.abs(amount),
      description: fullDesc.slice(0, 200),
      currency,
      counterparty,
      suggestedCategory: finalCategory,
      suggestedType: isIncome ? 'income' : 'expense',
      raw: headers.map(h => String(row[h] || '')),
    });
  }

  const detectedCurrency: 'PLN' | 'USD' | 'UAH' | undefined = transactions.length > 0 
    ? (transactions[0].currency as 'PLN' | 'USD' | 'UAH') 
    : undefined;

  const mapping: ColumnMapping = {
    date: 0,
    amount: 1,
    description: 2,
    currency: 3,
    counterparty: 4,
  };

  return {
    headers,
    transactions,
    autoMapped: true,
    mapping,
    detectedCurrency,
    detectedBank: 'PKO',
  };
}
