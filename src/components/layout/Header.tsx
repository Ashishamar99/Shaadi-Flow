import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { LogOut } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  weddingName?: string;
}

export function Header({ weddingName }: HeaderProps) {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = user?.user_metadata?.full_name || user?.email || 'User';
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <header className="h-16 bg-white border-b border-blush-100 flex items-center justify-between px-6 shrink-0">
      <div>
        {weddingName && (
          <h1 className="text-lg font-bold text-warm-700">{weddingName}</h1>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-3 hover:bg-blush-50 rounded-pill px-3 py-1.5 transition-colors cursor-pointer"
        >
          <span className="text-sm font-medium text-warm-500 hidden sm:block">
            {displayName}
          </span>
          <Avatar src={avatarUrl} name={displayName} size="sm" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-12 z-50 bg-white rounded-card shadow-lifted border border-blush-100 py-2 w-48">
              <div className="px-4 py-2 border-b border-blush-50">
                <p className="text-sm font-semibold text-warm-700 truncate">
                  {displayName}
                </p>
                <p className="text-xs text-warm-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
