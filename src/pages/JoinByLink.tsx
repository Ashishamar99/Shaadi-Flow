import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Heart, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { User } from '@supabase/supabase-js';

function getUserProfile(user: User) {
  return {
    display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatar_url: user.user_metadata?.avatar_url || null,
  };
}

export function JoinByLinkPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'joining' | 'success' | 'error' | 'already'>('joining');
  const [weddingName, setWeddingName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!user || !spaceId) return;

    async function autoJoin() {
      const { data: wedding } = await supabase
        .from('weddings')
        .select('id, name, user_id')
        .eq('id', spaceId)
        .maybeSingle();

      if (!wedding) {
        setErrorMsg('Wedding space not found. The link may be invalid.');
        setStatus('error');
        return;
      }

      setWeddingName(wedding.name);

      if (wedding.user_id === user!.id) {
        setStatus('already');
        return;
      }

      const { data: existing } = await supabase
        .from('wedding_members')
        .select('id')
        .eq('wedding_id', spaceId)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (existing) {
        setStatus('already');
        return;
      }

      const profile = getUserProfile(user!);
      const { error } = await supabase.from('wedding_members').insert({
        wedding_id: spaceId,
        user_id: user!.id,
        role: 'viewer',
        ...profile,
      });

      if (error) {
        setErrorMsg(error.message);
        setStatus('error');
        return;
      }

      setStatus('success');
    }

    autoJoin();
  }, [user, spaceId]);

  return (
    <div className="min-h-screen bg-blush-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blush-200 rounded-full mb-6">
          <Heart size={28} className="text-blush-500" />
        </div>

        {status === 'joining' && (
          <Card>
            <div className="py-8">
              <div className="w-10 h-10 border-3 border-blush-200 border-t-blush-400 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-warm-500 font-medium">Joining wedding space...</p>
            </div>
          </Card>
        )}

        {status === 'success' && (
          <Card>
            <div className="py-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-mint-100 rounded-full mb-4">
                <Check size={28} className="text-mint-500" />
              </div>
              <h2 className="text-xl font-bold text-warm-700 mb-2">You're in!</h2>
              <p className="text-sm text-warm-400 mb-6">
                You've joined <strong>{weddingName}</strong> as a viewer.
              </p>
              <Button onClick={() => navigate('/')} size="lg">
                Go to Wedding Space
              </Button>
            </div>
          </Card>
        )}

        {status === 'already' && (
          <Card>
            <div className="py-6">
              <h2 className="text-xl font-bold text-warm-700 mb-2">
                Already a member!
              </h2>
              <p className="text-sm text-warm-400 mb-6">
                You're already part of <strong>{weddingName}</strong>.
              </p>
              <Button onClick={() => navigate('/')} size="lg">
                Open Wedding Space
              </Button>
            </div>
          </Card>
        )}

        {status === 'error' && (
          <Card>
            <div className="py-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 rounded-full mb-4">
                <AlertCircle size={28} className="text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-warm-700 mb-2">
                Couldn't Join
              </h2>
              <p className="text-sm text-warm-400 mb-6">{errorMsg}</p>
              <Button variant="ghost" onClick={() => navigate('/')}>
                Go to Home
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
