import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, deleteDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Expense } from '@/types/expense';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { ExpenseItem } from './ExpenseItem';
import { ExpenseDialog } from './ExpenseDialog';
import { toast } from 'sonner';

interface ExpenseListProps {
  onExpenseChange: () => void;
}

export function ExpenseList({ onExpenseChange }: ExpenseListProps) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (user) {
      loadExpenses();
    }
  }, [user]);

  const loadExpenses = async () => {
    if (!user) return;

    try {
      const expensesRef = collection(db, 'users', user.uid, 'expenses');
      const q = query(expensesRef, orderBy('date', 'desc'), limit(10));
      const snapshot = await getDocs(q);

      const expensesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Expense[];

      setExpenses(expensesList);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (!user || !confirm('Are you sure you want to delete this expense?')) return;

    try {
      const expense = expenses.find((e) => e.id === expenseId);
      if (!expense) return;

      const expenseRef = doc(db, 'users', user.uid, 'expenses', expenseId);

      await runTransaction(db, async (tx) => {
        // Refund to appropriate wallet
        const walletId = expense.wallet === 'cash' ? 'cash' : expense.walletId;
        
        if (expense.wallet === 'bank' && walletId && walletId !== 'cash') {
          const bankRef = doc(db, 'users', user.uid, 'banks', walletId);
          const bankSnap = await tx.get(bankRef);
          if (bankSnap.exists()) {
            const currentBalance = bankSnap.data().balance || 0;
            tx.update(bankRef, {
              balance: currentBalance + expense.amount,
              lastUpdated: serverTimestamp(),
            });
          }
        } else if (expense.wallet === 'creditCard' && walletId && walletId !== 'cash') {
          const cardRef = doc(db, 'users', user.uid, 'creditCards', walletId);
          const cardSnap = await tx.get(cardRef);
          if (cardSnap.exists()) {
            const currentDue = cardSnap.data().dueAmount || 0;
            tx.update(cardRef, {
              dueAmount: Math.max(0, currentDue - expense.amount),
              lastUpdated: serverTimestamp(),
            });
          }
        } else if (expense.wallet === 'cash') {
          const cashRef = doc(db, 'users', user.uid, 'wallets', 'cash');
          const cashSnap = await tx.get(cashRef);
          const currentBalance = cashSnap.exists() ? cashSnap.data().balance || 0 : 0;
          tx.set(cashRef, {
            balance: currentBalance + expense.amount,
            lastUpdated: serverTimestamp(),
          }, { merge: true });
        }

        tx.delete(expenseRef);
      });

      toast.success('Expense deleted');
      loadExpenses();
      onExpenseChange();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full group">
              <CardTitle>Recent Expenses</CardTitle>
              <ChevronDown 
                className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ease-in-out group-hover:text-foreground ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            <CardContent>
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-card">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full group">
              <CardTitle>Recent Expenses</CardTitle>
              <ChevronDown 
                className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ease-in-out group-hover:text-foreground ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            <CardContent>
              {expenses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No expenses yet. Add your first expense!
                </p>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <ExpenseItem
                      key={expense.id}
                      expense={expense}
                      onUpdate={loadExpenses}
                      onEdit={setEditingExpense}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {editingExpense && (
        <ExpenseDialog
          open={!!editingExpense}
          onOpenChange={(open) => !open && setEditingExpense(null)}
          expense={editingExpense}
          onSuccess={() => {
            loadExpenses();
            onExpenseChange();
            setEditingExpense(null);
          }}
        />
      )}
    </>
  );
}
