import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Heart, Sparkles } from 'lucide-react';

interface CreateWeddingProps {
  onCreate: (name: string, date?: string, budget?: number) => Promise<unknown>;
}

export function CreateWeddingPage({ onCreate }: CreateWeddingProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Give your wedding a name');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onCreate(
        name.trim(),
        date || undefined,
        budget ? parseFloat(budget) : undefined,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wedding space');
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
            Create Your Wedding Space
          </h1>
          <p className="text-warm-400">
            Set up your wedding workspace and start planning
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
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
              <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-sm">
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={loading}
              icon={<Sparkles size={18} />}
            >
              Let's Plan This Wedding!
            </Button>

            <p className="text-xs text-warm-300 text-center">
              You'll be the admin of this space. You can invite others later.
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
