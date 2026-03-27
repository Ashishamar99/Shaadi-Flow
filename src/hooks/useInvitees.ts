import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { parseMapsLink, geocodeAddress } from '@/lib/parse-maps-link';
import type { Invitee } from '@/types';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export function useInvitees(weddingId: string | undefined, userId?: string, userName?: string) {
  const queryClient = useQueryClient();
  const queryKey = ['invitees', weddingId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!weddingId) return [];
      const { data, error } = await supabase
        .from('invitees')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invitee[];
    },
    enabled: !!weddingId,
  });

  const addInvitee = useMutation({
    mutationFn: async (invitee: Partial<Invitee>) => {
      let { lat, lng } = invitee;

      if (!lat || !lng) {
        if (invitee.map_link) {
          const parsed = parseMapsLink(invitee.map_link);
          if (parsed) {
            lat = parsed.lat;
            lng = parsed.lng;
          }
        }
        if ((!lat || !lng) && invitee.address && MAPBOX_TOKEN) {
          const geocoded = await geocodeAddress(invitee.address, MAPBOX_TOKEN);
          if (geocoded) {
            lat = geocoded.lat;
            lng = geocoded.lng;
          }
        }
      }

      const { data, error } = await supabase
        .from('invitees')
        .insert({ ...invitee, lat, lng, wedding_id: weddingId, created_by: userId, created_by_name: userName })
        .select()
        .single();
      if (error) throw error;
      return data as Invitee;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateInvitee = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Invitee> & { id: string }) => {
      if (updates.map_link && (!updates.lat || !updates.lng)) {
        const parsed = parseMapsLink(updates.map_link);
        if (parsed) {
          updates.lat = parsed.lat;
          updates.lng = parsed.lng;
        }
      }
      if (updates.address && (!updates.lat || !updates.lng) && MAPBOX_TOKEN) {
        const geocoded = await geocodeAddress(updates.address, MAPBOX_TOKEN);
        if (geocoded) {
          updates.lat = geocoded.lat;
          updates.lng = geocoded.lng;
        }
      }

      const { data, error } = await supabase
        .from('invitees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Invitee;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteInvitee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invitees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const addFamily = useMutation({
    mutationFn: async ({
      head,
      memberNames,
      extraCount,
    }: {
      head: Partial<Invitee>;
      memberNames: string[];
      extraCount: number;
    }) => {
      const familyId = crypto.randomUUID();

      let lat = head.lat;
      let lng = head.lng;
      if (!lat || !lng) {
        if (head.map_link) {
          const parsed = parseMapsLink(head.map_link);
          if (parsed) { lat = parsed.lat; lng = parsed.lng; }
        }
        if ((!lat || !lng) && head.address && MAPBOX_TOKEN) {
          const geocoded = await geocodeAddress(head.address, MAPBOX_TOKEN);
          if (geocoded) { lat = geocoded.lat; lng = geocoded.lng; }
        }
      }

      const rows: Partial<Invitee>[] = [
        {
          ...head,
          lat,
          lng,
          wedding_id: weddingId,
          family_id: familyId,
          is_family_head: true,
          extra_members: extraCount,
          created_by: userId,
          created_by_name: userName,
        },
        ...memberNames.filter(Boolean).map((name) => ({
          name: name.trim(),
          wedding_id: weddingId,
          family_id: familyId,
          is_family_head: false,
          extra_members: 0,
          created_by: userId,
          created_by_name: userName,
          address: head.address,
          map_link: head.map_link,
          lat,
          lng,
          side: head.side,
          priority: head.priority,
          rsvp_status: head.rsvp_status ?? ('not_invited' as const),
          tags: head.tags ?? [],
          visited: false,
        })),
      ];

      const { error } = await supabase.from('invitees').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteFamily = useMutation({
    mutationFn: async (familyId: string) => {
      const { error } = await supabase
        .from('invitees')
        .delete()
        .eq('family_id', familyId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const bulkInsert = useMutation({
    mutationFn: async (invitees: Partial<Invitee>[]) => {
      const withLocations = await Promise.all(
        invitees.map(async (inv) => {
          let lat = inv.lat;
          let lng = inv.lng;
          if (!lat || !lng) {
            if (inv.map_link) {
              const parsed = parseMapsLink(inv.map_link);
              if (parsed) { lat = parsed.lat; lng = parsed.lng; }
            }
            if ((!lat || !lng) && inv.address && MAPBOX_TOKEN) {
              const geocoded = await geocodeAddress(inv.address, MAPBOX_TOKEN);
              if (geocoded) { lat = geocoded.lat; lng = geocoded.lng; }
            }
          }
          return { ...inv, lat, lng, wedding_id: weddingId };
        }),
      );

      const { error } = await supabase
        .from('invitees')
        .insert(withLocations);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    invitees: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    addInvitee,
    updateInvitee,
    deleteInvitee,
    addFamily,
    deleteFamily,
    bulkInsert,
  };
}
