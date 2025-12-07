import { useState } from 'react';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Wallets, BankAccount, CreditCard } from '@/types/expense';
import { formatINR } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Banknote, 
  CreditCard as CreditCardIcon, 
  Wallet as WalletIcon,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { BankAccountDialog } from './BankAccountDialog';
import { CreditCardDialog } from './CreditCardDialog';

interface WalletCardsProps {
  wallets: Wallets;
  onUpdate: () => void;
}

export function WalletCards({ wallets, onUpdate }: WalletCardsProps) {
  const { user } = useAuth();
  const [banksOpen, setBanksOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [cashOpen, setCashOpen] = useState(false);
  
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | undefined>();
  const [editingCard, setEditingCard] = useState<CreditCard | undefined>();
  const [cashAmount, setCashAmount] = useState('');
  const [editingCash, setEditingCash] = useState(false);

  const totalBankBalance = wallets.banks.reduce((sum, bank) => sum + bank.balance, 0);
  const totalCreditDue = wallets.creditCards.reduce((sum, card) => sum + card.dueAmount, 0);

  const handleDeleteBank = async (bankId: string) => {
    if (!user || !confirm('Are you sure you want to delete this bank account?')) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'banks', bankId));
      toast.success('Bank account deleted');
      onUpdate();
    } catch (error) {
      toast.error('Failed to delete bank account');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!user || !confirm('Are you sure you want to delete this credit card?')) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'creditCards', cardId));
      toast.success('Credit card deleted');
      onUpdate();
    } catch (error) {
      toast.error('Failed to delete credit card');
    }
  };

  const handleUpdateCash = async () => {
    if (!user) return;

    const amount = parseFloat(cashAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const cashRef = doc(db, 'users', user.uid, 'wallets', 'cash');
      await setDoc(cashRef, {
        balance: amount,
        lastUpdated: serverTimestamp(),
      });

      toast.success('Cash balance updated');
      setEditingCash(false);
      setCashAmount('');
      onUpdate();
    } catch (error) {
      toast.error('Failed to update cash');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Banks Section */}
      <Card className="overflow-hidden shadow-card hover:shadow-lg transition-smooth border-2">
        <Collapsible open={banksOpen} onOpenChange={setBanksOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="p-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-wallet-bank">
                  <Banknote className="h-5 w-5 text-wallet-bank-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-muted-foreground">Bank Accounts</p>
                  <p className="text-2xl font-heading font-bold">{formatINR(totalBankBalance)}</p>
                  <p className="text-xs text-muted-foreground">{wallets.banks.length} account{wallets.banks.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${banksOpen ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="p-4 space-y-2">
              {wallets.banks.map((bank) => (
                <div 
                  key={bank.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-smooth group"
                >
                  <div>
                    <p className="font-medium">{bank.name}</p>
                    <p className="text-lg font-semibold text-primary">{formatINR(bank.balance)}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingBank(bank);
                        setBankDialogOpen(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteBank(bank.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => {
                  setEditingBank(undefined);
                  setBankDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Bank Account
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Credit Cards Section */}
      <Card className="overflow-hidden shadow-card hover:shadow-lg transition-smooth border-2">
        <Collapsible open={cardsOpen} onOpenChange={setCardsOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="p-4 flex items-center justify-between bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-wallet-credit">
                  <CreditCardIcon className="h-5 w-5 text-wallet-credit-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-muted-foreground">Credit Cards</p>
                  <p className="text-2xl font-heading font-bold text-destructive">{formatINR(totalCreditDue)}</p>
                  <p className="text-xs text-muted-foreground">{wallets.creditCards.length} card{wallets.creditCards.length !== 1 ? 's' : ''} · Total Due</p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${cardsOpen ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="p-4 space-y-2">
              {wallets.creditCards.map((card) => (
                <div 
                  key={card.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-smooth group"
                >
                  <div>
                    <p className="font-medium">{card.name}</p>
                    <p className="text-lg font-semibold text-destructive">Due: {formatINR(card.dueAmount)}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingCard(card);
                        setCardDialogOpen(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteCard(card.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => {
                  setEditingCard(undefined);
                  setCardDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Credit Card
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Cash Section */}
      <Card className="overflow-hidden shadow-card hover:shadow-lg transition-smooth border-2">
        <Collapsible open={cashOpen} onOpenChange={setCashOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="p-4 flex items-center justify-between bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-wallet-cash">
                  <WalletIcon className="h-5 w-5 text-wallet-cash-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-muted-foreground">Cash</p>
                  <p className="text-2xl font-heading font-bold">{formatINR(wallets.cash.balance)}</p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${cashOpen ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="p-4">
              {editingCash ? (
                <div className="space-y-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter cash amount"
                      className="pl-8"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setEditingCash(false);
                        setCashAmount('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleUpdateCash}
                    >
                      Update
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setCashAmount(wallets.cash.balance.toString());
                    setEditingCash(true);
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Update Cash Balance
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <BankAccountDialog
        open={bankDialogOpen}
        onOpenChange={setBankDialogOpen}
        account={editingBank}
        onSuccess={onUpdate}
      />

      <CreditCardDialog
        open={cardDialogOpen}
        onOpenChange={setCardDialogOpen}
        card={editingCard}
        onSuccess={onUpdate}
      />
    </div>
  );
}
