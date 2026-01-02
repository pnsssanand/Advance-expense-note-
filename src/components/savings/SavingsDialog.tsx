import { useState, useEffect } from 'react';
import { collection, doc, getDoc, setDoc, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Savings, SavingsBankAccount } from '@/types/expense';
import { formatINR } from '@/lib/utils';
import { PinDialog } from './PinDialog';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  PiggyBank, 
  Wallet, 
  Building2, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SavingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SavingsDialog({ open, onOpenChange }: SavingsDialogProps) {
  const { user } = useAuth();
  const [savings, setSavings] = useState<Savings | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinLoading, setPinLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinMode, setPinMode] = useState<'set' | 'verify'>('verify');
  
  // Editing states
  const [editingCash, setEditingCash] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [savingCash, setSavingCash] = useState(false);
  
  // New bank account states
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankAmount, setNewBankAmount] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  
  // Edit bank states
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editBankAmount, setEditBankAmount] = useState('');

  // Load savings data
  useEffect(() => {
    if (open && user) {
      loadSavings();
    }
  }, [open, user]);

  // Reset authentication when dialog closes
  useEffect(() => {
    if (!open) {
      setAuthenticated(false);
      setShowPinDialog(false);
    }
  }, [open]);

  const loadSavings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const savingsRef = doc(db, 'users', user.uid, 'savings', 'data');
      const savingsSnap = await getDoc(savingsRef);
      
      if (savingsSnap.exists()) {
        const data = savingsSnap.data();
        
        // Load bank accounts
        const banksRef = collection(db, 'users', user.uid, 'savings', 'data', 'bankAccounts');
        const banksSnap = await getDocs(banksRef);
        const bankAccounts = banksSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          lastUpdated: doc.data().lastUpdated?.toDate() || new Date(),
        })) as SavingsBankAccount[];
        
        setSavings({
          pin: data.pin,
          pinSet: data.pinSet || false,
          cashSavings: data.cashSavings || 0,
          bankAccounts,
          lastAccessedAt: data.lastAccessedAt?.toDate(),
          lastUpdatedAt: data.lastUpdatedAt?.toDate(),
          createdAt: data.createdAt?.toDate(),
        });
        
        // If PIN is not set, show set PIN dialog
        if (!data.pinSet) {
          setPinMode('set');
          setShowPinDialog(true);
        } else {
          setPinMode('verify');
          setShowPinDialog(true);
        }
      } else {
        // First time - no savings data, set up PIN
        setSavings({
          pinSet: false,
          cashSavings: 0,
          bankAccounts: [],
        });
        setPinMode('set');
        setShowPinDialog(true);
      }
    } catch (error) {
      console.error('Error loading savings:', error);
      toast.error('Failed to load savings data');
    } finally {
      setLoading(false);
    }
  };

  // Simple hash function for PIN (in production, use proper encryption)
  const hashPin = (pin: string): string => {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  };

  const handlePinSubmit = async (pin: string): Promise<boolean> => {
    if (!user) return false;
    
    setPinLoading(true);
    try {
      if (pinMode === 'set') {
        // Set new PIN
        const hashedPin = hashPin(pin);
        const savingsRef = doc(db, 'users', user.uid, 'savings', 'data');
        
        await setDoc(savingsRef, {
          pin: hashedPin,
          pinSet: true,
          cashSavings: savings?.cashSavings || 0,
          lastAccessedAt: serverTimestamp(),
          lastUpdatedAt: serverTimestamp(),
          createdAt: savings?.createdAt || serverTimestamp(),
        }, { merge: true });
        
        setSavings(prev => ({
          ...prev!,
          pin: hashedPin,
          pinSet: true,
          lastAccessedAt: new Date(),
        }));
        
        setAuthenticated(true);
        setShowPinDialog(false);
        toast.success('Savings PIN set successfully!');
        return true;
      } else {
        // Verify PIN
        const hashedPin = hashPin(pin);
        
        if (hashedPin === savings?.pin) {
          // Update last accessed time
          const savingsRef = doc(db, 'users', user.uid, 'savings', 'data');
          await setDoc(savingsRef, {
            lastAccessedAt: serverTimestamp(),
          }, { merge: true });
          
          setAuthenticated(true);
          setShowPinDialog(false);
          toast.success('Savings unlocked!');
          return true;
        } else {
          return false;
        }
      }
    } catch (error) {
      console.error('PIN error:', error);
      toast.error('An error occurred. Please try again.');
      return false;
    } finally {
      setPinLoading(false);
    }
  };

  const handleSaveCash = async () => {
    if (!user) return;
    
    const amount = parseFloat(cashAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setSavingCash(true);
    try {
      const savingsRef = doc(db, 'users', user.uid, 'savings', 'data');
      await setDoc(savingsRef, {
        cashSavings: amount,
        lastUpdatedAt: serverTimestamp(),
      }, { merge: true });
      
      setSavings(prev => ({
        ...prev!,
        cashSavings: amount,
        lastUpdatedAt: new Date(),
      }));
      
      setEditingCash(false);
      toast.success('Cash savings updated!');
    } catch (error) {
      console.error('Error saving cash:', error);
      toast.error('Failed to update cash savings');
    } finally {
      setSavingCash(false);
    }
  };

  const handleAddBank = async () => {
    if (!user) return;
    
    if (!newBankName.trim()) {
      toast.error('Please enter a bank name');
      return;
    }
    
    const amount = parseFloat(newBankAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setSavingBank(true);
    try {
      const bankRef = doc(collection(db, 'users', user.uid, 'savings', 'data', 'bankAccounts'));
      await setDoc(bankRef, {
        bankName: newBankName.trim(),
        amount,
        lastUpdated: serverTimestamp(),
      });
      
      // Update main savings lastUpdatedAt
      const savingsRef = doc(db, 'users', user.uid, 'savings', 'data');
      await setDoc(savingsRef, {
        lastUpdatedAt: serverTimestamp(),
      }, { merge: true });
      
      setSavings(prev => ({
        ...prev!,
        bankAccounts: [
          ...prev!.bankAccounts,
          {
            id: bankRef.id,
            bankName: newBankName.trim(),
            amount,
            lastUpdated: new Date(),
          }
        ],
        lastUpdatedAt: new Date(),
      }));
      
      setShowAddBank(false);
      setNewBankName('');
      setNewBankAmount('');
      toast.success('Bank account added!');
    } catch (error) {
      console.error('Error adding bank:', error);
      toast.error('Failed to add bank account');
    } finally {
      setSavingBank(false);
    }
  };

  const handleUpdateBankAmount = async (bankId: string) => {
    if (!user) return;
    
    const amount = parseFloat(editBankAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    try {
      const bankRef = doc(db, 'users', user.uid, 'savings', 'data', 'bankAccounts', bankId);
      await setDoc(bankRef, {
        amount,
        lastUpdated: serverTimestamp(),
      }, { merge: true });
      
      // Update main savings lastUpdatedAt
      const savingsRef = doc(db, 'users', user.uid, 'savings', 'data');
      await setDoc(savingsRef, {
        lastUpdatedAt: serverTimestamp(),
      }, { merge: true });
      
      setSavings(prev => ({
        ...prev!,
        bankAccounts: prev!.bankAccounts.map(b => 
          b.id === bankId ? { ...b, amount, lastUpdated: new Date() } : b
        ),
        lastUpdatedAt: new Date(),
      }));
      
      setEditingBankId(null);
      toast.success('Bank savings updated!');
    } catch (error) {
      console.error('Error updating bank:', error);
      toast.error('Failed to update bank savings');
    }
  };

  const handleDeleteBank = async (bankId: string) => {
    if (!user || !confirm('Are you sure you want to delete this bank account?')) return;
    
    try {
      const bankRef = doc(db, 'users', user.uid, 'savings', 'data', 'bankAccounts', bankId);
      await deleteDoc(bankRef);
      
      // Update main savings lastUpdatedAt
      const savingsRef = doc(db, 'users', user.uid, 'savings', 'data');
      await setDoc(savingsRef, {
        lastUpdatedAt: serverTimestamp(),
      }, { merge: true });
      
      setSavings(prev => ({
        ...prev!,
        bankAccounts: prev!.bankAccounts.filter(b => b.id !== bankId),
        lastUpdatedAt: new Date(),
      }));
      
      toast.success('Bank account deleted!');
    } catch (error) {
      console.error('Error deleting bank:', error);
      toast.error('Failed to delete bank account');
    }
  };

  const totalSavings = (savings?.cashSavings || 0) + 
    (savings?.bankAccounts.reduce((sum, b) => sum + b.amount, 0) || 0);

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open && !showPinDialog} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-primary" />
              My Savings
            </DialogTitle>
            <DialogDescription>
              Manage your cash and bank savings securely
            </DialogDescription>
          </DialogHeader>

          {authenticated && savings ? (
            <div className="space-y-4 py-4">
              {/* Last Updated Note */}
              {savings.lastUpdatedAt && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Last savings updated on{' '}
                    <span className="font-medium text-foreground">
                      {format(savings.lastUpdatedAt, 'PPP \'at\' p')}
                    </span>
                  </span>
                </div>
              )}

              {/* Total Savings */}
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Savings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">
                    {formatINR(totalSavings)}
                  </p>
                </CardContent>
              </Card>

              <Separator />

              {/* Cash Savings */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Cash Savings
                    </CardTitle>
                    {!editingCash && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCash(true);
                          setCashAmount(savings.cashSavings.toString());
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {editingCash ? (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                          placeholder="Enter amount"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <Button 
                        size="icon" 
                        onClick={handleSaveCash}
                        disabled={savingCash}
                      >
                        {savingCash ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => setEditingCash(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-2xl font-semibold">
                      {formatINR(savings.cashSavings)}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Bank Accounts */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Bank Accounts
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddBank(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {showAddBank && (
                    <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Bank Name</Label>
                        <Input
                          id="bankName"
                          value={newBankName}
                          onChange={(e) => setNewBankName(e.target.value)}
                          placeholder="e.g., HDFC Bank"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankAmount">Savings Amount</Label>
                        <Input
                          id="bankAmount"
                          type="number"
                          value={newBankAmount}
                          onChange={(e) => setNewBankAmount(e.target.value)}
                          placeholder="Enter amount"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1" 
                          onClick={handleAddBank}
                          disabled={savingBank}
                        >
                          {savingBank ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Add Bank
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowAddBank(false);
                            setNewBankName('');
                            setNewBankAmount('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {savings.bankAccounts.length === 0 && !showAddBank ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No bank accounts added yet</p>
                    </div>
                  ) : (
                    savings.bankAccounts.map((bank) => (
                      <div 
                        key={bank.id} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{bank.bankName}</p>
                          {editingBankId === bank.id ? (
                            <div className="flex gap-2 mt-2">
                              <Input
                                type="number"
                                value={editBankAmount}
                                onChange={(e) => setEditBankAmount(e.target.value)}
                                placeholder="Enter amount"
                                min="0"
                                step="0.01"
                                className="flex-1"
                              />
                              <Button 
                                size="icon" 
                                onClick={() => handleUpdateBankAmount(bank.id)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="outline"
                                onClick={() => setEditingBankId(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <p className="text-lg font-semibold text-primary">
                              {formatINR(bank.amount)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Updated: {format(bank.lastUpdated, 'PP')}
                          </p>
                        </div>
                        {editingBankId !== bank.id && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingBankId(bank.id);
                                setEditBankAmount(bank.amount.toString());
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteBank(bank.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Please authenticate to view savings</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PinDialog
        open={showPinDialog}
        onOpenChange={(open) => {
          if (!open && !authenticated) {
            onOpenChange(false);
          }
          setShowPinDialog(open);
        }}
        mode={pinMode}
        onPinSubmit={handlePinSubmit}
        loading={pinLoading}
      />
    </>
  );
}
