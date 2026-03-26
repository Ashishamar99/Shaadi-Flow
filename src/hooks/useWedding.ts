import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Wedding } from '@/types';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

function getUserProfile(user: User) {
  return {
    display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatar_url: user.user_metadata?.avatar_url || null,
  };
}

export function useWedding(userId: string | undefined, user?: User | null) {
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>('viewer');

  const fetchWedding = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: owned } = await supabase
      .from('weddings')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (owned) {
      setWedding(owned);
      setRole('owner');
      setLoading(false);
      return;
    }

    const { data: membership } = await supabase
      .from('wedding_members')
      .select('wedding_id, role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (membership) {
      const { data: memberWedding } = await supabase
        .from('weddings')
        .select('*')
        .eq('id', membership.wedding_id)
        .single();

      if (memberWedding) {
        setWedding(memberWedding);
        setRole(membership.role as UserRole);
        setLoading(false);
        return;
      }
    }

    setWedding(null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchWedding();
  }, [fetchWedding]);

  const createWedding = async (name: string, weddingDate?: string, totalBudget?: number) => {
    if (!userId || !user) return null;

    const { data, error } = await supabase
      .from('weddings')
      .insert({
        user_id: userId,
        name,
        wedding_date: weddingDate || null,
        total_budget: totalBudget || 0,
      })
      .select()
      .single();

    if (error) throw error;

    if (data) {
      const profile = getUserProfile(user);
      await supabase.from('wedding_members').insert({
        wedding_id: data.id,
        user_id: userId,
        role: 'admin',
        ...profile,
      });
      setWedding(data);
      setRole('owner');
    }

    return data as Wedding;
  };

  const joinWedding = async (spaceId: string) => {
    if (!userId || !user) throw new Error('Not signed in');

    const { data: targetWedding, error: fetchErr } = await supabase
      .from('weddings')
      .select('*')
      .eq('id', spaceId.trim())
      .maybeSingle();

    if (fetchErr || !targetWedding) {
      throw new Error('Wedding space not found. Double-check the Space ID.');
    }

    if (targetWedding.user_id === userId) {
      setWedding(targetWedding);
      setRole('owner');
      return targetWedding as Wedding;
    }

    const { data: existing } = await supabase
      .from('wedding_members')
      .select('id, role')
      .eq('wedding_id', spaceId.trim())
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      setWedding(targetWedding);
      setRole(existing.role as UserRole);
      return targetWedding as Wedding;
    }

    const profile = getUserProfile(user);
    const { error: joinErr } = await supabase
      .from('wedding_members')
      .insert({
        wedding_id: spaceId.trim(),
        user_id: userId,
        role: 'viewer',
        ...profile,
      });

    if (joinErr) throw joinErr;

    setWedding(targetWedding);
    setRole('viewer');
    return targetWedding as Wedding;
  };

  const updateWedding = async (updates: Partial<Wedding>) => {
    if (!wedding) return;
    const { data, error } = await supabase
      .from('weddings')
      .update(updates)
      .eq('id', wedding.id)
      .select()
      .single();
    if (!error && data) setWedding(data);
  };

  const canEdit = role === 'owner' || role === 'admin' || role === 'editor';

  return { wedding, loading, role, canEdit, createWedding, joinWedding, updateWedding, refetch: fetchWedding };
}
