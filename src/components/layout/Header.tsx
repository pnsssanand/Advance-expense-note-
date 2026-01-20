import { useState } from 'react';
import { LogOut, Settings, User, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProfileDialog } from '@/components/profile/ProfileDialog';
import { BankDetailsDialog } from '@/components/profile/BankDetailsDialog';

export function Header() {
  const { userProfile, signOut } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between">
          <div>
            <h1 className="text-xl font-heading font-bold">Expense Note</h1>
            {userProfile?.displayName && (
              <p className="text-xs text-muted-foreground">
                Hello, {userProfile.displayName}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative h-10 w-10 rounded-full overflow-hidden ring-2 ring-border hover:ring-primary transition-smooth">
                <Avatar>
                  <AvatarImage src={userProfile?.photoURL} alt={userProfile?.displayName} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-2 p-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userProfile?.photoURL} alt={userProfile?.displayName} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{userProfile?.displayName}</p>
                  <p className="text-xs text-muted-foreground">{userProfile?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowProfile(true)}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowBankDetails(true)}>
                <Building2 className="mr-2 h-4 w-4" />
                Bank Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ProfileDialog open={showProfile} onOpenChange={setShowProfile} />
      <BankDetailsDialog open={showBankDetails} onOpenChange={setShowBankDetails} />
    </>
  );
}
