import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { TagInput } from '@/components/ui/TagInput';
import { parseMapsLink, parsePlaceName, reverseGeocode } from '@/lib/parse-maps-link';
import type { Invitee } from '@/types';
import { Loader2, MapPin, Plus, X, Users } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface InviteeFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Invitee>, newMemberNames?: string[]) => void;
  onSubmitFamily?: (data: {
    head: Partial<Invitee>;
    memberNames: string[];
    extraCount: number;
  }) => void;
  initialData?: Invitee | null;
  loading?: boolean;
  allTags?: string[];
}

const sideOptions = [
  { value: 'bride', label: "Bride's Side" },
  { value: 'groom', label: "Groom's Side" },
  { value: 'mutual', label: 'Mutual' },
];

const priorityOptions = [
  { value: 'vip', label: 'VIP' },
  { value: 'normal', label: 'Normal' },
  { value: 'optional', label: 'Optional' },
];

const rsvpOptions = [
  { value: 'not_invited', label: 'Not Invited' },
  { value: 'invited', label: 'Invited' },
  { value: 'pending', label: 'RSVP Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'declined', label: 'Declined' },
];

export function InviteeForm({
  open,
  onClose,
  onSubmit,
  onSubmitFamily,
  initialData,
  loading,
  allTags,
}: InviteeFormProps) {
  const [mode, setMode] = useState<'single' | 'family'>('single');
  const [form, setForm] = useState({
    name: '',
    address: '',
    map_link: '',
    phone: '',
    notes: '',
    tags: '',
    side: '',
    priority: 'normal',
    rsvp_status: 'not_invited',
    time_constraint: '',
  });
  const [tagsArray, setTagsArray] = useState<string[]>([]);
  const [attendReception, setAttendReception] = useState(true);
  const [attendMuhurtham, setAttendMuhurtham] = useState(true);
  const [halfAndHalf, setHalfAndHalf] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  const [extraCount, setExtraCount] = useState(0);
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolvedInfo, setResolvedInfo] = useState<string | null>(null);

  const isEditingFamilyHead = !!initialData?.family_id && initialData?.is_family_head;

  useEffect(() => {
    if (initialData) {
      setMode(initialData.family_id ? 'family' : 'single');
      setTagsArray(initialData.tags ?? []);
      setForm({
        name: initialData.name,
        address: initialData.address ?? '',
        map_link: initialData.map_link ?? '',
        phone: initialData.phone ?? '',
        notes: initialData.notes ?? '',
        tags: '',
        side: initialData.side ?? '',
        priority: initialData.priority,
        rsvp_status: initialData.rsvp_status,
        time_constraint: initialData.time_constraint ?? '',
      });
      setExtraCount(initialData.extra_members ?? 0);
      setAttendReception(initialData.attending_reception ?? true);
      setAttendMuhurtham(initialData.attending_muhurtham ?? true);
      setHalfAndHalf(initialData.half_and_half ?? false);
      setFamilyMembers([]);
    } else {
      setForm({
        name: '',
        address: '',
        map_link: '',
        phone: '',
        notes: '',
        tags: '',
        side: '',
        priority: 'normal',
        rsvp_status: 'not_invited',
        time_constraint: '',
      });
      setTagsArray([]);
      setAttendReception(true);
      setAttendMuhurtham(true);
      setHalfAndHalf(false);
      setFamilyMembers([]);
      setExtraCount(0);
      setMode('single');
    }
    setError('');
    setResolvedInfo(null);
  }, [initialData, open]);

  const resolveMapLink = useCallback(
    async (link: string) => {
      if (!link.trim()) return;
      setResolving(true);
      setResolvedInfo(null);
      try {
        const placeName = parsePlaceName(link);
        const coords = parseMapsLink(link);
        const updates: Partial<typeof form> = {};
        const infoParts: string[] = [];
        if (placeName && !form.address) {
          updates.address = placeName;
          infoParts.push(`Address: ${placeName}`);
        }
        if (coords && MAPBOX_TOKEN) {
          const fullAddress = await reverseGeocode(coords.lat, coords.lng, MAPBOX_TOKEN);
          if (fullAddress && !form.address && !updates.address) {
            updates.address = fullAddress;
            infoParts.push(`Address: ${fullAddress}`);
          } else if (fullAddress) {
            infoParts.push(`Resolved: ${fullAddress}`);
          }
          infoParts.push(`Coordinates: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
        }
        if (Object.keys(updates).length > 0) setForm((prev) => ({ ...prev, ...updates }));
        if (infoParts.length > 0) setResolvedInfo(infoParts.join(' | '));
      } finally {
        setResolving(false);
      }
    },
    [form.address],
  );

  const handleMapLinkChange = (value: string) => {
    setForm({ ...form, map_link: value });
    if (
      value.includes('google.com/maps') ||
      value.includes('maps.google') ||
      value.includes('goo.gl/maps') ||
      value.includes('maps.app.goo.gl')
    ) {
      resolveMapLink(value);
    }
  };

  const totalHeadcount =
    mode === 'family'
      ? 1 + familyMembers.filter(Boolean).length + extraCount
      : 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!form.address.trim() && !form.map_link.trim()) {
      setError('At least one of Address or Map Link is required');
      return;
    }

    const baseData: Partial<Invitee> = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      map_link: form.map_link.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
      tags: tagsArray,
      side: (form.side || null) as Invitee['side'],
      priority: form.priority as Invitee['priority'],
      rsvp_status: form.rsvp_status as Invitee['rsvp_status'],
      time_constraint: form.time_constraint.trim() || null,
      attending_reception: halfAndHalf ? true : attendReception,
      attending_muhurtham: halfAndHalf ? true : attendMuhurtham,
      half_and_half: halfAndHalf,
    };

    // When editing a family head, also save extra_members
    if (isEditingFamilyHead) {
      baseData.extra_members = extraCount;
    }

    const newMembers = familyMembers.filter((n) => n.trim());

    if (mode === 'family' && onSubmitFamily && !initialData) {
      onSubmitFamily({
        head: baseData,
        memberNames: familyMembers.filter((n) => n.trim()),
        extraCount,
      });
    } else {
      onSubmit(baseData, isEditingFamilyHead ? newMembers : undefined);
    }
  };

  const addMemberField = () => setFamilyMembers([...familyMembers, '']);
  const removeMemberField = (idx: number) =>
    setFamilyMembers(familyMembers.filter((_, i) => i !== idx));
  const updateMemberName = (idx: number, val: string) => {
    const updated = [...familyMembers];
    updated[idx] = val;
    setFamilyMembers(updated);
  };

  const isEditing = !!initialData;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Guest' : mode === 'family' ? 'Add Family / Group' : 'Add Guest'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEditing && (
          <div className="flex gap-1 bg-blush-50 rounded-pill p-1">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-pill text-sm font-semibold transition-all cursor-pointer ${
                mode === 'single'
                  ? 'bg-white text-warm-700 shadow-card'
                  : 'text-warm-400 hover:text-warm-600'
              }`}
            >
              Single Guest
            </button>
            <button
              type="button"
              onClick={() => setMode('family')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-pill text-sm font-semibold transition-all cursor-pointer ${
                mode === 'family'
                  ? 'bg-white text-warm-700 shadow-card'
                  : 'text-warm-400 hover:text-warm-600'
              }`}
            >
              <Users size={16} />
              Family / Group
            </button>
          </div>
        )}

        <Input
          label={mode === 'family' ? 'Head of Family *' : 'Name *'}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={mode === 'family' ? 'Primary contact name' : 'Guest name'}
        />

        {isEditingFamilyHead && (
          <div className="p-4 bg-blush-50 rounded-card space-y-3">
            <p className="text-sm font-semibold text-warm-600">Family Members</p>

            {familyMembers.map((memberName, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={memberName}
                  onChange={(e) => {
                    const updated = [...familyMembers];
                    updated[idx] = e.target.value;
                    setFamilyMembers(updated);
                  }}
                  placeholder={`New member name`}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => setFamilyMembers(familyMembers.filter((_, i) => i !== idx))}
                  className="p-2 rounded-full hover:bg-red-50 text-warm-400 hover:text-red-500 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setFamilyMembers([...familyMembers, ''])}
            >
              Add named member
            </Button>

            <div className="flex items-center gap-3 border-t border-blush-200 pt-3">
              <label className="text-xs font-semibold text-warm-500 whitespace-nowrap">
                Unnamed additional:
              </label>
              <input
                type="number"
                min={0}
                max={999}
                value={extraCount || ''}
                onChange={(e) => setExtraCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 rounded-pill border border-blush-200 bg-white px-3 py-1.5 text-sm text-warm-700 text-center focus:outline-none focus:ring-2 focus:ring-blush-300"
              />
            </div>
          </div>
        )}

        {mode === 'family' && !initialData && (
          <div className="space-y-3 p-4 bg-blush-50 rounded-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-warm-600">
                Family Members
              </p>
              <span className="text-xs text-warm-400 bg-white px-3 py-1 rounded-pill font-semibold">
                Total: {totalHeadcount} people
              </span>
            </div>

            {familyMembers.map((name, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={name}
                  onChange={(e) => updateMemberName(idx, e.target.value)}
                  placeholder={`Member ${idx + 2} name`}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeMemberField(idx)}
                  className="p-2 rounded-full hover:bg-red-50 text-warm-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<Plus size={14} />}
              onClick={addMemberField}
            >
              Add named member
            </Button>

            <div className="border-t border-blush-200 pt-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-warm-500 whitespace-nowrap">
                  Additional unnamed members:
                </label>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={extraCount}
                  onChange={(e) => setExtraCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 rounded-pill border border-blush-200 bg-white px-3 py-1.5 text-sm text-warm-700 text-center focus:outline-none focus:ring-2 focus:ring-blush-300"
                />
              </div>
              <p className="text-xs text-warm-300 mt-1">
                e.g., +2 means "{form.name || 'Name'} and family ({1 + familyMembers.filter(Boolean).length + extraCount})"
              </p>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Full address"
            />
            <Input
              label="Google Maps Link"
              value={form.map_link}
              onChange={(e) => handleMapLinkChange(e.target.value)}
              placeholder="Paste a Google Maps link..."
              icon={resolving ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
            />
          </div>
          {resolvedInfo && (
            <p className="text-xs text-mint-600 bg-mint-50 px-3 py-1.5 rounded-sm flex items-center gap-1.5">
              <MapPin size={12} className="shrink-0" />
              {resolvedInfo}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+91 ..."
          />
          <Select
            label="Side"
            value={form.side}
            onChange={(e) => setForm({ ...form, side: e.target.value })}
            options={sideOptions}
            placeholder="Select side"
          />
          <Select
            label="Priority"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            options={priorityOptions}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="RSVP Status"
            value={form.rsvp_status}
            onChange={(e) => setForm({ ...form, rsvp_status: e.target.value })}
            options={rsvpOptions}
          />
          <Input
            label="Time Constraint"
            value={form.time_constraint}
            onChange={(e) => setForm({ ...form, time_constraint: e.target.value })}
            placeholder="e.g., Only after 6 PM"
          />
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={halfAndHalf || attendReception}
              disabled={halfAndHalf}
              onChange={(e) => setAttendReception(e.target.checked)}
              className="w-4 h-4 accent-blush-400 cursor-pointer disabled:opacity-50"
            />
            <span className={`text-sm ${halfAndHalf ? 'text-warm-400' : 'text-warm-600'}`}>Reception</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={halfAndHalf || attendMuhurtham}
              disabled={halfAndHalf}
              onChange={(e) => setAttendMuhurtham(e.target.checked)}
              className="w-4 h-4 accent-blush-400 cursor-pointer disabled:opacity-50"
            />
            <span className={`text-sm ${halfAndHalf ? 'text-warm-400' : 'text-warm-600'}`}>Muhurtham</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={halfAndHalf}
              onChange={(e) => setHalfAndHalf(e.target.checked)}
              className="w-4 h-4 accent-amber-400 cursor-pointer"
            />
            <span className="text-sm text-warm-600">Half & Half</span>
          </label>
        </div>

        <TagInput
          label="Tags"
          value={tagsArray}
          onChange={setTagsArray}
          extraPresets={allTags}
        />

        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Any special notes..."
        />

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-sm">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEditing
              ? 'Save Changes'
              : mode === 'family'
                ? `Add Family (${totalHeadcount})`
                : 'Add Guest'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
