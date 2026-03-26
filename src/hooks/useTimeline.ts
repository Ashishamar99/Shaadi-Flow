import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { TimelineEvent } from '@/types';

export function useTimeline(weddingId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['events', weddingId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!weddingId) return [];
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('day_number', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TimelineEvent[];
    },
    enabled: !!weddingId,
  });

  const addEvent = useMutation({
    mutationFn: async (event: Partial<TimelineEvent>) => {
      const { data, error } = await supabase
        .from('events')
        .insert({ ...event, wedding_id: weddingId })
        .select()
        .single();
      if (error) throw error;
      return data as TimelineEvent;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateEvent = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<TimelineEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as TimelineEvent;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const reorderEvents = useMutation({
    mutationFn: async (
      updates: { id: string; sort_order: number; day_number: number }[],
    ) => {
      for (const u of updates) {
        await supabase
          .from('events')
          .update({ sort_order: u.sort_order, day_number: u.day_number })
          .eq('id', u.id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    events: query.data ?? [],
    isLoading: query.isLoading,
    addEvent,
    updateEvent,
    deleteEvent,
    reorderEvents,
  };
}
