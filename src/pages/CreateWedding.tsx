import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Wedding } from '@/types';
import { Heart, Sparkles, LogIn, Plus, Users } from 'lucide-react';

interface CreateWeddingProps {
  onCreate: (name: string, date?: string, budget?: number) => Promise<unknown>;
  onJoin: (spaceId: string) => Promise<Wedding>;
}

export function CreateWeddingPage({ onCreate, onJoin }: CreateWeddingProps) {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [budget, setBudget] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Give your wedding a name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onCreate(name.trim(), date || undefined, budget ? parseFloat(budget) : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wedding space');
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId.trim()) {
      setError('Paste the Space ID you received');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onJoin(spaceId.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join wedding space');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blush-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blush-200 rounded-full mb-6">
            <Heart size={36} className="text-blush-500" />
          </div>
          <h1 className="text-3xl font-bold text-warm-700 mb-2">
            Welcome to Shaadi Flow
          </h1>
          <p className="text-warm-400">
            Create a new wedding space or join an existing one
          </p>
        </div>

        <div className="flex gap-1 bg-white rounded-pill p-1 shadow-card mb-6">
          <button
            onClick={() => { setTab('create'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-pill text-sm font-semibold transition-all cursor-pointer ${
              tab === 'create'
                ? 'bg-blush-300 text-warm-700'
                : 'text-warm-400 hover:text-warm-600'
            }`}
          >
            <Plus size={16} />
            Create New
          </button>
          <button
            onClick={() => { setTab('join'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-pill text-sm font-semibold transition-all cursor-pointer ${
              tab === 'join'
                ? 'bg-mint-200 text-warm-700'
                : 'text-warm-400 hover:text-warm-600'
            }`}
          >
            <Users size={16} />
            Join Existing
          </button>
        </div>

        {tab === 'create' ? (
          <Card>
            <form onSubmit={handleCreate} className="space-y-5">
              <Input
                label="Wedding Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Priya & Rahul's Wedding"
              />
              <Input
                label="Wedding Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <Input
                label="Total Budget (optional)"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g., 500000"
              />

              {error && (
                <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-sm">{error}</p>
              )}

              <Button type="submit" size="lg" className="w-full" loading={loading} icon={<Sparkles size={18} />}>
                Let's Plan This Wedding!
              </Button>

              <p className="text-xs text-warm-300 text-center">
                You'll be the admin. Invite others from Team & Settings later.
              </p>
            </form>
          </Card>
        ) : (
          <Card>
            <form onSubmit={handleJoin} className="space-y-5">
              <div className="text-center mb-2">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-mint-100 rounded-full mb-3">
                  <LogIn size={24} className="text-mint-500" />
                </div>
                <h2 className="text-lg font-bold text-warm-700">
                  Join a Wedding Space
                </h2>
                <p className="text-sm text-warm-400 mt-1">
                  Ask the wedding organizer for their Space ID
                  <br />
                  (found in Team & Settings)
                </p>
              </div>

              <Input
                label="Space ID *"
                value={spaceId}
                onChange={(e) => setSpaceId(e.target.value)}
                placeholder="e.g., a0814730-da22-4297-9982-32e10ea8d821"
              />

              {error && (
                <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-sm">{error}</p>
              )}

              <Button type="submit" size="lg" variant="secondary" className="w-full" loading={loading} icon={<LogIn size={18} />}>
                Join Space
              </Button>

              <p className="text-xs text-warm-300 text-center">
                You'll join as a Viewer. The owner can upgrade your access.
              </p>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
