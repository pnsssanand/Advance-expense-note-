export type WalletType = 'bank' | 'creditCard' | 'cash';

export interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: string;
  purpose: string;
  wallet: WalletType;
  walletId: string; // ID of specific bank/credit card, or 'cash' for cash wallet
  date: Date;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BankAccount {
  id: string;
  name: string;
  balance: number;
  lastUpdated: Date;
}

export interface CreditCard {
  id: string;
  name: string;
  dueAmount: number;
  lastUpdated: Date;
}

export interface CashWallet {
  balance: number;
  lastUpdated: Date;
}

export interface Wallets {
  banks: BankAccount[];
  creditCards: CreditCard[];
  cash: CashWallet;
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

export interface Refund {
  id: string;
  name: string; // Who should refund the money
  amount: number;
  purpose: string; // Why this refund is expected
  status: 'pending' | 'received';
  createdAt: Date;
  updatedAt: Date;
}

export interface Advance {
  id: string;
  name: string; // Person I gave money to
  amount: number;
  purpose: string; // Why I gave the amount
  status: 'outstanding' | 'returned';
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
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
] as const;
