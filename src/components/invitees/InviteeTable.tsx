import { useState, useMemo } from 'react';
import type { Invitee } from '@/types';
import { RsvpBadge, PriorityBadge } from '@/components/ui/Badge';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Edit3,
  Trash2,
  CheckCircle,
  Circle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Users,
  UserCheck,
} from 'lucide-react';

interface InviteeTableProps {
  invitees: Invitee[];
  onEdit: (invitee: Invitee) => void;
  onDelete: (id: string) => void;
  onDeleteFamily?: (familyId: string) => void;
  onToggleVisited: (invitee: Invitee) => void;
  canDelete?: boolean;
  isAdminOrOwner?: boolean;
}

interface DisplayRow {
  type: 'solo' | 'family-head' | 'family-member';
  invitee: Invitee;
  familyId: string | null;
  headcount: number;
  memberCount: number;
  allVisited: boolean;
}

export function InviteeTable({
  invitees,
  onEdit,
  onDelete,
  onDeleteFamily,
  onToggleVisited,
  canDelete = true,
  isAdminOrOwner = false,
}: InviteeTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteFamilyId, setDeleteFamilyId] = useState<string | null>(null);
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

  const toggleFamily = (familyId: string) => {
    setExpandedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(familyId)) next.delete(familyId);
      else next.add(familyId);
      return next;
    });
  };

  const rows = useMemo(() => {
    const result: DisplayRow[] = [];
    const familyMap = new Map<string, Invitee[]>();
    const solos: Invitee[] = [];

    for (const inv of invitees) {
      if (inv.family_id) {
        const group = familyMap.get(inv.family_id) || [];
        group.push(inv);
        familyMap.set(inv.family_id, group);
      } else {
        solos.push(inv);
      }
    }

    // Process families
    const processedFamilies = new Set<string>();
    for (const inv of invitees) {
      if (inv.family_id && !processedFamilies.has(inv.family_id)) {
        processedFamilies.add(inv.family_id);
        const group = familyMap.get(inv.family_id)!;
        const head = group.find((m) => m.is_family_head) || group[0];
        const members = group.filter((m) => m.id !== head.id);
        const namedCount = group.length;
        const extraCount = head.extra_members || 0;
        const headcount = namedCount + extraCount;

        const allVisited = group.every((m) => m.visited);

        result.push({
          type: 'family-head',
          invitee: head,
          familyId: inv.family_id,
          headcount,
          memberCount: members.length + extraCount,
          allVisited,
        });

        if (expandedFamilies.has(inv.family_id)) {
          for (const member of members) {
            result.push({
              type: 'family-member',
              invitee: member,
              familyId: inv.family_id,
              headcount: 1,
              memberCount: 0,
              allVisited: member.visited,
            });
          }
        }
      } else if (!inv.family_id) {
        // solo entries are handled separately to maintain order
      }
    }

    // Add solos (including RSVP entries with extra_members)
    for (const inv of solos) {
      const totalPeople = 1 + (inv.extra_members || 0);
      result.push({
        type: 'solo',
        invitee: inv,
        familyId: null,
        headcount: totalPeople,
        memberCount: inv.extra_members || 0,
        allVisited: inv.visited,
      });
    }

    return result;
  }, [invitees, expandedFamilies]);

  return (
    <>
      <div className="overflow-x-auto rounded-card bg-white shadow-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-blush-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-warm-400 uppercase tracking-wider">
                Visited
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-warm-400 uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-warm-400 uppercase tracking-wider hidden md:table-cell">
                Area
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-warm-400 uppercase tracking-wider hidden lg:table-cell">
                Side
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-warm-400 uppercase tracking-wider">
                RSVP
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-warm-400 uppercase tracking-wider hidden lg:table-cell">
                Priority
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-warm-400 uppercase tracking-wider hidden xl:table-cell">
                Events
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-warm-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const inv = row.invitee;
              const isFamilyHead = row.type === 'family-head';
              const isFamilyMember = row.type === 'family-member';
              const isExpanded =
                isFamilyHead && row.familyId
                  ? expandedFamilies.has(row.familyId)
                  : false;

              return (
                <tr
                  key={inv.id}
                  className={`
                    border-b border-blush-50 transition-colors
                    ${isFamilyMember ? 'bg-blush-50/30' : 'hover:bg-blush-50/50'}
                  `}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {isFamilyHead && row.familyId && (
                        <button
                          onClick={() => toggleFamily(row.familyId!)}
                          className="cursor-pointer text-warm-300 hover:text-warm-500 transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </button>
                      )}
                      {isFamilyMember && <span className="w-4" />}
                      <button
                        onClick={() => onToggleVisited(inv)}
                        className="cursor-pointer text-warm-300 hover:text-blue-500 transition-colors"
                      >
                        {inv.visited ? (
                          <CheckCircle size={20} className="text-blue-500" />
                        ) : (
                          <Circle size={20} />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={isFamilyMember ? 'pl-4' : ''}>
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm font-semibold ${isFamilyMember ? 'text-warm-500' : 'text-warm-700'}`}
                        >
                          {isFamilyMember && '└ '}
                          {inv.name}
                        </p>
                        {isFamilyHead && row.memberCount > 0 && (
                          <Badge variant={inv.half_and_half ? 'amber' : 'blush'}>
                            <Users size={10} className="mr-1" />
                            {row.headcount}{inv.half_and_half ? ' ½' : ''}
                          </Badge>
                        )}
                        {!isFamilyHead && !isFamilyMember && row.headcount > 1 && (
                          <Badge variant={inv.half_and_half ? 'amber' : 'mint'}>
                            <UserCheck size={10} className="mr-1" />
                            {row.headcount}{inv.half_and_half ? ' ½' : ''}
                          </Badge>
                        )}
                      </div>
                      {inv.phone && !isFamilyMember && (
                        <p className="text-xs text-warm-400">{inv.phone}</p>
                      )}
                      {isFamilyHead && inv.extra_members > 0 && (
                        <p className="text-xs text-warm-300">
                          +{inv.extra_members} unnamed
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {!isFamilyMember ? (
                      <div className="flex items-center gap-1">
                        <p className="text-sm text-warm-500 truncate max-w-[200px]">
                          {inv.address || '—'}
                        </p>
                        {inv.map_link && (
                          <a
                            href={inv.map_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blush-400 hover:text-blush-600"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-warm-300 italic">
                        same as family
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-warm-500 capitalize">
                      {inv.side ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RsvpBadge status={inv.rsvp_status} />
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <PriorityBadge priority={inv.priority} />
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    {!isFamilyMember && (
                      <div className="flex gap-1">
                        {inv.attending_muhurtham && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-pill font-semibold ${inv.half_and_half ? 'bg-amber-50 text-amber-600' : 'bg-blush-100 text-blush-600'}`}>
                            M{inv.half_and_half ? '½' : ''}
                          </span>
                        )}
                        {inv.attending_reception && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-pill font-semibold ${inv.half_and_half ? 'bg-amber-50 text-amber-600' : 'bg-mint-100 text-mint-600'}`}>
                            R{inv.half_and_half ? '½' : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {(!inv.created_by || isAdminOrOwner) && (
                        <button
                          onClick={() => onEdit(inv)}
                          className="p-1.5 rounded-full hover:bg-blush-100 text-warm-400 hover:text-warm-600 transition-colors cursor-pointer"
                        >
                          <Edit3 size={16} />
                        </button>
                      )}
                      {canDelete && (
                        isFamilyHead && row.familyId ? (
                          <button
                            onClick={() => setDeleteFamilyId(row.familyId)}
                            className="p-1.5 rounded-full hover:bg-red-50 text-warm-400 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => onDelete(inv.id)}
                            className="p-1.5 rounded-full hover:bg-red-50 text-warm-400 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) onDelete(deleteId);
          setDeleteId(null);
        }}
        title="Delete Guest"
        message="Are you sure you want to remove this guest? This action cannot be undone."
        confirmLabel="Delete"
      />

      <ConfirmDialog
        open={!!deleteFamilyId}
        onClose={() => setDeleteFamilyId(null)}
        onConfirm={() => {
          if (deleteFamilyId && onDeleteFamily) onDeleteFamily(deleteFamilyId);
          setDeleteFamilyId(null);
        }}
        title="Delete Entire Family"
        message="This will remove the family head and all members. Are you sure?"
        confirmLabel="Delete Family"
      />
    </>
  );
}
