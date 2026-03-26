import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Avatar } from '@/components/ui/Avatar';
import { LogOut, Menu, Moon, Sun, Eye } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  weddingName?: string;
  onMenuToggle?: () => void;
  onPreviewAsViewer?: () => void;
}

export function Header({ weddingName, onMenuToggle, onPreviewAsViewer }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { dark, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = user?.user_metadata?.full_name || user?.email || 'User';
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <header className="h-14 md:h-16 bg-white border-b border-blush-100 flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-1.5 rounded-sm text-warm-400 hover:bg-blush-50 lg:hidden cursor-pointer"
        >
          <Menu size={20} />
        </button>
        {weddingName && (
          <h1 className="text-base md:text-lg font-bold text-warm-700 truncate">
            {weddingName}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        {onPreviewAsViewer && (
          <button
            onClick={onPreviewAsViewer}
            className="p-2 rounded-full hover:bg-blush-50 text-warm-400 transition-colors cursor-pointer"
            title="Preview as Viewer"
          >
            <Eye size={18} />
          </button>
        )}

        <button
          onClick={toggle}
          className="p-2 rounded-full hover:bg-blush-50 text-warm-400 transition-colors cursor-pointer"
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 md:gap-3 hover:bg-blush-50 rounded-pill px-2 md:px-3 py-1.5 transition-colors cursor-pointer"
          >
            <span className="text-sm font-medium text-warm-500 hidden sm:block truncate max-w-[120px]">
              {displayName}
            </span>
            <Avatar src={avatarUrl} name={displayName} size="sm" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-12 z-50 bg-white rounded-card shadow-lifted border border-blush-100 py-2 w-48">
                <div className="px-4 py-2 border-b border-blush-50">
                  <p className="text-sm font-semibold text-warm-700 truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-warm-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); signOut(); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
