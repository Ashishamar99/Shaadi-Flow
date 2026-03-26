import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/hooks/useAuth';
import { useWedding } from '@/hooks/useWedding';
import { CreateWeddingPage } from '@/pages/CreateWedding';

export function AppShell() {
  const { user } = useAuth();
  const { wedding, loading, createWedding, joinWedding, updateWedding } = useWedding(user?.id);

  if (loading) {
    return (
      <div className="min-h-screen bg-blush-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blush-200 border-t-blush-400 rounded-full animate-spin" />
          <p className="text-warm-400 font-medium">Setting up your space...</p>
        </div>
      </div>
    );
  }

  if (!wedding) {
    return <CreateWeddingPage onCreate={createWedding} onJoin={joinWedding} />;
  }

  return (
    <div className="flex h-screen bg-blush-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header weddingName={wedding.name} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet context={{ wedding, user, updateWedding }} />
        </main>
      </div>
    </div>
  );
}
