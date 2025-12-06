import { format } from 'date-fns';
import { Trash2, Edit, CheckCircle2, Clock, Send } from 'lucide-react';
import { Advance } from '@/types/expense';
import { formatINR } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AdvanceItemProps {
  advance: Advance;
  onEdit: (advance: Advance) => void;
  onDelete: (advanceId: string) => void;
  onMarkReturned: (advance: Advance) => void;
}

export function AdvanceItem({ advance, onEdit, onDelete, onMarkReturned }: AdvanceItemProps) {
  return (
    <Card className="shadow-card hover:shadow-lg transition-smooth hover-lift">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-lg">💸</span>
              <span className="font-semibold text-foreground">{advance.name}</span>
              <Badge 
                variant={advance.status === 'outstanding' ? 'secondary' : 'default'}
                className={advance.status === 'outstanding' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }
              >
                {advance.status === 'outstanding' ? (
                  <><Clock className="h-3 w-3 mr-1" /> Outstanding</>
                ) : (
                  <><CheckCircle2 className="h-3 w-3 mr-1" /> Returned</>
                )}
              </Badge>
            </div>
            <p className="font-bold text-lg text-primary mb-1">
              {formatINR(advance.amount)}
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              {advance.purpose}
            </p>
            <p className="text-xs text-muted-foreground">
              Given on {format(advance.createdAt, 'MMM dd, yyyy')}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {advance.status === 'outstanding' && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => onMarkReturned(advance)}
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                title="Mark as Returned"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => onEdit(advance)}
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => onDelete(advance.id)}
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
