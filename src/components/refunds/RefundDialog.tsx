import { useState, useEffect } from 'react';
import { Refund } from '@/types/expense';
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

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refund?: Refund | null;
  onSave: (data: { name: string; amount: number; purpose: string; contactNumber: string }) => Promise<void>;
}

export function RefundDialog({ open, onOpenChange, refund, onSave }: RefundDialogProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (refund) {
      setName(refund.name);
      setAmount(refund.amount.toString());
      setPurpose(refund.purpose);
      setContactNumber(refund.contactNumber || '');
    } else {
      setName('');
      setAmount('');
      setPurpose('');
      setContactNumber('');
    }
  }, [refund, open]);

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
        contactNumber: contactNumber.trim(),
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
          <DialogTitle>{refund ? 'Edit Refund' : 'Add Pending Refund'}</DialogTitle>
          <DialogDescription>
            {refund ? 'Update refund details' : 'Enter details of the pending refund you expect to receive'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name (Who owes you?) *</Label>
            <Input
              id="name"
              placeholder="e.g., John, Company XYZ, Friend"
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
            <Label htmlFor="purpose">Purpose (Why is this refund expected?) *</Label>
            <Textarea
              id="purpose"
              placeholder="e.g., Lent money for groceries, Product return refund, Split bill payment"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactNumber">Contact Number (Optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">+91</span>
              <Input
                id="contactNumber"
                type="tel"
                placeholder="9876543210"
                className="pl-12"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
              />
            </div>
            <p className="text-xs text-muted-foreground">Enter 10-digit mobile number for quick call/WhatsApp</p>
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
              {saving ? 'Saving...' : refund ? 'Update' : 'Add Refund'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
