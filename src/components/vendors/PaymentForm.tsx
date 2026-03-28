import { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import type { VendorPayment } from '@/types';
import { Image as ImageIcon, X } from 'lucide-react';

interface PaymentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<VendorPayment>, receiptFile?: File) => void;
  loading?: boolean;
  vendorName: string;
}

export function PaymentForm({ open, onClose, onSubmit, loading, vendorName }: PaymentFormProps) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('advance');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Screenshot must be under 10MB');
      return;
    }
    setReceipt(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError('');
  };

  const clearReceipt = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setReceipt(null);
    setPreviewUrl(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return; }

    onSubmit({
      amount: parseFloat(amount),
      type: type as VendorPayment['type'],
      payment_date: date,
      notes: notes.trim() || null,
    }, receipt ?? undefined);

    setAmount('');
    setType('advance');
    setDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    clearReceipt();
    setError('');
  };

  return (
    <Modal open={open} onClose={onClose} title={`Add Payment - ${vendorName}`} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Amount *"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g., 10000"
        />
        <Select
          label="Payment Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={[
            { value: 'advance', label: 'Advance' },
            { value: 'installment', label: 'Installment' },
            { value: 'final', label: 'Final Payment' },
            { value: 'other', label: 'Other' },
          ]}
        />
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Paid via UPI"
        />

        <div>
          <p className="text-sm font-semibold text-warm-600 pl-1 mb-1.5">Payment Screenshot</p>
          {receipt && previewUrl ? (
            <div className="relative rounded-sm overflow-hidden border border-blush-200">
              <img src={previewUrl} alt="Receipt" className="max-h-40 w-full object-contain bg-blush-50" />
              <button
                type="button"
                onClick={clearReceipt}
                className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white text-warm-500 hover:text-red-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-blush-200 rounded-card p-4 text-center cursor-pointer hover:bg-blush-50 transition-colors"
            >
              <ImageIcon size={20} className="mx-auto text-blush-300 mb-1" />
              <p className="text-xs text-warm-400">Attach payment screenshot (optional)</p>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-sm">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add Payment</Button>
        </div>
      </form>
    </Modal>
  );
}
