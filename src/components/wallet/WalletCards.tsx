import { CreditCard, Wallet as WalletIcon, Banknote } from 'lucide-react';
import { Wallets } from '@/types/expense';
import { Card, CardContent } from '@/components/ui/card';

interface WalletCardsProps {
  wallets: Wallets;
  onUpdate: () => void;
}

export function WalletCards({ wallets }: WalletCardsProps) {
  const walletConfigs = [
    {
      key: 'bank',
      label: 'Bank',
      icon: Banknote,
      balance: wallets.bank.balance,
      color: 'bg-wallet-bank',
      textColor: 'text-wallet-bank-foreground',
    },
    {
      key: 'creditCard',
      label: 'Credit Card',
      icon: CreditCard,
      balance: wallets.creditCard.balance,
      color: 'bg-wallet-credit',
      textColor: 'text-wallet-credit-foreground',
    },
    {
      key: 'cash',
      label: 'Cash',
      icon: WalletIcon,
      balance: wallets.cash.balance,
      color: 'bg-wallet-cash',
      textColor: 'text-wallet-cash-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {walletConfigs.map((wallet) => {
        const Icon = wallet.icon;
        return (
          <Card key={wallet.key} className="shadow-card hover:shadow-lg transition-smooth">
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-lg ${wallet.color} mb-2`}>
                <Icon className={`h-5 w-5 ${wallet.textColor}`} />
              </div>
              <p className="text-xs text-muted-foreground mb-1">{wallet.label}</p>
              <p className="text-lg font-heading font-bold">
                ${wallet.balance.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
