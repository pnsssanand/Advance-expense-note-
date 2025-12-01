import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthPage } from '@/components/auth/AuthPage';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user } = useAuth();

  if (!user) {
    return <AuthPage />;
  }

  return <>{children}</>;
}
