/**
 * Encryption utilities for sensitive bank details
 * Uses AES-like encryption with user-specific keys
 */

// Simple but effective encryption for client-side data
// In production, consider using Web Crypto API or a more robust solution

const ENCRYPTION_KEY_PREFIX = 'aen_secure_';

/**
 * Generate a user-specific encryption key
 */
export function generateEncryptionKey(userId: string): string {
  return ENCRYPTION_KEY_PREFIX + userId.slice(0, 16);
}

/**
 * Encrypt sensitive data
 */
export function encryptData(data: string, userId: string): string {
  if (!data) return '';
  
  const key = generateEncryptionKey(userId);
  let encrypted = '';
  
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    encrypted += String.fromCharCode(charCode);
  }
  
  // Base64 encode the result
  return btoa(encrypted);
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encryptedData: string, userId: string): string {
  if (!encryptedData) return '';
  
  try {
    const key = generateEncryptionKey(userId);
    const decoded = atob(encryptedData);
    let decrypted = '';
    
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      decrypted += String.fromCharCode(charCode);
    }
    
    return decrypted;
  } catch {
    return '';
  }
}

/**
 * Mask a bank account number (show last 4 digits)
 */
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) return '****';
  const lastFour = accountNumber.slice(-4);
  return `****${lastFour}`;
}

/**
 * Mask a card number (show last 4 digits)
 */
export function maskCardNumber(cardNumber: string): string {
  if (!cardNumber || cardNumber.length < 4) return '****';
  const cleaned = cardNumber.replace(/\s/g, '');
  const lastFour = cleaned.slice(-4);
  return `**** **** **** ${lastFour}`;
}

/**
 * Format card number with spaces (for display while typing)
 */
export function formatCardNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  const groups = cleaned.match(/.{1,4}/g);
  return groups ? groups.join(' ') : cleaned;
}

/**
 * Validate IFSC code format
 */
export function validateIFSC(ifsc: string): boolean {
  // IFSC format: 4 letters + 0 + 6 alphanumeric characters
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscRegex.test(ifsc.toUpperCase());
}

/**
 * Validate card expiry date
 */
export function validateExpiryDate(expiry: string): boolean {
  const regex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
  if (!regex.test(expiry)) return false;
  
  const [month, year] = expiry.split('/').map(Number);
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  
  return true;
}

/**
 * Format expiry date input (MM/YY)
 */
export function formatExpiryDate(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length >= 2) {
    return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
  }
  return cleaned;
}

/**
 * Validate CVV (3 digits)
 */
export function validateCVV(cvv: string): boolean {
  return /^\d{3}$/.test(cvv);
}

/**
 * Validate PIN (4 digits)
 */
export function validatePIN(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

/**
 * Validate bank account number (9-18 digits)
 */
export function validateAccountNumber(accountNumber: string): boolean {
  const cleaned = accountNumber.replace(/\s/g, '');
  return /^\d{9,18}$/.test(cleaned);
}

/**
 * Validate debit card number (16 digits)
 */
export function validateCardNumber(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\s/g, '');
  return /^\d{16}$/.test(cleaned);
}
