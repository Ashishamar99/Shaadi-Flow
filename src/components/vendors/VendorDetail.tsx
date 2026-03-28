import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useVendorPayments, useVendorAttachments } from '@/hooks/useVendors';
import { PaymentForm } from './PaymentForm';
import { FileUpload } from './FileUpload';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import type { Vendor } from '@/types';
import {
  Plus,
  Phone,
  Mail,
  User,
  Trash2,
  CreditCard,
  Paperclip,
  Image as ImageIcon,
} from 'lucide-react';

const paymentTypeBadge: Record<string, { variant: 'blush' | 'mint' | 'amber' | 'warm'; label: string }> = {
  advance: { variant: 'blush', label: 'Advance' },
  installment: { variant: 'warm', label: 'Installment' },
  final: { variant: 'mint', label: 'Final' },
  other: { variant: 'amber', label: 'Other' },
};

interface VendorDetailProps {
  open: boolean;
  onClose: () => void;
  vendor: Vendor;
  weddingId: string;
}

export function VendorDetail({ open, onClose, vendor, weddingId }: VendorDetailProps) {
  const { payments, addPayment, deletePayment } = useVendorPayments(vendor.id);
  const { attachments, uploadFile, deleteFile, getSignedUrl } = useVendorAttachments(vendor.id, weddingId);
  const [activeTab, setActiveTab] = useState('payments');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const paidPercent = vendor.cost > 0 ? Math.min(100, (vendor.paid_amount / vendor.cost) * 100) : 0;

  return (
    <Modal open={open} onClose={onClose} title={vendor.name} size="xl">
      <div className="space-y-6">
        {/* Vendor Info Header */}
        <div className="flex flex-wrap gap-4 items-start justify-between">
          <div className="space-y-1">
            <Badge variant={vendor.payment_status === 'paid' ? 'mint' : vendor.payment_status === 'partial' ? 'amber' : 'warm'}>
              {vendor.payment_status === 'paid' ? 'Fully Paid' : vendor.payment_status === 'partial' ? 'Partially Paid' : 'Pending'}
            </Badge>
            <div className="flex flex-wrap gap-4 text-sm text-warm-500 mt-2">
              {vendor.contact_name && (
                <span className="flex items-center gap-1">
                  <User size={14} /> {vendor.contact_name}
                </span>
              )}
              {vendor.phone && (
                <a href={`tel:${vendor.phone}`} className="flex items-center gap-1 hover:text-blush-500">
                  <Phone size={14} /> {vendor.phone}
                </a>
              )}
              {vendor.email && (
                <a href={`mailto:${vendor.email}`} className="flex items-center gap-1 hover:text-blush-500">
                  <Mail size={14} /> {vendor.email}
                </a>
              )}
            </div>
            {vendor.notes && (
              <p className="text-xs text-warm-400 mt-1">{vendor.notes}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-warm-400">Total Cost</p>
            <p className="text-xl font-bold text-warm-700">
              {vendor.cost > 0 ? `₹${vendor.cost.toLocaleString('en-IN')}` : 'Not set'}
            </p>
          </div>
        </div>

        {/* Payment Progress */}
        {vendor.cost > 0 && (
          <div>
            <div className="flex justify-between text-xs text-warm-400 mb-1">
              <span>Paid: ₹{vendor.paid_amount.toLocaleString('en-IN')}</span>
              <span>Remaining: ₹{Math.max(0, vendor.cost - vendor.paid_amount).toLocaleString('en-IN')}</span>
            </div>
            <div className="h-2 bg-blush-100 rounded-pill overflow-hidden">
              <div
                className={`h-full rounded-pill transition-all ${paidPercent >= 100 ? 'bg-mint-400' : 'bg-blush-400'}`}
                style={{ width: `${paidPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: 'payments', label: 'Payments', icon: <CreditCard size={14} /> },
            { id: 'files', label: `Files (${attachments.length})`, icon: <Paperclip size={14} /> },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'payments' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold text-warm-600">
                {payments.length} payment{payments.length !== 1 ? 's' : ''}
              </p>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowPaymentForm(true)}>
                Add Payment
              </Button>
            </div>

            {payments.length === 0 ? (
              <p className="text-center text-sm text-warm-300 py-6">No payments recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {payments.map((p) => {
                  const config = paymentTypeBadge[p.type] ?? paymentTypeBadge.other;
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-sm bg-blush-50 group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-warm-700">
                            ₹{p.amount.toLocaleString('en-IN')}
                          </p>
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-warm-400 mt-0.5">
                          <span>{new Date(p.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          {p.notes && <span className="truncate">{p.notes}</span>}
                          {p.receipt_path && (
                            <button
                              type="button"
                              onClick={async () => {
                                const { data } = await supabase.storage.from('vendor-files').createSignedUrl(p.receipt_path!, 3600);
                                if (data) window.open(data.signedUrl, '_blank');
                              }}
                              className="flex items-center gap-1 text-blush-500 hover:text-blush-600 cursor-pointer"
                            >
                              <ImageIcon size={11} /> Receipt
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deletePayment.mutate(p.id)}
                        className="p-1.5 rounded-full hover:bg-red-50 text-warm-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <FileUpload
            attachments={attachments}
            onUpload={(file) => uploadFile.mutate(file)}
            onDelete={(att) => deleteFile.mutate(att)}
            getSignedUrl={getSignedUrl}
            uploading={uploadFile.isPending}
          />
        )}
      </div>

      <PaymentForm
        open={showPaymentForm}
        onClose={() => setShowPaymentForm(false)}
        onSubmit={async (data, receiptFile) => {
          let receiptPath: string | null = null;
          if (receiptFile) {
            const path = `${weddingId}/${vendor.id}/receipts/${Date.now()}_${receiptFile.name}`;
            const { error: uploadErr } = await supabase.storage.from('vendor-files').upload(path, receiptFile);
            if (!uploadErr) receiptPath = path;
          }
          addPayment.mutate(
            { ...data, receipt_path: receiptPath },
            { onSuccess: () => setShowPaymentForm(false) },
          );
        }}
        loading={addPayment.isPending}
        vendorName={vendor.name}
      />
    </Modal>
  );
}
