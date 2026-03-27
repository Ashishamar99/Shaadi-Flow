import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useInvitees } from '@/hooks/useInvitees';
import { InviteeTable } from '@/components/invitees/InviteeTable';
import { InviteeForm } from '@/components/invitees/InviteeForm';
import { CSVImport } from '@/components/invitees/CSVImport';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { exportToCSV, inviteesToExportData } from '@/lib/export';
import type { Wedding, Invitee } from '@/types';
import type { User } from '@supabase/supabase-js';
import {
  UserPlus,
  Upload,
  Search,
  Users,
  CheckCircle2,
  Clock,
  FileDown,
  UsersRound,
} from 'lucide-react';

export function InviteesPage() {
  const { wedding, user, canDelete } = useOutletContext<{
    wedding: Wedding | null;
    user: User | null;
    canDelete: boolean;
  }>();
  const displayName = user?.user_metadata?.full_name || user?.email || 'User';
  const {
    invitees,
    isLoading,
    addInvitee,
    updateInvitee,
    deleteInvitee,
    addFamily,
    deleteFamily,
    bulkInsert,
  } = useInvitees(wedding?.id, user?.id, displayName);

  const [showForm, setShowForm] = useState(false);
  const [editingInvitee, setEditingInvitee] = useState<Invitee | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRsvp, setFilterRsvp] = useState('');
  const [filterSide, setFilterSide] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCreatedBy, setFilterCreatedBy] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az' | 'za'>('newest');

  const creators = useMemo(() => {
    const names = new Set<string>();
    invitees.forEach((inv) => {
      if (inv.created_by_name) names.add(inv.created_by_name);
    });
    return Array.from(names).sort();
  }, [invitees]);

  const filtered = useMemo(() => {
    let result = invitees;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.name.toLowerCase().includes(q) ||
          inv.address?.toLowerCase().includes(q) ||
          inv.phone?.includes(q),
      );
    }
    if (filterRsvp) {
      result = result.filter((inv) => inv.rsvp_status === filterRsvp);
    }
    if (filterSide) {
      result = result.filter((inv) => inv.side === filterSide);
    }
    if (filterPriority) {
      result = result.filter((inv) => inv.priority === filterPriority);
    }
    if (filterCreatedBy) {
      result = result.filter((inv) => inv.created_by_name === filterCreatedBy);
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'az': return a.name.localeCompare(b.name);
        case 'za': return b.name.localeCompare(a.name);
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [invitees, search, filterRsvp, filterSide, filterPriority, filterCreatedBy, sortBy]);

  const stats = useMemo(() => {
    const rows = invitees.length;
    const headcount = invitees.reduce(
      (sum, inv) => sum + 1 + (inv.is_family_head ? inv.extra_members : 0),
      0,
    );
    // Visits = solo guests + unique families (family_id groups count as 1 visit)
    const familyIds = new Set(
      invitees.filter((i) => i.family_id).map((i) => i.family_id),
    );
    const soloCount = invitees.filter((i) => !i.family_id).length;
    const visits = soloCount + familyIds.size;

    const confirmed = invitees.filter(
      (i) => i.rsvp_status === 'confirmed' && (i.is_family_head || !i.family_id),
    ).length;
    const pending = invitees.filter(
      (i) => i.rsvp_status === 'pending' && (i.is_family_head || !i.family_id),
    ).length;
    const visited = invitees.filter(
      (i) => i.visited && (i.is_family_head || !i.family_id),
    ).length;

    return { rows, headcount, visits, confirmed, visited, pending };
  }, [invitees]);

  const handleAddGuest = (data: Partial<Invitee>) => {
    addInvitee.mutate(data, { onSuccess: () => setShowForm(false) });
  };

  const handleAddFamily = (data: {
    head: Partial<Invitee>;
    memberNames: string[];
    extraCount: number;
  }) => {
    addFamily.mutate(data, { onSuccess: () => setShowForm(false) });
  };

  const handleEditGuest = (data: Partial<Invitee>, newMemberNames?: string[]) => {
    if (!editingInvitee) return;
    updateInvitee.mutate(
      { id: editingInvitee.id, ...data },
      {
        onSuccess: () => {
          if (newMemberNames && newMemberNames.length > 0 && editingInvitee.family_id) {
            const newRows = newMemberNames.map((name) => ({
              name: name.trim(),
              wedding_id: wedding?.id,
              family_id: editingInvitee.family_id,
              is_family_head: false,
              extra_members: 0,
              address: data.address || editingInvitee.address,
              map_link: data.map_link || editingInvitee.map_link,
              lat: editingInvitee.lat,
              lng: editingInvitee.lng,
              side: data.side || editingInvitee.side,
              priority: data.priority || editingInvitee.priority,
              rsvp_status: data.rsvp_status || editingInvitee.rsvp_status,
              tags: data.tags || editingInvitee.tags,
              visited: false,
              created_by: user?.id,
              created_by_name: displayName,
            }));
            bulkInsert.mutate(newRows as Partial<Invitee>[]);
          }
          setEditingInvitee(null);
        },
      },
    );
  };

  const handleToggleVisited = (inv: Invitee) => {
    updateInvitee.mutate({ id: inv.id, visited: !inv.visited });
  };

  const handleCSVImport = (rows: Record<string, string>[]) => {
    const inviteeData = rows.map((row) => ({
      name: row.name,
      address: row.address || null,
      map_link: row.map_link || null,
      phone: row.phone || null,
      side: (['bride', 'groom', 'mutual'].includes(row.side?.toLowerCase())
        ? row.side.toLowerCase()
        : null) as Invitee['side'],
      priority: (['vip', 'normal', 'optional'].includes(
        row.priority?.toLowerCase(),
      )
        ? row.priority.toLowerCase()
        : 'normal') as Invitee['priority'],
      notes: row.notes || null,
      tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [],
    }));
    bulkInsert.mutate(inviteeData as Partial<Invitee>[]);
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
          <h1 className="text-2xl font-bold text-warm-700">Guest Book</h1>
          <p className="text-sm text-warm-400 mt-1">
            Manage your wedding invitees
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<Upload size={16} />}
            onClick={() => setShowImport(true)}
          >
            Import CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<FileDown size={16} />}
            disabled={invitees.length === 0}
            onClick={() =>
              exportToCSV(inviteesToExportData(filtered), 'wedding-guests')
            }
          >
            Export
          </Button>
          <Button
            icon={<UserPlus size={16} />}
            onClick={() => setShowForm(true)}
          >
            Add Guest
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <UsersRound size={18} className="text-blush-400" />
            <div>
              <p className="text-lg font-bold text-warm-700">
                {stats.headcount}
              </p>
              <p className="text-xs text-warm-400">Headcount</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <Users size={18} className="text-warm-400" />
            <div>
              <p className="text-lg font-bold text-warm-700">{stats.visits}</p>
              <p className="text-xs text-warm-400">Visits</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-mint-400" />
            <div>
              <p className="text-lg font-bold text-warm-700">
                {stats.confirmed}
              </p>
              <p className="text-xs text-warm-400">Confirmed</p>
            </div>
          </div>
        </Card>
        <Card padding="sm" className="hidden sm:block">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-blue-400" />
            <div>
              <p className="text-lg font-bold text-warm-700">
                {stats.visited}
              </p>
              <p className="text-xs text-warm-400">Visited</p>
            </div>
          </div>
        </Card>
        <Card padding="sm" className="hidden lg:block">
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-amber-400" />
            <div>
              <p className="text-lg font-bold text-warm-700">
                {stats.pending}
              </p>
              <p className="text-xs text-warm-400">Pending</p>
            </div>
          </div>
        </Card>
        <Card padding="sm" className="hidden lg:block">
          <div className="flex items-center gap-3">
            <Users size={18} className="text-blush-300" />
            <div>
              <p className="text-lg font-bold text-warm-700">{stats.rows}</p>
              <p className="text-xs text-warm-400">Entries</p>
            </div>
          </div>
        </Card>
      </div>

      <Card padding="sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input
              icon={<Search size={16} />}
              placeholder="Search guests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={filterRsvp}
            onChange={(e) => setFilterRsvp(e.target.value)}
            options={[
              { value: '', label: 'All RSVP' },
              { value: 'not_invited', label: 'Not Invited' },
              { value: 'invited', label: 'Invited' },
              { value: 'pending', label: 'Pending' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'declined', label: 'Declined' },
            ]}
          />
          <Select
            value={filterSide}
            onChange={(e) => setFilterSide(e.target.value)}
            options={[
              { value: '', label: 'All Sides' },
              { value: 'bride', label: "Bride's Side" },
              { value: 'groom', label: "Groom's Side" },
              { value: 'mutual', label: 'Mutual' },
            ]}
          />
          <Select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            options={[
              { value: '', label: 'All Priority' },
              { value: 'vip', label: 'VIP' },
              { value: 'normal', label: 'Normal' },
              { value: 'optional', label: 'Optional' },
            ]}
          />
          {creators.length > 0 && (
            <Select
              value={filterCreatedBy}
              onChange={(e) => setFilterCreatedBy(e.target.value)}
              options={[
                { value: '', label: 'All Creators' },
                ...creators.map((c) => ({ value: c, label: c })),
              ]}
            />
          )}
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            options={[
              { value: 'newest', label: 'Newest First' },
              { value: 'oldest', label: 'Oldest First' },
              { value: 'az', label: 'A → Z' },
              { value: 'za', label: 'Z → A' },
            ]}
          />
          {(search || filterRsvp || filterSide || filterPriority || filterCreatedBy) && (
            <Badge variant="blush">
              {filtered.length} of {invitees.length}
            </Badge>
          )}
        </div>
      </Card>

      {invitees.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No guests yet"
          description="Start building your guest list by adding guests or families."
          actionLabel="Add Your First Guest"
          onAction={() => setShowForm(true)}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={48} />}
          title="No matches found"
          description="Try adjusting your search or filters."
        />
      ) : (
        <InviteeTable
          invitees={filtered}
          onEdit={(inv) => setEditingInvitee(inv)}
          onDelete={(id) => deleteInvitee.mutate(id)}
          onDeleteFamily={(fid) => deleteFamily.mutate(fid)}
          onToggleVisited={handleToggleVisited}
          canDelete={canDelete}
        />
      )}

      <InviteeForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleAddGuest}
        onSubmitFamily={handleAddFamily}
        loading={addInvitee.isPending || addFamily.isPending}
      />

      <InviteeForm
        open={!!editingInvitee}
        onClose={() => setEditingInvitee(null)}
        onSubmit={handleEditGuest}
        initialData={editingInvitee}
        loading={updateInvitee.isPending}
      />

      <CSVImport
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleCSVImport}
      />
    </div>
  );
}
