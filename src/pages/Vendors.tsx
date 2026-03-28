import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useVendors, VENDOR_CATEGORIES } from '@/hooks/useVendors';
import { useUndoDelete } from '@/hooks/useUndoDelete';
import { VendorForm } from '@/components/vendors/VendorForm';
import { VendorDetail } from '@/components/vendors/VendorDetail';
import { UndoToast } from '@/components/ui/UndoToast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { exportToCSV } from '@/lib/export';
import type { Wedding, Vendor } from '@/types';
import type { User } from '@supabase/supabase-js';
import {
  Plus,
  Search,
  Store,
  Edit3,
  Trash2,
  Eye,
  FileDown,
  IndianRupee,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  paid: 'bg-mint-100 text-mint-600',
  partial: 'bg-amber-50 text-amber-600',
  pending: 'bg-warm-100 text-warm-500',
};

export function VendorsPage() {
  const { wedding, canDelete } = useOutletContext<{
    wedding: Wedding | null;
    user: User | null;
    canDelete: boolean;
  }>();
  const { vendors, isLoading, addVendor, updateVendor, deleteVendor } = useVendors(wedding?.id);
  const { pending: undoPending, scheduleDelete, undo, dismiss, undoWindowMs, hiddenKeys } = useUndoDelete();

  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [detailVendor, setDetailVendor] = useState<Vendor | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const visibleVendors = useMemo(
    () => vendors.filter((v) => !hiddenKeys.has(`vendor:${v.id}`)),
    [vendors, hiddenKeys],
  );

  const filtered = useMemo(() => {
    let result = visibleVendors;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.contact_name?.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q),
      );
    }
    if (filterCategory) result = result.filter((v) => v.category === filterCategory);
    if (filterStatus) result = result.filter((v) => v.payment_status === filterStatus);
    return result;
  }, [visibleVendors, search, filterCategory, filterStatus]);

  const summary = useMemo(() => {
    const totalCost = filtered.reduce((s, v) => s + v.cost, 0);
    const totalPaid = filtered.reduce((s, v) => s + v.paid_amount, 0);
    const totalVendors = filtered.length;
    const categories = new Set(filtered.map((v) => v.category)).size;
    return { totalCost, totalPaid, totalVendors, categories };
  }, [filtered]);

  const handleAdd = (data: Partial<Vendor>, files?: File[]) => {
    addVendor.mutate(data, {
      onSuccess: async (newVendor) => {
        if (files && files.length > 0 && wedding?.id) {
          for (const file of files) {
            const filePath = `${wedding.id}/${newVendor.id}/${Date.now()}_${file.name}`;
            await supabase.storage.from('vendor-files').upload(filePath, file);
            await supabase.from('vendor_attachments').insert({
              vendor_id: newVendor.id,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              file_size: file.size,
            });
          }
        }
        setShowForm(false);
      },
    });
  };

  const handleEdit = (data: Partial<Vendor>, files?: File[]) => {
    if (!editingVendor) return;
    updateVendor.mutate({ id: editingVendor.id, ...data }, {
      onSuccess: async () => {
        if (files && files.length > 0 && wedding?.id) {
          for (const file of files) {
            const filePath = `${wedding.id}/${editingVendor.id}/${Date.now()}_${file.name}`;
            await supabase.storage.from('vendor-files').upload(filePath, file);
            await supabase.from('vendor_attachments').insert({
              vendor_id: editingVendor.id,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              file_size: file.size,
            });
          }
        }
        setEditingVendor(null);
      },
    });
  };

  const handleDelete = (vendor: Vendor) => {
    scheduleDelete(vendor.name, () => deleteVendor.mutate(vendor.id), `vendor:${vendor.id}`);
  };

  const handleExport = () => {
    const data = filtered.map((v) => ({
      Name: v.name,
      Category: v.category,
      Contact: v.contact_name ?? '',
      Phone: v.phone ?? '',
      Email: v.email ?? '',
      'Total Cost': v.cost,
      'Paid Amount': v.paid_amount,
      Status: v.payment_status,
      Notes: v.notes ?? '',
    }));
    exportToCSV(data, 'wedding-vendors');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-blush-200 border-t-blush-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-700">Vendors</h1>
          <p className="text-sm text-warm-400 mt-1">Manage your wedding service providers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={<FileDown size={16} />} onClick={handleExport} disabled={filtered.length === 0}>
            Export
          </Button>
          <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Spend Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <Store size={18} className="text-blush-400" />
            <div>
              <p className="text-lg font-bold text-warm-700">{summary.totalVendors}</p>
              <p className="text-xs text-warm-400">Vendors</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <IndianRupee size={18} className="text-warm-400" />
            <div>
              <p className="text-lg font-bold text-warm-700">
                {summary.totalCost > 0 ? `₹${(summary.totalCost / 1000).toFixed(0)}K` : '₹0'}
              </p>
              <p className="text-xs text-warm-400">Total Cost</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <IndianRupee size={18} className="text-mint-400" />
            <div>
              <p className="text-lg font-bold text-warm-700">
                {summary.totalPaid > 0 ? `₹${(summary.totalPaid / 1000).toFixed(0)}K` : '₹0'}
              </p>
              <p className="text-xs text-warm-400">Paid</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <IndianRupee size={18} className="text-amber-400" />
            <div>
              <p className="text-lg font-bold text-warm-700">
                {summary.totalCost - summary.totalPaid > 0
                  ? `₹${((summary.totalCost - summary.totalPaid) / 1000).toFixed(0)}K`
                  : '₹0'}
              </p>
              <p className="text-xs text-warm-400">Remaining</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input
              icon={<Search size={16} />}
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            options={[
              { value: '', label: 'All Categories' },
              ...VENDOR_CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
          />
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'partial', label: 'Partially Paid' },
              { value: 'paid', label: 'Fully Paid' },
            ]}
          />
        </div>
      </Card>

      {/* Vendor Cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Store size={48} />}
          title={vendors.length === 0 ? 'No vendors yet' : 'No matches'}
          description={vendors.length === 0 ? 'Add your first vendor to start tracking costs and payments.' : 'Try adjusting your filters.'}
          actionLabel={vendors.length === 0 ? 'Add Vendor' : undefined}
          onAction={vendors.length === 0 ? () => setShowForm(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((vendor) => {
            const paidPercent = vendor.cost > 0 ? Math.min(100, (vendor.paid_amount / vendor.cost) * 100) : 0;
            return (
              <Card key={vendor.id} hover className="cursor-pointer" onClick={() => setDetailVendor(vendor)}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-warm-700">{vendor.name}</h3>
                      <Badge variant="blush" className="mt-1">{vendor.category}</Badge>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-pill font-semibold ${statusColors[vendor.payment_status]}`}>
                      {vendor.payment_status === 'paid' ? 'Paid' : vendor.payment_status === 'partial' ? 'Partial' : 'Pending'}
                    </span>
                  </div>

                  {vendor.contact_name && (
                    <p className="text-xs text-warm-400 flex items-center gap-1">
                      {vendor.contact_name}
                      {vendor.phone && <span>· {vendor.phone}</span>}
                    </p>
                  )}

                  {vendor.cost > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-warm-400 mb-1">
                        <span>₹{vendor.paid_amount.toLocaleString('en-IN')}</span>
                        <span>₹{vendor.cost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="h-1.5 bg-blush-100 rounded-pill overflow-hidden">
                        <div
                          className={`h-full rounded-pill transition-all ${paidPercent >= 100 ? 'bg-mint-400' : 'bg-blush-400'}`}
                          style={{ width: `${paidPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 pt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDetailVendor(vendor); }}
                      className="p-1.5 rounded-full hover:bg-blush-100 text-warm-400 hover:text-warm-600 cursor-pointer transition-colors"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingVendor(vendor); }}
                      className="p-1.5 rounded-full hover:bg-blush-100 text-warm-400 hover:text-warm-600 cursor-pointer transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    {canDelete && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(vendor); }}
                        className="p-1.5 rounded-full hover:bg-red-50 text-warm-400 hover:text-red-500 cursor-pointer transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <VendorForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleAdd}
        loading={addVendor.isPending}
      />

      <VendorForm
        open={!!editingVendor}
        onClose={() => setEditingVendor(null)}
        onSubmit={handleEdit}
        initialData={editingVendor}
        loading={updateVendor.isPending}
      />

      {detailVendor && (
        <VendorDetail
          open
          onClose={() => setDetailVendor(null)}
          vendor={detailVendor}
          weddingId={wedding?.id ?? ''}
        />
      )}

      <UndoToast pending={undoPending} onUndo={undo} onDismiss={dismiss} undoWindowMs={undoWindowMs} />
    </div>
  );
}
