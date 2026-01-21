import { useState, useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard } from '@/types/expense';
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
import { Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface CreditCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: CreditCard;
  onSuccess: () => void;
}

export function CreditCardDialog({ open, onOpenChange, card, onSuccess }: CreditCardDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [dueAmount, setDueAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (card) {
      setName(card.name);
      setDueAmount(card.dueAmount.toString());
      setDueDate(card.dueDate?.toString() || '');
    } else {
      setName('');
      setDueAmount('0');
      setDueDate('');
    }
  }, [card, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!name) {
      toast.error('Please enter card name');
      return;
    }

    const dueNum = parseFloat(dueAmount || '0');
    if (isNaN(dueNum) || dueNum < 0) {
      toast.error('Please enter a valid due amount');
      return;
    }

    setSaving(true);

    try {
      const cardId = card?.id || `card_${Date.now()}`;
      const cardRef = doc(db, 'users', user.uid, 'creditCards', cardId);

      const dueDateNum = dueDate ? parseInt(dueDate) : null;
      
      await setDoc(cardRef, {
        name,
        dueAmount: dueNum,
        ...(dueDateNum && dueDateNum >= 1 && dueDateNum <= 31 ? { dueDate: dueDateNum } : {}),
        lastUpdated: serverTimestamp(),
      }, { merge: true });

      toast.success(card ? 'Credit card updated' : 'Credit card added');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving credit card:', error);
      toast.error('Failed to save credit card');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md animate-scale-in">
        <DialogHeader>
          <DialogTitle>{card ? 'Edit Credit Card' : 'Add Credit Card'}</DialogTitle>
          <DialogDescription>
            {card ? 'Update your credit card details' : 'Add a new credit card'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Card Name *</Label>
            <Input
              id="name"
              placeholder="e.g., HDFC Millennia, ICICI Amazon Pay"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueAmount">Current Due Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
              <Input
                id="dueAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-8"
                value={dueAmount}
                onChange={(e) => setDueAmount(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave as 0 if there's no current due
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Bill Due Date (Day of Month)
            </Label>
            <Input
              id="dueDate"
              type="number"
              min="1"
              max="31"
              placeholder="e.g., 15"
              value={dueDate}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 31)) {
                  setDueDate(value);
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Enter the day of month when your bill is due (1-31)
            </p>
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
              {saving ? 'Saving...' : card ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
