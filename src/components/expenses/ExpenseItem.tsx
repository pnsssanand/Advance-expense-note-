import { format } from 'date-fns';
import { Trash2, Edit, Paperclip } from 'lucide-react';
import { Expense, WalletType } from '@/types/expense';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCloudinaryThumbnail } from '@/lib/cloudinary';

interface ExpenseItemProps {
  expense: Expense;
  onUpdate: () => void;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expenseId: string) => void;
}

const walletIcons: Record<WalletType, string> = {
  bank: '🏦',
  creditCard: '💳',
  cash: '💵',
};

export function ExpenseItem({ expense, onEdit, onDelete }: ExpenseItemProps) {
  return (
    <Card className="shadow-card hover:shadow-lg transition-smooth">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{walletIcons[expense.wallet]}</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                {expense.category}
              </span>
            </div>
            <p className="font-semibold text-lg mb-1">
              ${expense.amount.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              {expense.purpose}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(expense.date, 'MMM dd, yyyy • h:mm a')}
            </p>
            
            {expense.attachments.length > 0 && (
              <div className="flex gap-2 mt-2">
                {expense.attachments.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group"
                  >
                    <img
                      src={getCloudinaryThumbnail(url, 80)}
                      alt="Attachment"
                      className="w-16 h-16 object-cover rounded-lg border-2 border-border group-hover:border-primary transition-smooth"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-smooth rounded-lg flex items-center justify-center">
                      <Paperclip className="w-5 h-5 text-white" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => onEdit(expense)}
                className="h-8 w-8"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                size="icon"
                onClick={() => onDelete(expense.id)}
                className="h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
