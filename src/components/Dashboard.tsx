import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Wallets } from '@/types/expense';
import { WalletCards } from '@/components/wallet/WalletCards';
import { ExpenseChart } from '@/components/expenses/ExpenseChart';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { NotesSection } from '@/components/notes/NotesSection';
import { RefundsSection } from '@/components/refunds/RefundsSection';
import { AdvancesSection } from '@/components/advances/AdvancesSection';
import { AddExpenseButton } from '@/components/expenses/AddExpenseButton';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { NotificationPrompt } from '@/components/notifications/NotificationPrompt';
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
      // Load banks
      const banksQuery = query(collection(db, 'users', user.uid, 'banks'));
      const banksSnap = await getDocs(banksQuery);
      const banks = banksSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastUpdated: doc.data().lastUpdated?.toDate() || new Date(),
      }));

      // Load credit cards
      const cardsQuery = query(collection(db, 'users', user.uid, 'creditCards'));
      const cardsSnap = await getDocs(cardsQuery);
      const creditCards = cardsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastUpdated: doc.data().lastUpdated?.toDate() || new Date(),
      }));

      // Load cash
      const cashRef = doc(db, 'users', user.uid, 'wallets', 'cash');
      const cashSnap = await getDoc(cashRef);
      const cash = cashSnap.exists()
        ? { balance: cashSnap.data().balance || 0, lastUpdated: cashSnap.data().lastUpdated?.toDate() || new Date() }
        : { balance: 0, lastUpdated: new Date() };

      setWallets({
        banks,
        creditCards,
        cash,
      });
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
    <div className="min-h-screen bg-background pb-24 scroll-smooth">
      <Header />
      
      {/* Push Notification Permission Prompt */}
      <NotificationPrompt showOnMount={true} delay={5000} />
      
      <div className="container py-6 space-y-6">
        <div className="animate-fade-in">
          <WalletCards wallets={wallets} onUpdate={loadWallets} />
        </div>
        
        <div className="animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0, animation: 'fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s forwards' }}>
          <ExpenseChart />
        </div>
        
        <div className="animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0, animation: 'fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards' }}>
          <ExpenseList onExpenseChange={loadWallets} />
        </div>
        
        <div className="animate-fade-in" style={{ animationDelay: '0.3s', opacity: 0, animation: 'fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.3s forwards' }}>
          <RefundsSection />
        </div>
        
        <div className="animate-fade-in" style={{ animationDelay: '0.4s', opacity: 0, animation: 'fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.4s forwards' }}>
          <AdvancesSection />
        </div>
        
        <div className="animate-fade-in" style={{ animationDelay: '0.5s', opacity: 0, animation: 'fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.5s forwards' }}>
          <NotesSection />
        </div>
      </div>

      <Footer />

      <AddExpenseButton onExpenseAdded={loadWallets} />
    </div>
  );
}
