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
  dueDate?: number; // Day of month (1-31) for bill due date
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
  contactNumber?: string; // Contact number with country code
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

// Savings Types
export interface SavingsBankAccount {
  id: string;
  bankName: string;
  amount: number;
  lastUpdated: Date;
}

export interface Savings {
  pin?: string; // Hashed 4-digit PIN
  pinSet: boolean;
  cashSavings: number;
  bankAccounts: SavingsBankAccount[];
  lastAccessedAt?: Date;
  lastUpdatedAt?: Date;
  createdAt?: Date;
}

// Bank Details Types (Secure Storage)
export interface BankDetails {
  id: string;
  // Bank Information
  accountHolderName: string;
  bankName: string;
  customerId: string;
  bankAccountNumber: string; // Encrypted
  ifscCode: string;
  // Debit Card Details
  debitCardNumber: string; // Encrypted, only last 4 digits shown
  cardExpiryDate: string; // MM/YY format
  cvv: string; // Encrypted
  atmPin: string; // Encrypted
  // Mobile & App Banking
  registeredMobileNumber: string; // Encrypted
  mobileAppLoginPin: string; // Encrypted
  mobileBankingPin: string; // Encrypted
  // Net Banking
  netBankingUserId: string; // Encrypted
  netBankingPassword: string; // Encrypted
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Masked version for display
export interface MaskedBankDetails {
  id: string;
  accountHolderName: string;
  bankName: string;
  customerId: string;
  bankAccountNumberMasked: string; // e.g., ****1234
  ifscCode: string;
  debitCardNumberMasked: string; // e.g., ****5678
  cardExpiryDate: string;
  hasCvv: boolean;
  hasAtmPin: boolean;
  hasRegisteredMobileNumber: boolean;
  hasMobileAppLoginPin: boolean;
  hasMobileBankingPin: boolean;
  hasNetBankingUserId: boolean;
  hasNetBankingPassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Credit Card Details (Secure Storage for Profile)
export interface CreditCardDetails {
  id: string;
  cardName: string; // e.g., "HDFC Millennia"
  cardHolderName: string;
  cardNumber: string; // Encrypted
  expiryDate: string; // MM/YY format
  cvv: string; // Encrypted
  pin: string; // Encrypted
  dueDate?: number; // Day of month (1-31) for bill due date
  createdAt: Date;
  updatedAt: Date;
}

// Masked version for credit card display
export interface MaskedCreditCardDetails {
  id: string;
  cardName: string;
  cardHolderName: string;
  cardNumberMasked: string; // e.g., **** **** **** 5678
  expiryDate: string;
  hasCvv: boolean;
  hasPin: boolean;
  dueDate?: number; // Day of month (1-31) for bill due date
  createdAt: Date;
  updatedAt: Date;
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
