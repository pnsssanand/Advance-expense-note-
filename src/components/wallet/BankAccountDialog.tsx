import { useState, useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { BankAccount } from '@/types/expense';
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
import { toast } from 'sonner';

interface BankAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: BankAccount;
  onSuccess: () => void;
}

export function BankAccountDialog({ open, onOpenChange, account, onSuccess }: BankAccountDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setBalance(account.balance.toString());
    } else {
      setName('');
      setBalance('');
    }
  }, [account, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!name || !balance) {
      toast.error('Please fill in all fields');
      return;
    }

    const balanceNum = parseFloat(balance);
    if (isNaN(balanceNum) || balanceNum < 0) {
      toast.error('Please enter a valid balance');
      return;
    }

    setSaving(true);

    try {
      const bankId = account?.id || `bank_${Date.now()}`;
      const bankRef = doc(db, 'users', user.uid, 'banks', bankId);

      await setDoc(bankRef, {
        name,
        balance: balanceNum,
        lastUpdated: serverTimestamp(),
      }, { merge: true });

      toast.success(account ? 'Bank account updated' : 'Bank account added');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving bank account:', error);
      toast.error('Failed to save bank account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md animate-scale-in">
        <DialogHeader>
          <DialogTitle>{account ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
          <DialogDescription>
            {account ? 'Update your bank account details' : 'Add a new bank account'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Bank Name *</Label>
            <Input
              id="name"
              placeholder="e.g., HDFC Savings, ICICI Salary Account"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance">Current Balance *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
              <Input
                id="balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-8"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                required
              />
            </div>
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
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Saving...' : account ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
