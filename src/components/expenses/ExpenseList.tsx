import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, deleteDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Expense } from '@/types/expense';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

      const walletRef = doc(db, 'users', user.uid, 'wallets', 'balances');
      const expenseRef = doc(db, 'users', user.uid, 'expenses', expenseId);

      await runTransaction(db, async (tx) => {
        const walletSnap = await tx.get(walletRef);
        if (!walletSnap.exists()) throw new Error('Wallet not found');

        const walletData = walletSnap.data();
        const currentBalance = walletData[expense.wallet]?.balance || 0;
        const newBalance = currentBalance + expense.amount; // Refund the amount

        tx.update(walletRef, {
          [`${expense.wallet}.balance`]: newBalance,
        });

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
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
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
