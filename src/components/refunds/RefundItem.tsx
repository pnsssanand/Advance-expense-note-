import { format } from 'date-fns';
import { Trash2, Edit, CheckCircle2, Clock, Phone, MessageCircle } from 'lucide-react';
import { Refund } from '@/types/expense';
import { formatINR } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface RefundItemProps {
  refund: Refund;
  onEdit: (refund: Refund) => void;
  onDelete: (refundId: string) => void;
  onMarkReceived: (refund: Refund) => void;
}

export function RefundItem({ refund, onEdit, onDelete, onMarkReceived }: RefundItemProps) {
  return (
    <Card className="shadow-card hover:shadow-lg transition-smooth hover-lift">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-lg">👤</span>
              <span className="font-semibold text-foreground">{refund.name}</span>
              <Badge 
                variant={refund.status === 'pending' ? 'secondary' : 'default'}
                className={refund.status === 'pending' 
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }
              >
                {refund.status === 'pending' ? (
                  <><Clock className="h-3 w-3 mr-1" /> Pending</>
                ) : (
                  <><CheckCircle2 className="h-3 w-3 mr-1" /> Received</>
                )}
              </Badge>
            </div>
            <p className="font-bold text-lg text-primary mb-1">
              {formatINR(refund.amount)}
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              {refund.purpose}
            </p>
            {refund.contactNumber && (
              <div className="flex items-center gap-2 mt-2 mb-1">
                <span className="text-xs text-muted-foreground">+91 {refund.contactNumber}</span>
                <a
                  href={`tel:+91${refund.contactNumber}`}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
                  title="Call"
                >
                  <Phone className="h-3.5 w-3.5" />
                </a>
                <a
                  href={`https://wa.me/91${refund.contactNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-green-100 hover:bg-green-200 text-green-600 transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Added {format(refund.createdAt, 'MMM dd, yyyy')}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {refund.status === 'pending' && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => onMarkReceived(refund)}
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                title="Mark as Received"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => onEdit(refund)}
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => onDelete(refund.id)}
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
