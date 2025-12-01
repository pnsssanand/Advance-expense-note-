# Expense Pal - Premium INR Multi-Wallet Implementation Guide

## ✅ COMPLETED CHANGES

### 1. Type System Updates (`src/types/expense.ts`)
- ✅ Updated `Wallets` interface to support multiple banks and credit cards
- ✅ Added `BankAccount` and `CreditCard` interfaces
- ✅ Changed default currency to INR (₹) - moved to first position
- ✅ Added `walletId` field to Expense type for tracking specific bank/card

### 2. Utility Functions (`src/lib/utils.ts`)
- ✅ Added `formatINR()` function for Indian number formatting
- ✅ Formats as ₹1,23,456.00 (Indian lakhs/crores system)
- ✅ Supports negative values and optional symbol display

### 3. Wallet Management Components
- ✅ Created `BankAccountDialog.tsx` - Add/edit bank accounts
- ✅ Created `CreditCardDialog.tsx` - Add/edit credit cards  
- ✅ Completely redesigned `WalletCards.tsx` with:
  - Expandable/collapsible sections for Banks, Credit Cards, Cash
  - Individual bank account cards with edit/delete actions
  - Individual credit card management with due tracking
  - Premium animations and hover effects
  - Total calculations for all banks and all credit card dues

### 4. Dashboard Updates (`src/components/Dashboard.tsx`)
- ✅ Updated `loadWallets()` to fetch from new Firebase structure:
  - `users/{uid}/banks/{bankId}`
  - `users/{uid}/creditCards/{cardId}`
  - `users/{uid}/wallets/cash`
- ✅ Added necessary Firestore imports (collection, getDocs, query)

### 5. Premium CSS Animations (`src/index.css`)
- ✅ Added premium animation keyframes:
  - `fade-in` - Smooth entry animations
  - `slide-up` - Bottom sheet animations
  - `scale-in` - Pop-in effects
  - `shimmer` - Loading skeleton effect
  - `float` - Floating FAB animation
- ✅ Added utility classes:
  - `.glass` and `.glass-dark` for glassmorphism
  - `.hover-lift` and `.hover-scale` for micro-interactions
  - `.floating-fab` for FAB animations
- ✅ All animations use smooth cubic-bezier easing

---

## 🚧 REMAINING WORK REQUIRED

### 6. Update ExpenseDialog Component
**File**: `src/components/expenses/ExpenseDialog.tsx`

**Required Changes**:
```tsx
// 1. Change default currency from 'USD' to 'INR'
const [currency, setCurrency] = useState('INR');

// 2. Add state for selected bank/card
const [selectedWalletId, setSelectedWalletId] = useState<string>('');

// 3. Load banks and cards for dropdown
const [banks, setBanks] = useState<BankAccount[]>([]);
const [creditCards, setCreditCards] = useState<CreditCard[]>([]);

// 4. Add useEffect to load banks and cards
useEffect(() => {
  if (user && wallet === 'bank') {
    // Load banks from Firebase
  } else if (user && wallet === 'creditCard') {
    // Load credit cards from Firebase
  }
}, [user, wallet]);

// 5. Add dropdown after wallet selector:
{wallet === 'bank' && (
  <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
    <SelectTrigger>
      <SelectValue placeholder="Select bank account" />
    </SelectTrigger>
    <SelectContent>
      {banks.map(bank => (
        <SelectItem key={bank.id} value={bank.id}>
          {bank.name} - {formatINR(bank.balance)}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}

{wallet === 'creditCard' && (
  <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
    <SelectTrigger>
      <SelectValue placeholder="Select credit card" />
    </SelectTrigger>
    <SelectContent>
      {creditCards.map(card => (
        <SelectItem key={card.id} value={card.id}>
          {card.name} - Due: {formatINR(card.dueAmount)}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}

// 6. Update transaction logic in createExpense() and updateExpense()
// to update specific bank or card by ID instead of wallet type
```

### 7. Update ExpenseChart Component
**File**: `src/components/expenses/ExpenseChart.tsx`

**Required Changes**:
```tsx
// 1. Import formatINR
import { formatINR } from '@/lib/utils';

// 2. Update tooltip callback (line ~122)
callbacks: {
  label: (context: any) => formatINR(context.parsed.y),
},

// 3. Update y-axis tick callback (line ~133)
ticks: {
  callback: (value: any) => formatINR(value),
  color: 'hsl(var(--muted-foreground))',
},
```

### 8. Update ExpenseItem Component
**File**: `src/components/expenses/ExpenseItem.tsx`

**Required Changes**:
```tsx
// 1. Import formatINR
import { formatINR } from '@/lib/utils';

// 2. Replace all $ displays with formatINR()
// Example:
<p className="text-lg font-semibold">{formatINR(expense.amount)}</p>

// 3. Show specific bank/card name if walletId exists
{expense.walletId && (
  <p className="text-xs text-muted-foreground">
    {/* Fetch and display bank/card name */}
  </p>
)}
```

### 9. Update ExpenseList Component
**File**: `src/components/expenses/ExpenseList.tsx`

**Required Changes**:
```tsx
// Update delete logic to handle new wallet structure
// When deleting, refund to specific bank/card using walletId
```

### 10. Update ExpenseDayDialog Component
**File**: `src/components/expenses/ExpenseDayDialog.tsx`

