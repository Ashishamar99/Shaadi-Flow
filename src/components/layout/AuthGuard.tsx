import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoginPage } from '@/pages/Login';
import { Heart } from 'lucide-react';

function SkeletonScreen() {
  return (
    <div className="min-h-screen bg-blush-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-blush-200 rounded-full flex items-center justify-center animate-pulse">
          <Heart size={28} className="text-blush-400" />
        </div>
        <div className="space-y-2 text-center">
          <div className="h-4 w-32 bg-blush-100 rounded-pill mx-auto animate-pulse" />
          <div className="h-3 w-48 bg-blush-50 rounded-pill mx-auto animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <SkeletonScreen />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
