import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Wedding } from '@/types';

export function useWedding(userId: string | undefined) {
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWedding = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Check weddings the user owns
    const { data: owned } = await supabase
      .from('weddings')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (owned) {
      setWedding(owned);
      setLoading(false);
      return;
    }

    // Check weddings the user is a member of
    const { data: membership } = await supabase
      .from('wedding_members')
      .select('wedding_id')
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
        setLoading(false);
        return;
      }
    }

    // No wedding found -- user needs to create one
    setWedding(null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchWedding();
  }, [fetchWedding]);

  const createWedding = async (name: string, weddingDate?: string, totalBudget?: number) => {
    if (!userId) return null;

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

    // Auto-add the creator as admin member
    if (data) {
      await supabase.from('wedding_members').insert({
        wedding_id: data.id,
        user_id: userId,
        role: 'admin',
      });
      setWedding(data);
    }

    return data as Wedding;
  };

  const joinWedding = async (spaceId: string) => {
    if (!userId) throw new Error('Not signed in');

    // Verify the space exists
    const { data: targetWedding, error: fetchErr } = await supabase
      .from('weddings')
      .select('*')
      .eq('id', spaceId.trim())
      .maybeSingle();

    if (fetchErr || !targetWedding) {
      throw new Error('Wedding space not found. Double-check the Space ID.');
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('wedding_members')
      .select('id')
      .eq('wedding_id', spaceId.trim())
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Already a member -- just load the wedding
      setWedding(targetWedding);
      return targetWedding as Wedding;
    }

    // Also check if user is the owner
    if (targetWedding.user_id === userId) {
      setWedding(targetWedding);
      return targetWedding as Wedding;
    }

    // Join as viewer by default
    const { error: joinErr } = await supabase
      .from('wedding_members')
      .insert({
        wedding_id: spaceId.trim(),
        user_id: userId,
        role: 'viewer',
      });

    if (joinErr) throw joinErr;

    setWedding(targetWedding);
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

  return { wedding, loading, createWedding, joinWedding, updateWedding, refetch: fetchWedding };
}
