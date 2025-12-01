import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthPage } from '@/components/auth/AuthPage';
import { WelcomeAnimation } from '@/components/auth/WelcomeAnimation';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  useEffect(() => {
    // Show welcome animation when user just logged in
    if (user && !hasShownWelcome) {
      setShowWelcome(true);
      setHasShownWelcome(true);
    }
  }, [user, hasShownWelcome]);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
  };

  if (!user) {
    return <AuthPage />;
  }

  if (showWelcome) {
    return (
      <WelcomeAnimation
        userName={user.displayName || 'User'}
        userPhoto={user.photoURL}
        onComplete={handleWelcomeComplete}
      />
    );
  }

  return <>{children}</>;
}
