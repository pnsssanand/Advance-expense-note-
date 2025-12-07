import { useEffect, useState } from 'react';
import { collection, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Advance } from '@/types/expense';
import { formatINR } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, ChevronDown, Send, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { AdvanceItem } from './AdvanceItem';
import { AdvanceDialog } from './AdvanceDialog';

export function AdvancesSection() {
  const { user } = useAuth();
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null);

  useEffect(() => {
    if (!user) return;

    // Real-time listener for advances
    const advancesRef = collection(db, 'users', user.uid, 'advances');
    const q = query(advancesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const advancesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Advance[];

      setAdvances(advancesList);
      setLoading(false);
    }, (error) => {
      console.error('Error loading advances:', error);
      toast.error('Failed to load advances');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const outstandingAdvances = advances.filter(a => a.status === 'outstanding');
  const totalOutstanding = outstandingAdvances.reduce((sum, a) => sum + a.amount, 0);
  const returnedAdvances = advances.filter(a => a.status === 'returned');
  const totalReturned = returnedAdvances.reduce((sum, a) => sum + a.amount, 0);

  const handleSaveAdvance = async (data: { name: string; amount: number; purpose: string }) => {
    if (!user) return;

    try {
      if (editingAdvance) {
        // Update existing advance
        const advanceRef = doc(db, 'users', user.uid, 'advances', editingAdvance.id);
        await updateDoc(advanceRef, {
          ...data,
          updatedAt: serverTimestamp(),
        });
        toast.success('Advance updated');
      } else {
        // Add new advance
        const advancesRef = collection(db, 'users', user.uid, 'advances');
        await addDoc(advancesRef, {
          ...data,
          status: 'outstanding',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success('Advance added');
      }
      setEditingAdvance(null);
    } catch (error) {
      console.error('Error saving advance:', error);
      toast.error('Failed to save advance');
      throw error;
    }
  };

  const handleEdit = (advance: Advance) => {
    setEditingAdvance(advance);
    setDialogOpen(true);
  };

  const handleDelete = async (advanceId: string) => {
    if (!user || !confirm('Are you sure you want to delete this advance?')) return;

    try {
      const advanceRef = doc(db, 'users', user.uid, 'advances', advanceId);
      await deleteDoc(advanceRef);
      toast.success('Advance deleted');
    } catch (error) {
      console.error('Error deleting advance:', error);
      toast.error('Failed to delete advance');
    }
  };

  const handleMarkReturned = async (advance: Advance) => {
    if (!user) return;

    try {
      const advanceRef = doc(db, 'users', user.uid, 'advances', advance.id);
      await updateDoc(advanceRef, {
        status: 'returned',
        updatedAt: serverTimestamp(),
      });
      toast.success(`${formatINR(advance.amount)} from ${advance.name} marked as returned!`);
    } catch (error) {
      console.error('Error updating advance status:', error);
      toast.error('Failed to update advance status');
    }
  };

  const handleAddNew = () => {
    setEditingAdvance(null);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full group">
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Advance Amounts
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
                <Send className="h-5 w-5 text-primary" />
                Advance Amounts
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
                {/* Outstanding Total */}
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Send className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                      Total Outstanding
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {formatINR(totalOutstanding)}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                    {outstandingAdvances.length} outstanding advance{outstandingAdvances.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Returned Total */}
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">
                      Total Returned
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {formatINR(totalReturned)}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    {returnedAdvances.length} returned advance{returnedAdvances.length !== 1 ? 's' : ''}
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
                Add Advance Amount
              </Button>

              {/* Advances List */}
              {advances.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No advances yet. Track money you've given to others!
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Outstanding Advances */}
                  {outstandingAdvances.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Outstanding</h4>
                      {outstandingAdvances.map((advance) => (
                        <AdvanceItem
                          key={advance.id}
                          advance={advance}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onMarkReturned={handleMarkReturned}
                        />
                      ))}
                    </div>
                  )}

                  {/* Returned Advances */}
                  {returnedAdvances.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Returned</h4>
                      {returnedAdvances.map((advance) => (
                        <AdvanceItem
                          key={advance.id}
                          advance={advance}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onMarkReturned={handleMarkReturned}
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

      <AdvanceDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingAdvance(null);
        }}
        advance={editingAdvance}
        onSave={handleSaveAdvance}
      />
    </>
  );
}
