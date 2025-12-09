import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Refund } from '@/types/expense';
import { formatINR } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, ChevronDown, Wallet, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { RefundItem } from './RefundItem';
import { RefundDialog } from './RefundDialog';

export function RefundsSection() {
  const { user } = useAuth();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRefund, setEditingRefund] = useState<Refund | null>(null);

  useEffect(() => {
    if (!user) return;

    // Real-time listener for refunds
    const refundsRef = collection(db, 'users', user.uid, 'refunds');
    const q = query(refundsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const refundsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Refund[];

      setRefunds(refundsList);
      setLoading(false);
    }, (error) => {
      console.error('Error loading refunds:', error);
      toast.error('Failed to load refunds');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const pendingRefunds = refunds.filter(r => r.status === 'pending');
  const totalPending = pendingRefunds.reduce((sum, r) => sum + r.amount, 0);
  const receivedRefunds = refunds.filter(r => r.status === 'received');
  const totalReceived = receivedRefunds.reduce((sum, r) => sum + r.amount, 0);

  const handleSaveRefund = async (data: { name: string; amount: number; purpose: string; contactNumber: string }) => {
    if (!user) return;

    try {
      if (editingRefund) {
        // Update existing refund
        const refundRef = doc(db, 'users', user.uid, 'refunds', editingRefund.id);
        await updateDoc(refundRef, {
          ...data,
          updatedAt: serverTimestamp(),
        });
        toast.success('Refund updated');
      } else {
        // Add new refund
        const refundsRef = collection(db, 'users', user.uid, 'refunds');
        await addDoc(refundsRef, {
          ...data,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success('Refund added');
      }
      setEditingRefund(null);
    } catch (error) {
      console.error('Error saving refund:', error);
      toast.error('Failed to save refund');
      throw error;
    }
  };

  const handleEdit = (refund: Refund) => {
    setEditingRefund(refund);
    setDialogOpen(true);
  };

  const handleDelete = async (refundId: string) => {
    if (!user || !confirm('Are you sure you want to delete this refund?')) return;

    try {
      const refundRef = doc(db, 'users', user.uid, 'refunds', refundId);
      await deleteDoc(refundRef);
      toast.success('Refund deleted');
    } catch (error) {
      console.error('Error deleting refund:', error);
      toast.error('Failed to delete refund');
    }
  };

  const handleMarkReceived = async (refund: Refund) => {
    if (!user) return;

    try {
      const refundRef = doc(db, 'users', user.uid, 'refunds', refund.id);
      await updateDoc(refundRef, {
        status: 'received',
        updatedAt: serverTimestamp(),
      });
      toast.success(`Refund of ${formatINR(refund.amount)} from ${refund.name} marked as received!`);
    } catch (error) {
      console.error('Error updating refund status:', error);
      toast.error('Failed to update refund status');
    }
  };

  const handleAddNew = () => {
    setEditingRefund(null);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full group">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Pending Refunds
              </CardTitle>
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
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Pending Refunds
              </CardTitle>
              <ChevronDown 
                className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ease-in-out group-hover:text-foreground ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            <CardContent className="space-y-4">
              {/* Total Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Pending Total */}
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                      Total Pending
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {formatINR(totalPending)}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    {pendingRefunds.length} pending refund{pendingRefunds.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Received Total */}
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">
                      Total Received
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {formatINR(totalReceived)}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    {receivedRefunds.length} received refund{receivedRefunds.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Add Button */}
              <Button 
                onClick={handleAddNew} 
                className="w-full gap-2"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                Add Pending Refund
              </Button>

              {/* Refunds List */}
              {refunds.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No refunds yet. Add your first pending refund!
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Pending Refunds */}
                  {pendingRefunds.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Pending</h4>
                      {pendingRefunds.map((refund) => (
                        <RefundItem
                          key={refund.id}
                          refund={refund}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onMarkReceived={handleMarkReceived}
                        />
                      ))}
                    </div>
                  )}

                  {/* Received Refunds */}
                  {receivedRefunds.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Received</h4>
                      {receivedRefunds.map((refund) => (
                        <RefundItem
                          key={refund.id}
                          refund={refund}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onMarkReceived={handleMarkReceived}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <RefundDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingRefund(null);
        }}
        refund={editingRefund}
        onSave={handleSaveRefund}
      />
    </>
  );
}