**Required Changes**:
```tsx
// 1. Import formatINR
import { formatINR } from '@/lib/utils';

// 2. Replace all currency displays with formatINR()
```

### 11. Update AddExpenseButton Component
**File**: `src/components/expenses/AddExpenseButton.tsx`

**Required Changes**:
```tsx
// Add premium floating animation
<Button className="floating-fab shadow-fab hover-lift">
  <Plus />
</Button>
```

### 12. Update Dashboard Layout for Premium Mobile-First Design
**File**: `src/components/Dashboard.tsx`

**Add**:
```tsx
// Smooth scroll behavior
<div className="min-h-screen bg-background pb-24 scroll-smooth">

// Stagger animations for sections
<div className="container py-6 space-y-6">
  <div className="animate-fade-in">
    <WalletCards wallets={wallets} onUpdate={loadWallets} />
  </div>
  
  <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
    <ExpenseChart />
  </div>
  
  <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
    <ExpenseList onExpenseChange={loadWallets} />
  </div>
  
  <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
    <NotesSection />
  </div>
</div>
```

---

## 🔥 FIREBASE DATABASE MIGRATION

### Required Firestore Structure:

```
users/
  {userId}/
    banks/
      {bankId}/
        - name: string
        - balance: number
        - lastUpdated: timestamp
    
    creditCards/
      {cardId}/
        - name: string
        - dueAmount: number
        - lastUpdated: timestamp
    
    wallets/
      cash/
        - balance: number
        - lastUpdated: timestamp
    
    expenses/
      {expenseId}/
        - amount: number
        - currency: string (default: 'INR')
        - category: string
        - purpose: string
        - wallet: 'bank' | 'creditCard' | 'cash'
        - walletId: string (ID of specific bank or card)
        - date: timestamp
        - attachments: array
        - createdAt: timestamp
        - updatedAt: timestamp
```

### Migration Script Needed:
Create a one-time migration to convert existing wallet data from old structure to new structure.

---

## 📱 PREMIUM UI/UX ENHANCEMENTS CHECKLIST

- ✅ Glassmorphism effects (added CSS utilities)
- ✅ Smooth animations (fade-in, slide-up, scale-in)
- ✅ Micro-interactions (hover-lift, hover-scale)
- ✅ Floating FAB animation
- ✅ Premium card shadows
- ✅ Collapsible wallet sections
- ✅ Gradient backgrounds for wallet cards
- [ ] Bottom sheet for expense form (optional enhancement)
- [ ] Skeleton loaders with shimmer effect
- [ ] Haptic feedback simulation on interactions
- [ ] Smooth page transitions
- [ ] Pull-to-refresh (optional)

---

## 🎨 DESIGN TOKENS IN USE

### Colors:
- **INR Primary**: `hsl(188 96% 36%)` - Teal/Cyan
- **Bank**: `hsl(217 91% 60%)` - Blue
- **Credit Card**: `hsl(271 81% 56%)` - Purple  
- **Cash**: `hsl(142 76% 36%)` - Green
- **Accent**: `hsl(32 98% 60%)` - Orange
- **Destructive**: `hsl(0 84% 60%)` - Red

### Typography:
- Headings: `font-heading` (Outfit)
- Body: `font-sans` (default)

### Spacing:
- Cards: `p-4` (1rem)
- Sections: `space-y-4` or `space-y-6`
- Borders: `rounded-lg` (0.5rem) or `rounded-xl` (0.75rem)

---

## 🚀 TESTING CHECKLIST

### After completing remaining work:

1. **Wallet Management**
   - [ ] Add multiple bank accounts
   - [ ] Edit bank account balance
   - [ ] Delete bank account
   - [ ] Add multiple credit cards
   - [ ] Edit credit card due
   - [ ] Delete credit card
   - [ ] Update cash balance

2. **Expense Creation**
   - [ ] Create expense with specific bank selection
   - [ ] Create expense with specific credit card selection
   - [ ] Create expense with cash
   - [ ] Verify wallet balances update correctly
   - [ ] Verify credit card due increases

3. **Expense Editing**
   - [ ] Edit expense amount
   - [ ] Change wallet (bank to credit card, etc.)
   - [ ] Verify old wallet refunds and new wallet debits

4. **Expense Deletion**
   - [ ] Delete expense
   - [ ] Verify wallet balance refunds

5. **Currency Display**
   - [ ] All amounts show ₹ symbol
   - [ ] Indian number formatting (₹1,23,456.00)
   - [ ] Charts use ₹ in tooltips and axes
   - [ ] No $ symbols anywhere

6. **UI/UX**
   - [ ] Smooth animations on page load
   - [ ] Hover effects on cards
   - [ ] Collapsible sections work smoothly
   - [ ] FAB floats and animates
   - [ ] Mobile responsive (test on small screens)
   - [ ] Dark mode works properly

---

## 📝 NOTES

- **Default Currency**: All new expenses default to INR
- **Indian Formatting**: Numbers use lakhs/crores system
- **Multi-Wallet**: Users can have unlimited banks and credit cards
- **Premium Feel**: Every interaction should feel smooth and polished
- **Mobile-First**: Optimized for thumb-friendly mobile usage

---

Created by: Mr. Anand Pinisetty  
Date: December 1, 2025
