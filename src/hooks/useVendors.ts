import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Vendor, VendorPayment, VendorAttachment } from '@/types';

export const VENDOR_CATEGORIES = [
  'Caterer',
  'Decorator',
  'Photographer',
  'Videographer',
  'Makeup',
  'Travel',
  'Venue',
  'Music / DJ',
  'Florist',
  'Pandit / Priest',
  'Invitation Cards',
  'Jewellery',
  'Other',
];

export function useVendors(weddingId: string | undefined) {
  const queryClient = useQueryClient();
  const vendorKey = ['vendors', weddingId];

  const vendorsQuery = useQuery({
    queryKey: vendorKey,
    queryFn: async () => {
      if (!weddingId) return [];
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Vendor[];
    },
    enabled: !!weddingId,
  });

  const addVendor = useMutation({
    mutationFn: async (vendor: Partial<Vendor>) => {
      const { data, error } = await supabase
        .from('vendors')
        .insert({ ...vendor, wedding_id: weddingId })
        .select()
        .single();
      if (error) throw error;
      return data as Vendor;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorKey }),
  });

  const updateVendor = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Vendor> & { id: string }) => {
      const { data, error } = await supabase
        .from('vendors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Vendor;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorKey }),
  });

  const deleteVendor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vendors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorKey }),
  });

  return {
    vendors: vendorsQuery.data ?? [],
    isLoading: vendorsQuery.isLoading,
    addVendor,
    updateVendor,
    deleteVendor,
  };
}

export function useVendorPayments(vendorId: string | undefined) {
  const queryClient = useQueryClient();
  const key = ['vendor-payments', vendorId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!vendorId) return [];
      const { data, error } = await supabase
        .from('vendor_payments')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as VendorPayment[];
    },
    enabled: !!vendorId,
  });

  const addPayment = useMutation({
    mutationFn: async (payment: Partial<VendorPayment>) => {
      const { data, error } = await supabase
        .from('vendor_payments')
        .insert({ ...payment, vendor_id: vendorId })
        .select()
        .single();
      if (error) throw error;
      return data as VendorPayment;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: key });
      if (vendorId) {
        const { data: payments } = await supabase
          .from('vendor_payments')
          .select('amount')
          .eq('vendor_id', vendorId);
        if (payments) {
          const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
          const { data: vendor } = await supabase
            .from('vendors')
            .select('cost')
            .eq('id', vendorId)
            .single();
          const cost = vendor?.cost ?? 0;
          const status = totalPaid >= cost && cost > 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';
          await supabase
            .from('vendors')
            .update({ paid_amount: totalPaid, payment_status: status })
            .eq('id', vendorId);
          queryClient.invalidateQueries({ queryKey: ['vendors'] });
        }
      }
    },
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vendor_payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: key });
      if (vendorId) {
        const { data: payments } = await supabase
          .from('vendor_payments')
          .select('amount')
          .eq('vendor_id', vendorId);
        if (payments) {
          const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
          const { data: vendor } = await supabase
            .from('vendors')
            .select('cost')
            .eq('id', vendorId)
            .single();
          const cost = vendor?.cost ?? 0;
          const status = totalPaid >= cost && cost > 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';
          await supabase
            .from('vendors')
            .update({ paid_amount: totalPaid, payment_status: status })
            .eq('id', vendorId);
          queryClient.invalidateQueries({ queryKey: ['vendors'] });
        }
      }
    },
  });

  return {
    payments: query.data ?? [],
    isLoading: query.isLoading,
    addPayment,
    deletePayment,
  };
}

export function useVendorAttachments(vendorId: string | undefined, weddingId: string | undefined) {
  const queryClient = useQueryClient();
  const key = ['vendor-attachments', vendorId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!vendorId) return [];
      const { data, error } = await supabase
        .from('vendor_attachments')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as VendorAttachment[];
    },
    enabled: !!vendorId,
  });

  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      if (!vendorId || !weddingId) throw new Error('Missing IDs');

      const filePath = `${weddingId}/${vendorId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('vendor-files')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data, error: dbError } = await supabase
        .from('vendor_attachments')
        .insert({
          vendor_id: vendorId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();
      if (dbError) throw dbError;
      return data as VendorAttachment;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const deleteFile = useMutation({
    mutationFn: async (attachment: VendorAttachment) => {
      await supabase.storage.from('vendor-files').remove([attachment.file_path]);
      const { error } = await supabase
        .from('vendor_attachments')
        .delete()
        .eq('id', attachment.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const getFileUrl = (filePath: string): string => {
    const { data } = supabase.storage.from('vendor-files').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const getSignedUrl = async (filePath: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('vendor-files')
      .createSignedUrl(filePath, 3600);
    if (error) throw error;
    return data.signedUrl;
  };

  return {
    attachments: query.data ?? [],
    isLoading: query.isLoading,
    uploadFile,
    deleteFile,
    getFileUrl,
    getSignedUrl,
  };
}
