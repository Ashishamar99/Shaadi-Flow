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

  return { wedding, loading, createWedding, updateWedding, refetch: fetchWedding };
}
