import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { VENDOR_CATEGORIES } from '@/hooks/useVendors';
import type { Vendor } from '@/types';
import { Plus, X, Upload, FileText } from 'lucide-react';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ExtraContact {
  name: string;
  phone: string;
}

interface VendorFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Vendor>, files?: File[]) => void;
  initialData?: Vendor | null;
  loading?: boolean;
}

export function VendorForm({ open, onClose, onSubmit, initialData, loading }: VendorFormProps) {
  const [form, setForm] = useState({
    name: '',
    category: '',
    customCategory: '',
    contact_name: '',
    phone: '',
    email: '',
    cost: '',
    notes: '',
  });
  const [extraContacts, setExtraContacts] = useState<ExtraContact[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const isOther = form.category === 'Other';

  useEffect(() => {
    if (initialData) {
      const isCustom = !VENDOR_CATEGORIES.includes(initialData.category);
      setForm({
        name: initialData.name,
        category: isCustom ? 'Other' : initialData.category,
        customCategory: isCustom ? initialData.category : '',
        contact_name: initialData.contact_name ?? '',
        phone: initialData.phone ?? '',
        email: initialData.email ?? '',
        cost: initialData.cost ? String(initialData.cost) : '',
        notes: initialData.notes ?? '',
      });
      setExtraContacts([]);
      setFiles([]);
    } else {
      setForm({ name: '', category: '', customCategory: '', contact_name: '', phone: '', email: '', cost: '', notes: '' });
      setExtraContacts([]);
      setFiles([]);
    }
    setError('');
  }, [initialData, open]);

  const addContact = () => setExtraContacts([...extraContacts, { name: '', phone: '' }]);
  const removeContact = (idx: number) => setExtraContacts(extraContacts.filter((_, i) => i !== idx));
  const updateContact = (idx: number, field: keyof ExtraContact, val: string) => {
    const updated = [...extraContacts];
    updated[idx] = { ...updated[idx], [field]: val };
    setExtraContacts(updated);
  };

  const handleFileAdd = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (f.size > MAX_FILE_SIZE) {
        setError(`"${f.name}" exceeds 50MB limit`);
        return;
      }
      newFiles.push(f);
    }
    setFiles((prev) => [...prev, ...newFiles]);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Vendor name is required'); return; }
    if (!form.category) { setError('Category is required'); return; }
    if (isOther && !form.customCategory.trim()) { setError('Enter a custom category'); return; }

    const allContacts = [
      form.contact_name.trim(),
      ...extraContacts.map((c) => c.name.trim()).filter(Boolean),
    ].filter(Boolean).join(', ');

    const allPhones = [
      form.phone.trim(),
      ...extraContacts.map((c) => c.phone.trim()).filter(Boolean),
    ].filter(Boolean).join(', ');

    onSubmit({
      name: form.name.trim(),
      category: isOther ? form.customCategory.trim() : form.category,
      contact_name: allContacts || null,
      phone: allPhones || null,
      email: form.email.trim() || null,
      cost: form.cost ? parseFloat(form.cost) : 0,
      notes: form.notes.trim() || null,
    }, files.length > 0 ? files : undefined);
  };

  return (
    <Modal open={open} onClose={onClose} title={initialData ? 'Edit Vendor' : 'Add Vendor'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Vendor Name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g., Raj Caterers"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Category *"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={VENDOR_CATEGORIES.map((c) => ({ value: c, label: c }))}
            placeholder="Select category"
          />
          {isOther && (
            <Input
              label="Custom Category *"
              value={form.customCategory}
              onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
              placeholder="e.g., Mehndi Artist"
            />
          )}
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Person"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              placeholder="Primary contact name"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 ..."
            />
          </div>

          {extraContacts.map((contact, idx) => (
            <div key={idx} className="flex items-end gap-2">
              <div className="grid grid-cols-2 gap-3 flex-1">
                <Input
                  value={contact.name}
                  onChange={(e) => updateContact(idx, 'name', e.target.value)}
                  placeholder={`Contact ${idx + 2} name`}
                />
                <Input
                  value={contact.phone}
                  onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                  placeholder="Phone"
                />
              </div>
              <button
                type="button"
                onClick={() => removeContact(idx)}
                className="p-2 mb-0.5 rounded-full hover:bg-red-50 text-warm-400 hover:text-red-500 cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          ))}

          <Button type="button" variant="ghost" size="sm" icon={<Plus size={14} />} onClick={addContact}>
            Add Contact
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="vendor@email.com"
          />
          <Input
            label="Total Cost"
            type="number"
            value={form.cost}
            onChange={(e) => setForm({ ...form, cost: e.target.value })}
            placeholder="e.g., 50000"
          />
        </div>

        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Any notes, special instructions..."
        />

        <div>
          <p className="text-sm font-semibold text-warm-600 pl-1 mb-1.5">Attachments</p>
          <div
            className="border-2 border-dashed border-blush-200 rounded-card p-4 text-center cursor-pointer hover:bg-blush-50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={20} className="mx-auto text-blush-300 mb-1" />
            <p className="text-xs text-warm-500">Click to attach files (PDF, images, docs)</p>
            <p className="text-[10px] text-warm-300">Max 50MB per file</p>
            <input
              ref={fileRef}
              type="file"
              multiple
              onChange={(e) => handleFileAdd(e.target.files)}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx"
            />
          </div>
          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-blush-50 rounded-sm text-xs">
                  <FileText size={14} className="text-warm-400 shrink-0" />
                  <span className="flex-1 truncate text-warm-600">{f.name}</span>
                  <span className="text-warm-300">{formatFileSize(f.size)}</span>
                  <button
                    type="button"
                    onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                    className="text-warm-400 hover:text-red-500 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-sm">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>
            {initialData ? 'Save Changes' : 'Add Vendor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
