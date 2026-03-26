import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoginPage } from '@/pages/Login';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-blush-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blush-200 border-t-blush-400 rounded-full animate-spin" />
          <p className="text-warm-400 font-medium">Loading Shaadi Flow...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
