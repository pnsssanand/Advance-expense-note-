import { format } from 'date-fns';
import { Expense } from '@/types/expense';
import { formatINR } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExpenseItem } from './ExpenseItem';

interface ExpenseDayDialogProps {
  date: string | null;
  expenses: Expense[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseDayDialog({ date, expenses, open, onOpenChange }: ExpenseDayDialogProps) {
  if (!date) return null;

  const dayExpenses = expenses.filter(
    (exp) => format(exp.date, 'yyyy-MM-dd') === date
  );

  const total = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{format(new Date(date), 'MMMM dd, yyyy')}</DialogTitle>
          <DialogDescription>
            {dayExpenses.length} expense{dayExpenses.length !== 1 ? 's' : ''} • Total: {formatINR(total)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {dayExpenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No expenses for this day
            </p>
          ) : (
            dayExpenses.map((expense) => (
              <ExpenseItem key={expense.id} expense={expense} onUpdate={() => {}} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
