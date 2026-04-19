import mccData from '../data/mcc_ukrainian.json';
import type { ExpenseCategory, IncomeCategory } from '../types';

export interface MCCCode {
  mcc: string;
  group: {
    type: string;
    description: {
      uk: string;
      en: string;
      ru: string;
    };
  };
  fullDescription: {
    uk: string;
    en: string;
    ru: string;
  };
  shortDescription: {
    uk: string;
    en: string;
    ru: string;
  };
}

const MCC_GROUP_TO_CATEGORY: Record<string, ExpenseCategory | IncomeCategory> = {
  'ROS': 'Food',
  'WSM': 'Food',
  'AL': 'Transportation',
  'CR': 'Transportation',
  'TS': 'Transportation',
  'CV': 'Transportation',
  'HR': 'Housing',
  'US': 'Utilities',
  'CLS': 'Shopping',
  'MS': 'Shopping',
  'MTS': 'Shopping',
  'PS': 'Personal',
  'SP': 'Personal',
  'BS': 'Other',
  'RS': 'Other',
  'PFS': 'Other',
  'CS': 'Other',
  'ES': 'Entertainment',
  'MO': 'Other',
  'GS': 'Other',
  'AS': 'Other',
  'NC': 'Other',
};

const SPECIAL_MCC_MAPPINGS: Record<string, ExpenseCategory | IncomeCategory> = {
  '8011': 'Healthcare',
  '8021': 'Healthcare',
  '8031': 'Healthcare',
  '8041': 'Healthcare',
  '8042': 'Healthcare',
  '8043': 'Healthcare',
  '8049': 'Healthcare',
  '8050': 'Healthcare',
  '8062': 'Healthcare',
  '8071': 'Healthcare',
  '8099': 'Healthcare',
  '8211': 'Education',
  '8220': 'Education',
  '8241': 'Education',
  '8244': 'Education',
  '8249': 'Education',
  '8299': 'Education',
  '6300': 'Insurance',
  '5960': 'Insurance',
  '4899': 'Subscriptions',
  '5968': 'Subscriptions',
  '6012': 'Transfers',
  '6051': 'Transfers',
  '6211': 'Transfers',
  '6513': 'Housing',
  '5411': 'Food',
  '5422': 'Food',
  '5441': 'Food',
  '5451': 'Food',
  '5462': 'Food',
  '5499': 'Food',
  '5811': 'Food',
  '5812': 'Food',
  '5813': 'Food',
  '5814': 'Food',
  '5541': 'Transportation',
  '5542': 'Transportation',
  '7832': 'Entertainment',
  '7922': 'Entertainment',
  '7932': 'Entertainment',
  '7933': 'Entertainment',
  '7941': 'Entertainment',
  '7991': 'Entertainment',
  '7992': 'Entertainment',
  '7993': 'Entertainment',
  '7994': 'Entertainment',
  '7995': 'Entertainment',
  '7996': 'Entertainment',
  '7997': 'Entertainment',
  '7998': 'Entertainment',
  '7999': 'Entertainment',
  '5311': 'Shopping',
  '5331': 'Shopping',
  '5912': 'Shopping',
  '5942': 'Shopping',
  '5943': 'Shopping',
  '5944': 'Shopping',
  '5945': 'Shopping',
  '5946': 'Shopping',
  '5947': 'Shopping',
  '5948': 'Shopping',
  '5949': 'Shopping',
  '5950': 'Shopping',
  '5961': 'Shopping',
  '5962': 'Shopping',
  '5963': 'Shopping',
  '5964': 'Shopping',
  '5965': 'Shopping',
  '5966': 'Shopping',
  '5967': 'Shopping',
  '5969': 'Shopping',
  '5970': 'Shopping',
  '5971': 'Shopping',
  '5972': 'Shopping',
  '5973': 'Shopping',
  '5975': 'Shopping',
  '5976': 'Shopping',
  '5977': 'Shopping',
  '5978': 'Shopping',
  '5983': 'Shopping',
  '5992': 'Shopping',
  '5993': 'Shopping',
  '5994': 'Shopping',
  '5995': 'Shopping',
  '5996': 'Shopping',
  '5997': 'Shopping',
  '5998': 'Shopping',
  '5999': 'Shopping',
  '4900': 'Utilities',
  '9311': 'Taxes',
  '9222': 'Taxes',
  '9223': 'Taxes',
  '9399': 'Taxes',
};

const mccArray = mccData as MCCCode[];
const mccCodeMap = new Map<string, MCCCode>();
for (const mcc of mccArray) {
  mccCodeMap.set(mcc.mcc, mcc);
}

export function getCategoryFromMCC(mccCode: string | number): ExpenseCategory | IncomeCategory {
  const code = String(mccCode);
  
  if (SPECIAL_MCC_MAPPINGS[code]) {
    return SPECIAL_MCC_MAPPINGS[code];
  }
  
  const mcc = mccCodeMap.get(code);
  if (mcc) {
    const category = MCC_GROUP_TO_CATEGORY[mcc.group.type];
    if (category) {
      return category;
    }
  }
  
  return 'Other';
}

export function getMCCDetails(mccCode: string | number): MCCCode | undefined {
  return mccCodeMap.get(String(mccCode));
}

export function getMCCCodesForCategory(category: ExpenseCategory | IncomeCategory): string[] {
  const codes: string[] = [];
  
  for (const [code, cat] of Object.entries(SPECIAL_MCC_MAPPINGS)) {
    if (cat === category) {
      codes.push(code);
    }
  }
  
  for (const mcc of mccArray) {
    const mappedCategory = MCC_GROUP_TO_CATEGORY[mcc.group.type];
    if (mappedCategory === category && !codes.includes(mcc.mcc)) {
      codes.push(mcc.mcc);
    }
  }
  
  return codes;
}

export function searchMCC(keyword: string): MCCCode[] {
  const lower = keyword.toLowerCase();
  return mccArray.filter(mcc => 
    mcc.fullDescription.en.toLowerCase().includes(lower) ||
    mcc.fullDescription.uk.toLowerCase().includes(lower) ||
    mcc.fullDescription.ru.toLowerCase().includes(lower) ||
    mcc.shortDescription.en.toLowerCase().includes(lower) ||
    mcc.shortDescription.uk.toLowerCase().includes(lower) ||
    mcc.shortDescription.ru.toLowerCase().includes(lower)
  );
}

export { mccArray as MCC_CODES };
