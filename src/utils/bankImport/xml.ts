import type { CategoryRule } from '../../types';
import type { ParsedBankTransaction, ParseResult, ColumnMapping } from './types';
import { detectCategory, parseAmount, parseDate } from './shared';

interface PKOXmlOperation {
  orderDate?: string;
  execDate?: string;
  type?: string;
  description?: string;
  amount?: string;
  currency?: string;
  endingBalance?: string;
}

function parseOperations(xmlText: string): PKOXmlOperation[] {
  const operations: PKOXmlOperation[] = [];
  
  const opRegex = /<operation>([\s\S]*?)<\/operation>/g;
  let match;
  
  while ((match = opRegex.exec(xmlText)) !== null) {
    const content = match[1];
    const op: PKOXmlOperation = {};
    
    const orderDateMatch = content.match(/<order-date>([^<]*)<\/order-date>/);
    if (orderDateMatch) op.orderDate = orderDateMatch[1].trim();
    
    const execDateMatch = content.match(/<exec-date>([^<]*)<\/exec-date>/);
    if (execDateMatch) op.execDate = execDateMatch[1].trim();
    
    const typeMatch = content.match(/<type>([^<]*)<\/type>/);
    if (typeMatch) op.type = typeMatch[1].trim();
    
    const descMatch = content.match(/<description>([^<]*)<\/description>/);
    if (descMatch) op.description = descMatch[1].trim();
    
    const amountMatch = content.match(/<amount[^>]*>([^<]*)<\/amount>/);
    if (amountMatch) op.amount = amountMatch[1].trim();
    
    const currMatch = content.match(/<amount[^>]*curr="([^"]*)"/);
    if (currMatch) op.currency = currMatch[1].trim();
    
    const balanceMatch = content.match(/<ending-balance[^>]*>([^<]*)<\/ending-balance>/);
    if (balanceMatch) op.endingBalance = balanceMatch[1].trim();
    
    operations.push(op);
  }
  
  return operations;
}

function extractDescription(desc: string): string {
  if (!desc) return '';
  
  const titleMatch = desc.match(/Tytu[łl]\s*:\s*(.+?)(?:\s{2,}|$)/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  return desc.slice(0, 100).trim();
}

function extractCounterparty(desc: string): string {
  if (!desc) return '';
  
  const senderMatch = desc.match(/Nazwa nadawcy\s*:\s*([^\n]+)/i);
  const receiverMatch = desc.match(/Nazwa odbiorcy\s*:\s*([^\n]+)/i);
  
  return (senderMatch?.[1] || receiverMatch?.[1] || '').trim();
}

export function parsePKOXml(
  xmlText: string,
  appRules?: CategoryRule[]
): ParseResult {
  const operations = parseOperations(xmlText);
  
  if (operations.length === 0) {
    return {
      headers: [],
      transactions: [],
      autoMapped: false,
      mapping: { date: 0, amount: 1, description: 2, currency: -1, counterparty: -1 },
      detectedBank: 'unknown',
    };
  }

  const transactions: ParsedBankTransaction[] = [];
  const headers = ['order-date', 'type', 'amount', 'description'];

  for (const op of operations) {
    if (!op.amount) continue;
    
    const amount = parseAmount(op.amount);
    
    if (isNaN(amount) || amount === 0) continue;

    const isIncome = amount > 0;
    const description = extractDescription(op.description || '');
    const counterparty = extractCounterparty(op.description || '');
    const fullDesc = counterparty ? `${counterparty} - ${description}` : description;
    
    const currency = (op.currency || 'PLN').toUpperCase() as 'PLN' | 'USD' | 'UAH';

    const rawDate = op.orderDate || op.execDate || '';
    const dateStr = parseDate(rawDate);
    
    if (!dateStr) continue;

    const category = detectCategory(fullDesc, appRules);
    const suggestedCategory = isIncome && category === 'Other' ? 'Other Income' : category;

    const txType = op.type || '';
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
        op.amount,
        currency,
        op.description || '',
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
