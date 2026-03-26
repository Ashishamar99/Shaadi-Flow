import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/hooks/useAuth';
import { useWedding } from '@/hooks/useWedding';
import { CreateWeddingPage } from '@/pages/CreateWedding';
import { ViewerPage } from '@/pages/ViewerPage';
import { useState } from 'react';

export function AppShell() {
  const { user } = useAuth();
  const { wedding, loading, role, canEdit, createWedding, joinWedding, updateWedding } =
    useWedding(user?.id, user);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

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

  if (role === 'viewer') {
    return <ViewerPage wedding={wedding} />;
  }

  if (previewMode) {
    return (
      <ViewerPage
        wedding={wedding}
        isPreview
        onExitPreview={() => setPreviewMode(false)}
      />
    );
  }

  return (
    <div className="flex h-screen bg-blush-50 overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 z-50 lg:static lg:z-auto
          transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <Header
          weddingName={wedding.name}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          onPreviewAsViewer={() => setPreviewMode(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet context={{ wedding, user, updateWedding, role, canEdit, canDelete: role === 'owner' || role === 'admin' }} />
        </main>
      </div>
    </div>
  );
}
