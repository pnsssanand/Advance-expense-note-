import { useState, useRef, useEffect } from 'react';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';
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

interface PinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'set' | 'verify';
  onPinSubmit: (pin: string) => Promise<boolean>;
  loading?: boolean;
}

export function PinDialog({ 
  open, 
  onOpenChange, 
  mode, 
  onPinSubmit,
  loading = false 
}: PinDialogProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPin(['', '', '', '']);
      setConfirmPin(['', '', '', '']);
      setError('');
      setStep('enter');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open]);

  const handlePinChange = (index: number, value: string, isConfirm = false) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newPin = isConfirm ? [...confirmPin] : [...pin];
    newPin[index] = value.slice(-1); // Only take last character
    
    if (isConfirm) {
      setConfirmPin(newPin);
    } else {
      setPin(newPin);
    }
    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      const refs = isConfirm ? confirmInputRefs : inputRefs;
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent, isConfirm = false) => {
    const refs = isConfirm ? confirmInputRefs : inputRefs;
    const currentPin = isConfirm ? confirmPin : pin;
    
    if (e.key === 'Backspace' && !currentPin[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const pinValue = pin.join('');
    
    if (pinValue.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    if (mode === 'set') {
      if (step === 'enter') {
        setStep('confirm');
        setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
        return;
      }

      const confirmPinValue = confirmPin.join('');
      if (pinValue !== confirmPinValue) {
        setError('PINs do not match. Please try again.');
        setConfirmPin(['', '', '', '']);
        confirmInputRefs.current[0]?.focus();
        return;
      }
    }

    const success = await onPinSubmit(pinValue);
    if (!success) {
      setError(mode === 'verify' ? 'Incorrect PIN. Please try again.' : 'Failed to set PIN. Please try again.');
      if (mode === 'verify') {
        setPin(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    }
  };

  const renderPinInputs = (values: string[], refs: React.MutableRefObject<(HTMLInputElement | null)[]>, isConfirm = false) => (
    <div className="flex justify-center gap-3">
      {values.map((digit, index) => (
        <Input
          key={index}
          ref={(el) => (refs.current[index] = el)}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handlePinChange(index, e.target.value, isConfirm)}
          onKeyDown={(e) => handleKeyDown(index, e, isConfirm)}
          className="w-14 h-14 text-center text-2xl font-bold"
          disabled={loading}
        />
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'set' ? (
              <>
                <ShieldCheck className="h-5 w-5 text-primary" />
                Set Savings PIN
              </>
            ) : (
              <>
                <Lock className="h-5 w-5 text-primary" />
                Enter Savings PIN
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'set' 
              ? step === 'enter'
                ? 'Create a 4-digit PIN to secure your savings section'
                : 'Confirm your 4-digit PIN'
              : 'Enter your 4-digit PIN to access savings'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {mode === 'set' && step === 'confirm' ? (
            <div className="space-y-2">
              <Label className="text-center block">Confirm PIN</Label>
              {renderPinInputs(confirmPin, confirmInputRefs, true)}
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-center block">
                {mode === 'set' ? 'Enter New PIN' : 'Enter PIN'}
              </Label>
              {renderPinInputs(pin, inputRefs)}
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (mode === 'set' && step === 'confirm') {
                  setStep('enter');
                  setConfirmPin(['', '', '', '']);
                  setError('');
                } else {
                  onOpenChange(false);
                }
              }}
              className="flex-1"
              disabled={loading}
            >
              {mode === 'set' && step === 'confirm' ? 'Back' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {mode === 'set' 
                ? step === 'enter' ? 'Next' : 'Set PIN'
                : 'Unlock'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
