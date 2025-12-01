import { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, runTransaction, serverTimestamp, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { formatINR } from '@/lib/utils';
import { Expense, WalletType, EXPENSE_CATEGORIES, BankAccount, CreditCard } from '@/types/expense';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense;
  onSuccess: () => void;
}

export function ExpenseDialog({ open, onOpenChange, expense, onSuccess }: ExpenseDialogProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [purpose, setPurpose] = useState('');
  const [wallet, setWallet] = useState<WalletType>('cash');
  const [walletId, setWalletId] = useState('');
  const [date, setDate] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setCategory(expense.category);
      setPurpose(expense.purpose);
      setWallet(expense.wallet);
      setWalletId(expense.walletId || '');
      setDate(expense.date.toISOString().slice(0, 16));
      setAttachments(expense.attachments);
    } else {
      // Reset form
      setAmount('');
      setCategory('');
      setPurpose('');
      setWallet('cash');
      setWalletId('');
      setDate(new Date().toISOString().slice(0, 16));
      setAttachments([]);
    }
  }, [expense, open]);

  useEffect(() => {
    if (user && open) {
      loadWalletOptions();
    }
  }, [user, open]);

  const loadWalletOptions = async () => {
    if (!user) return;

    try {
      // Load banks
      const banksQuery = query(collection(db, 'users', user.uid, 'banks'));
      const banksSnap = await getDocs(banksQuery);
      const banksData = banksSnap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        balance: doc.data().balance,
        lastUpdated: doc.data().lastUpdated?.toDate() || new Date(),
      }));
      setBanks(banksData);

      // Load credit cards
      const cardsQuery = query(collection(db, 'users', user.uid, 'creditCards'));
      const cardsSnap = await getDocs(cardsQuery);
      const cardsData = cardsSnap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        dueAmount: doc.data().dueAmount,
        lastUpdated: doc.data().lastUpdated?.toDate() || new Date(),
      }));
      setCreditCards(cardsData);
    } catch (error) {
      console.error('Error loading wallet options:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const urls = await Promise.all(files.map(file => uploadToCloudinary(file)));
      setAttachments((prev) => [...prev, ...urls]);
      toast.success('Files uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!amount || !category || !purpose) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSaving(true);

    try {
      const expenseData = {
        amount: amountNum,
        currency: 'INR',
        category,
        purpose,
        wallet,
        walletId: (wallet === 'bank' || wallet === 'creditCard') ? walletId : undefined,
        date: new Date(date),
        attachments,
      };

      if (expense) {
        // Update existing expense
        await updateExpense(expense.id, expenseData, expense.amount, expense.wallet, expense.walletId);
      } else {
        // Create new expense
        await createExpense(expenseData);
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving expense:', error);
      toast.error(error.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const createExpense = async (expenseData: any) => {
    if (!user) return;

    const expensesRef = collection(db, 'users', user.uid, 'expenses');

    await runTransaction(db, async (tx) => {
      let walletRef;
      
      if (expenseData.wallet === 'bank') {
        if (!expenseData.walletId) throw new Error('Please select a bank account');
        walletRef = doc(db, 'users', user.uid, 'banks', expenseData.walletId);
        const walletSnap = await tx.get(walletRef);
        if (!walletSnap.exists()) throw new Error('Bank account not found');
        
        const currentBalance = walletSnap.data().balance || 0;
        const newBalance = currentBalance - expenseData.amount;
        
        if (newBalance < 0) {
          throw new Error('Insufficient balance in selected bank account');
        }
        
        tx.update(walletRef, {
          balance: newBalance,
          lastUpdated: serverTimestamp(),
        });
      } else if (expenseData.wallet === 'creditCard') {
        if (!expenseData.walletId) throw new Error('Please select a credit card');
        walletRef = doc(db, 'users', user.uid, 'creditCards', expenseData.walletId);
        const walletSnap = await tx.get(walletRef);
        if (!walletSnap.exists()) throw new Error('Credit card not found');
        
        const currentDue = walletSnap.data().dueAmount || 0;
        const newDue = currentDue + expenseData.amount;
        
        tx.update(walletRef, {
          dueAmount: newDue,
          lastUpdated: serverTimestamp(),
        });
      } else if (expenseData.wallet === 'cash') {
        walletRef = doc(db, 'users', user.uid, 'wallets', 'cash');
        const walletSnap = await tx.get(walletRef);
        
        const currentBalance = walletSnap.exists() ? walletSnap.data().balance || 0 : 0;
        const newBalance = currentBalance - expenseData.amount;
        
        if (newBalance < 0) {
          throw new Error('Insufficient cash balance');
        }
        
        tx.set(walletRef, {
          balance: newBalance,
          lastUpdated: serverTimestamp(),
        }, { merge: true });
      }

      const newExpenseRef = doc(expensesRef);
      tx.set(newExpenseRef, {
        ...expenseData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    toast.success('Expense added successfully');
  };

  const updateExpense = async (
    expenseId: string,
    expenseData: any,
    oldAmount: number,
    oldWallet: WalletType,
    oldWalletId?: string
  ) => {
    if (!user) return;

    const expenseRef = doc(db, 'users', user.uid, 'expenses', expenseId);

    await runTransaction(db, async (tx) => {
      // Refund old wallet
      if (oldWallet === 'bank' && oldWalletId) {
        const oldBankRef = doc(db, 'users', user.uid, 'banks', oldWalletId);
        const oldBankSnap = await tx.get(oldBankRef);
        if (oldBankSnap.exists()) {
          const oldBalance = oldBankSnap.data().balance || 0;
          tx.update(oldBankRef, {
            balance: oldBalance + oldAmount,
            lastUpdated: serverTimestamp(),
          });
        }
      } else if (oldWallet === 'creditCard' && oldWalletId) {
        const oldCardRef = doc(db, 'users', user.uid, 'creditCards', oldWalletId);
        const oldCardSnap = await tx.get(oldCardRef);
        if (oldCardSnap.exists()) {
          const oldDue = oldCardSnap.data().dueAmount || 0;
          tx.update(oldCardRef, {
            dueAmount: Math.max(0, oldDue - oldAmount),
            lastUpdated: serverTimestamp(),
          });
        }
      } else if (oldWallet === 'cash') {
        const cashRef = doc(db, 'users', user.uid, 'wallets', 'cash');
        const cashSnap = await tx.get(cashRef);
        if (cashSnap.exists()) {
          const oldBalance = cashSnap.data().balance || 0;
          tx.set(cashRef, {
            balance: oldBalance + oldAmount,
            lastUpdated: serverTimestamp(),
          }, { merge: true });
        }
      }

      // Deduct from new wallet
      if (expenseData.wallet === 'bank') {
        if (!expenseData.walletId) throw new Error('Please select a bank account');
        const newBankRef = doc(db, 'users', user.uid, 'banks', expenseData.walletId);
        const newBankSnap = await tx.get(newBankRef);
        if (!newBankSnap.exists()) throw new Error('Bank account not found');
        
        const currentBalance = newBankSnap.data().balance || 0;
        const newBalance = currentBalance - expenseData.amount;
        
        if (newBalance < 0) throw new Error('Insufficient balance');
        
        tx.update(newBankRef, {
          balance: newBalance,
          lastUpdated: serverTimestamp(),
        });
      } else if (expenseData.wallet === 'creditCard') {
        if (!expenseData.walletId) throw new Error('Please select a credit card');
        const newCardRef = doc(db, 'users', user.uid, 'creditCards', expenseData.walletId);
        const newCardSnap = await tx.get(newCardRef);
        if (!newCardSnap.exists()) throw new Error('Credit card not found');
        
        const currentDue = newCardSnap.data().dueAmount || 0;
        tx.update(newCardRef, {
          dueAmount: currentDue + expenseData.amount,
          lastUpdated: serverTimestamp(),
        });
      } else if (expenseData.wallet === 'cash') {
        const cashRef = doc(db, 'users', user.uid, 'wallets', 'cash');
        const cashSnap = await tx.get(cashRef);
        
        const currentBalance = cashSnap.exists() ? cashSnap.data().balance || 0 : 0;
        const newBalance = currentBalance - expenseData.amount;
        
        if (newBalance < 0) throw new Error('Insufficient cash');
        
        tx.set(cashRef, {
          balance: newBalance,
          lastUpdated: serverTimestamp(),
        }, { merge: true });
      }

      tx.update(expenseRef, {
        ...expenseData,
        updatedAt: serverTimestamp(),
      });
    });

    toast.success('Expense updated successfully');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
        <DialogHeader>
          <DialogTitle>{expense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
          <DialogDescription>
            {expense ? 'Update expense details' : 'Enter the details of your expense'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₹</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-8"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose *</Label>
            <Textarea
              id="purpose"
              placeholder="What was this expense for?"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wallet">Payment Method *</Label>
            <Select 
              value={wallet} 
              onValueChange={(v) => {
                setWallet(v as WalletType);
                setWalletId('');
              }} 
              required
            >
              <SelectTrigger id="wallet">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">🏦 Bank Account</SelectItem>
                <SelectItem value="creditCard">💳 Credit Card</SelectItem>
                <SelectItem value="cash">💵 Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {wallet === 'bank' && (
            <div className="space-y-2">
              <Label htmlFor="bankAccount">Select Bank Account *</Label>
              <Select value={walletId} onValueChange={setWalletId} required>
                <SelectTrigger id="bankAccount">
                  <SelectValue placeholder="Choose bank account" />
                </SelectTrigger>
                <SelectContent>
                  {banks.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No bank accounts added. Please add one first.
                    </div>
                  ) : (
                    banks.map(bank => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.name} - {formatINR(bank.balance)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {wallet === 'creditCard' && (
            <div className="space-y-2">
              <Label htmlFor="creditCard">Select Credit Card *</Label>
              <Select value={walletId} onValueChange={setWalletId} required>
                <SelectTrigger id="creditCard">
                  <SelectValue placeholder="Choose credit card" />
                </SelectTrigger>
                <SelectContent>
                  {creditCards.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No credit cards added. Please add one first.
                    </div>
                  ) : (
                    creditCards.map(card => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.name} - Due: {formatINR(card.dueAmount)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="date">Date & Time *</Label>
            <Input
              id="date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachments">Attachments</Label>
            <div className="flex gap-2">
              <label
                htmlFor="attachments"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-smooth"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Upload files</span>
                  </>
                )}
                <input
                  id="attachments"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={url}
                      alt="Attachment"
                      className="w-20 h-20 object-cover rounded-lg border-2 border-border"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-smooth"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploading} className="flex-1">
              {saving ? 'Saving...' : expense ? 'Update' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
