import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExpenseDialog } from './ExpenseDialog';

interface AddExpenseButtonProps {
  onExpenseAdded: () => void;
}

export function AddExpenseButton({ onExpenseAdded }: AddExpenseButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-fab hover:scale-110 transition-smooth z-40"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <ExpenseDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => {
          onExpenseAdded();
          setOpen(false);
        }}
      />
    </>
  );
}
