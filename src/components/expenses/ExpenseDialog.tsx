import { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Expense, WalletType, EXPENSE_CATEGORIES, CURRENCIES } from '@/types/expense';
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
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('');
  const [purpose, setPurpose] = useState('');
  const [wallet, setWallet] = useState<WalletType>('cash');
  const [date, setDate] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setCurrency(expense.currency);
      setCategory(expense.category);
      setPurpose(expense.purpose);
      setWallet(expense.wallet);
      setDate(expense.date.toISOString().slice(0, 16));
      setAttachments(expense.attachments);
    } else {
      // Reset form
      setAmount('');
      setCurrency('USD');
      setCategory('');
      setPurpose('');
      setWallet('cash');
      setDate(new Date().toISOString().slice(0, 16));
      setAttachments([]);
    }
  }, [expense, open]);

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
        currency,
        category,
        purpose,
        wallet,
        date: new Date(date),
        attachments,
      };

      if (expense) {
        // Update existing expense
        await updateExpense(expense.id, expenseData, expense.amount, expense.wallet);
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

    const walletRef = doc(db, 'users', user.uid, 'wallets', 'balances');
    const expensesRef = collection(db, 'users', user.uid, 'expenses');

    await runTransaction(db, async (tx) => {
      const walletSnap = await tx.get(walletRef);
      if (!walletSnap.exists()) throw new Error('Wallet not found');

      const walletData = walletSnap.data();
      const currentBalance = walletData[expenseData.wallet]?.balance || 0;
      const newBalance = currentBalance - expenseData.amount;

      tx.update(walletRef, {
        [`${expenseData.wallet}.balance`]: newBalance,
        [`${expenseData.wallet}.lastUpdated`]: serverTimestamp(),
      });

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
    oldWallet: WalletType
  ) => {
    if (!user) return;

    const walletRef = doc(db, 'users', user.uid, 'wallets', 'balances');
    const expenseRef = doc(db, 'users', user.uid, 'expenses', expenseId);

    await runTransaction(db, async (tx) => {
      const walletSnap = await tx.get(walletRef);
      if (!walletSnap.exists()) throw new Error('Wallet not found');

      const walletData = walletSnap.data();

      // Refund old amount to old wallet
      const oldBalance = walletData[oldWallet]?.balance || 0;
      const refundedBalance = oldBalance + oldAmount;

      // Deduct new amount from new wallet
      const newBalance = walletData[expenseData.wallet]?.balance || 0;
      const finalBalance = (oldWallet === expenseData.wallet ? refundedBalance : newBalance) - expenseData.amount;

      if (oldWallet === expenseData.wallet) {
        tx.update(walletRef, {
          [`${expenseData.wallet}.balance`]: finalBalance,
          [`${expenseData.wallet}.lastUpdated`]: serverTimestamp(),
        });
      } else {
        tx.update(walletRef, {
          [`${oldWallet}.balance`]: refundedBalance,
          [`${oldWallet}.lastUpdated`]: serverTimestamp(),
          [`${expenseData.wallet}.balance`]: finalBalance,
          [`${expenseData.wallet}.lastUpdated`]: serverTimestamp(),
        });
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
          <DialogDescription>
            {expense ? 'Update expense details' : 'Enter the details of your expense'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Label htmlFor="wallet">Wallet *</Label>
            <Select value={wallet} onValueChange={(v) => setWallet(v as WalletType)} required>
              <SelectTrigger id="wallet">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">🏦 Bank</SelectItem>
                <SelectItem value="creditCard">💳 Credit Card</SelectItem>
                <SelectItem value="cash">💵 Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
