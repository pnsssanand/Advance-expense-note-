export type WalletType = 'bank' | 'creditCard' | 'cash';

export interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: string;
  purpose: string;
  wallet: WalletType;
  date: Date;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Wallet {
  balance: number;
  lastUpdated: Date;
}

export interface Wallets {
  bank: Wallet;
  creditCard: Wallet;
  cash: Wallet;
}

export interface Note {
  id: string;
  title: string;
  note?: string;
  done: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  wallet: WalletType;
  before: number;
  after: number;
  action: 'create' | 'update' | 'delete';
  amount: number;
  createdAt: Date;
}

export const EXPENSE_CATEGORIES = [
  'Groceries',
  'Dining',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Health',
  'Bills',
  'Education',
  'Travel',
  'Other',
] as const;

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
] as const;
