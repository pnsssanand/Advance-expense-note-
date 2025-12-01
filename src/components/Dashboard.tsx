import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Wallets } from '@/types/expense';
import { WalletCards } from '@/components/wallet/WalletCards';
import { ExpenseChart } from '@/components/expenses/ExpenseChart';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { NotesSection } from '@/components/notes/NotesSection';
import { AddExpenseButton } from '@/components/expenses/AddExpenseButton';
import { Header } from '@/components/layout/Header';
import { toast } from 'sonner';

export function Dashboard() {
  const { user, userProfile } = useAuth();
  const [wallets, setWallets] = useState<Wallets | null>(null);
  const [showGreeting, setShowGreeting] = useState(true);

  useEffect(() => {
    if (user) {
      loadWallets();
      
      // Show greeting once per session
      const greetingShown = sessionStorage.getItem('greetingShown');
      if (!greetingShown && userProfile?.displayName) {
        setTimeout(() => {
          toast.success(
            `Hey, welcome back, ${userProfile.displayName}! Please take a minute and write your today's expenses.`,
            { duration: 6000 }
          );
          sessionStorage.setItem('greetingShown', 'true');
        }, 1000);
      }
    }
  }, [user, userProfile]);

  const loadWallets = async () => {
    if (!user) return;

    try {
      const walletsRef = doc(db, 'users', user.uid, 'wallets', 'balances');
      const walletsSnap = await getDoc(walletsRef);

      if (walletsSnap.exists()) {
        const data = walletsSnap.data();
        setWallets({
          bank: data.bank || { balance: 0, lastUpdated: new Date() },
          creditCard: data.creditCard || { balance: 0, lastUpdated: new Date() },
          cash: data.cash || { balance: 0, lastUpdated: new Date() },
        });
      }
    } catch (error) {
      console.error('Error loading wallets:', error);
      toast.error('Failed to load wallet balances');
    }
  };

  if (!user || !wallets) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      
      <div className="container py-6 space-y-6">
        <WalletCards wallets={wallets} onUpdate={loadWallets} />
        
        <ExpenseChart />
        
        <ExpenseList onExpenseChange={loadWallets} />
        
        <NotesSection />
      </div>

      <AddExpenseButton onExpenseAdded={loadWallets} />
    </div>
  );
}
