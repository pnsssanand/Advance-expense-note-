import { useState, useEffect } from 'react';
import { Advance } from '@/types/expense';
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
import { Textarea } from '@/components/ui/textarea';

interface AdvanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advance?: Advance | null;
  onSave: (data: { name: string; amount: number; purpose: string }) => Promise<void>;
}

export function AdvanceDialog({ open, onOpenChange, advance, onSave }: AdvanceDialogProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (advance) {
      setName(advance.name);
      setAmount(advance.amount.toString());
      setPurpose(advance.purpose);
    } else {
      setName('');
      setAmount('');
      setPurpose('');
    }
  }, [advance, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !amount || !purpose.trim()) {
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        amount: amountNum,
        purpose: purpose.trim(),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto animate-slide-up sm:w-full">
        <DialogHeader>
          <DialogTitle>{advance ? 'Edit Advance' : 'Add Advance Amount'}</DialogTitle>
          <DialogDescription>
            {advance ? 'Update advance details' : 'Enter details of money you gave to someone'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name (Who did you give money to?) *</Label>
            <Input
              id="name"
              placeholder="e.g., John, Friend, Colleague"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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
            <Label htmlFor="purpose">Purpose (Why did you give this amount?) *</Label>
            <Textarea
              id="purpose"
              placeholder="e.g., Lent for emergency, Helped with rent, Trip expenses"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
              rows={3}
            />
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
            <Button type="submit" disabled={saving || !name.trim() || !amount || !purpose.trim()} className="flex-1">
              {saving ? 'Saving...' : advance ? 'Update' : 'Add Advance'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
