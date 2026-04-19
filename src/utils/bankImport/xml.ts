import type { CategoryRule } from '../../types';
import type { ParsedBankTransaction, ParseResult, ColumnMapping } from './types';
import { detectCategory, parseAmount, parseDate } from './shared';

interface PKOXmlTransaction {
  DataOperacji?: string;
  DataWaluty?: string;
  TypTransakcji?: string;
  Kwota?: string;
  Waluta?: string;
  SaldoPoTransakcji?: string;
  OpisTransakcji?: string;
}

function parseXmlToObject(xmlText: string): PKOXmlTransaction[] {
  const transactions: PKOXmlTransaction[] = [];
  
  const transRegex = /<Transakcja[^>]*>([\s\S]*?)<\/Transakcja>/g;
  let match;
  
  while ((match = transRegex.exec(xmlText)) !== null) {
    const transContent = match[1];
    const trans: PKOXmlTransaction = {};
    
    const fieldMappings: Record<string, keyof PKOXmlTransaction> = {
      'DataOperacji': 'DataOperacji',
      'DataWaluty': 'DataWaluty',
      'TypTransakcji': 'TypTransakcji',
      'Kwota': 'Kwota',
      'Waluta': 'Waluta',
      'SaldoPoTransakcji': 'SaldoPoTransakcji',
      'OpisTransakcji': 'OpisTransakcji',
    };
    
    for (const [xmlField, objField] of Object.entries(fieldMappings)) {
      const fieldRegex = new RegExp(`<${xmlField}>([^<]*)<\\/${xmlField}>`, 'i');
      const fieldMatch = transContent.match(fieldRegex);
      if (fieldMatch) {
        trans[objField] = fieldMatch[1].trim();
      }
    }
    
    transactions.push(trans);
  }
  
  return transactions;
}

function extractDescription(opis: string): string {
  if (!opis) return '';
  
  const titleMatch = opis.match(/Tytu[łl]:\s*(.+?)(?:\s{2,}|$)/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  return opis.trim();
}

function extractCounterparty(opis: string): string {
  if (!opis) return '';
  
  const senderMatch = opis.match(/(?:Nazwa nadawcy|Nadawca|Od):\s*([^,\n]+)/i);
  const receiverMatch = opis.match(/(?:Nazwa odbiorcy|Odbiorca|Do):\s*([^,\n]+)/i);
  
  return (senderMatch?.[1] || receiverMatch?.[1] || '').trim();
}

export function parsePKOXml(
  xmlText: string,
  appRules?: CategoryRule[]
): ParseResult {
  const xmlTransactions = parseXmlToObject(xmlText);
  
  if (xmlTransactions.length === 0) {
    return {
      headers: [],
      transactions: [],
      autoMapped: false,
      mapping: { date: 0, amount: 1, description: 2, currency: -1, counterparty: -1 },
      detectedBank: 'unknown',
    };
  }

  const transactions: ParsedBankTransaction[] = [];
  const headers = ['DataOperacji', 'TypTransakcji', 'Kwota', 'Waluta', 'OpisTransakcji'];

  for (const row of xmlTransactions) {
    const rawAmount = row.Kwota || '';
    const amount = parseAmount(rawAmount);
    
    if (isNaN(amount) || amount === 0) continue;

    const isIncome = amount > 0;
    const opis = row.OpisTransakcji || '';
    const description = extractDescription(opis);
    const counterparty = extractCounterparty(opis);
    const fullDesc = counterparty ? `${counterparty} - ${description}` : description;
    
    const rawCurrency = (row.Waluta || 'PLN').trim().toUpperCase();
    const currency = rawCurrency === 'PLN' ? 'PLN' : rawCurrency === 'USD' ? 'USD' : rawCurrency === 'UAH' ? 'UAH' : 'PLN';

    const rawDate = row.DataOperacji || '';
    const dateStr = parseDate(rawDate);
    
    if (!dateStr) continue;

    const category = detectCategory(fullDesc, appRules);
    const suggestedCategory = isIncome && category === 'Other' ? 'Other Income' : category;

    const txType = row.TypTransakcji || '';
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
      raw: [
        rawDate,
        txType,
        rawAmount,
        rawCurrency,
        opis,
      ],
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
