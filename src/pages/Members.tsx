import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useUndoDelete } from '@/hooks/useUndoDelete';
import { UndoToast } from '@/components/ui/UndoToast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import type { Wedding } from '@/types';
import type { User } from '@supabase/supabase-js';
import {
  UserPlus,
  Shield,
  Edit3 as Edit3Icon,
  Eye,
  Crown,
  Trash2,
  Users,
  Copy,
  Check,
  Settings,
  Pencil,
  Save,
  Link,
} from 'lucide-react';

interface MemberRow {
  id: string;
  user_id: string;
  role: 'admin' | 'editor' | 'viewer';
  created_at: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
}

const roleConfig = {
  admin: { label: 'Admin', icon: Crown, variant: 'blush' as const, description: 'Full access to everything' },
  editor: { label: 'Editor', icon: Edit3Icon, variant: 'mint' as const, description: 'Can edit all data' },
  viewer: { label: 'Viewer', icon: Eye, variant: 'warm' as const, description: 'View only access' },
};

interface MembersContext {
  wedding: Wedding | null;
  user: User | null;
  role: string;
  updateWedding: (updates: Partial<Wedding>) => Promise<void>;
}

export function MembersPage() {
  const { wedding, user, updateWedding } = useOutletContext<MembersContext>();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const { pending: undoPending, scheduleDelete, undo, undoWindowMs, hiddenKeys } = useUndoDelete();
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [editingSpace, setEditingSpace] = useState(false);
  const [spaceName, setSpaceName] = useState('');
  const [spaceDate, setSpaceDate] = useState('');
  const [spaceBudget, setSpaceBudget] = useState('');
  const [savingSpace, setSavingSpace] = useState(false);

  const isOwner = wedding?.user_id === user?.id;
  const currentMember = members.find((m) => m.user_id === user?.id);
  const isAdmin = isOwner || currentMember?.role === 'admin';

  useEffect(() => {
    if (!wedding) return;
    fetchMembers();
  }, [wedding]);

  async function fetchMembers() {
    if (!wedding) return;
    setLoading(true);

    const { data } = await supabase
      .from('wedding_members')
      .select('*')
      .eq('wedding_id', wedding.id)
      .order('created_at', { ascending: true });

    if (data) {
      setMembers(data as MemberRow[]);
    }
    setLoading(false);
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wedding || !inviteEmail.trim()) return;

    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      // Look up the user by email in auth.users (via a function or direct check)
      // For now, we'll invite by creating a member record with placeholder
      // The invited user will see the wedding when they log in
      const { data: existingUser } = await supabase
        .rpc('get_user_id_by_email', { email_input: inviteEmail.trim() })
        .maybeSingle();

      if (!existingUser) {
        setInviteError(
          'User not found. They need to create an account on Shaadi Flow first, then you can add them.',
        );
        return;
      }

      const userId = existingUser as unknown as string;

      // Check if already a member
      const { data: existing } = await supabase
        .from('wedding_members')
        .select('id')
        .eq('wedding_id', wedding.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        setInviteError('This person is already a member of this wedding space.');
        return;
      }

      const { error } = await supabase
        .from('wedding_members')
        .insert({
          wedding_id: wedding.id,
          user_id: userId,
          role: inviteRole,
        });

      if (error) throw error;

      setInviteSuccess(`Invited ${inviteEmail.trim()} as ${inviteRole}!`);
      setInviteEmail('');
      fetchMembers();
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : 'Failed to invite member',
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    const { error } = await supabase
      .from('wedding_members')
      .update({ role: newRole })
      .eq('id', memberId);
    if (!error) fetchMembers();
  };

  const handleCopyId = () => {
    if (wedding) {
      navigator.clipboard.writeText(wedding.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-blush-200 border-t-blush-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-700">Team & Settings</h1>
          <p className="text-sm text-warm-400 mt-1">
            Manage who has access to this wedding space
          </p>
        </div>
        {isAdmin && (
          <Button
            icon={<UserPlus size={16} />}
            onClick={() => setShowInvite(true)}
          >
            Add Member
          </Button>
        )}
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-warm-700 flex items-center gap-2">
            <Settings size={20} />
            Wedding Space
          </h2>
          {isAdmin && !editingSpace && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Pencil size={14} />}
              onClick={() => {
                setSpaceName(wedding?.name ?? '');
                setSpaceDate(wedding?.wedding_date ?? '');
                setSpaceBudget(wedding?.total_budget ? String(wedding.total_budget) : '');
                setEditingSpace(true);
              }}
            >
              Edit
            </Button>
          )}
        </div>

        {editingSpace ? (
          <div className="space-y-4">
            <Input
              label="Wedding Name"
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
              placeholder="e.g., Priya & Rahul's Wedding"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Wedding Date"
                type="date"
                value={spaceDate}
                onChange={(e) => setSpaceDate(e.target.value)}
              />
              <Input
                label="Total Budget"
                type="number"
                value={spaceBudget}
                onChange={(e) => setSpaceBudget(e.target.value)}
                placeholder="e.g., 500000"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                icon={<Save size={14} />}
                loading={savingSpace}
                onClick={async () => {
                  if (!spaceName.trim()) return;
                  setSavingSpace(true);
                  await updateWedding({
                    name: spaceName.trim(),
                    wedding_date: spaceDate || null,
                    total_budget: spaceBudget ? parseFloat(spaceBudget) : 0,
                  });
                  setSavingSpace(false);
                  setEditingSpace(false);
                }}
              >
                Save Changes
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingSpace(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-warm-400 font-semibold mb-1">Name</p>
                <p className="text-sm text-warm-700 font-medium">{wedding?.name}</p>
              </div>
              <div>
                <p className="text-xs text-warm-400 font-semibold mb-1">Date</p>
                <p className="text-sm text-warm-700 font-medium">
                  {wedding?.wedding_date
                    ? new Date(wedding.wedding_date + 'T00:00:00').toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-xs text-warm-400 font-semibold mb-1">Budget</p>
                <p className="text-sm text-warm-700 font-medium">
                  {wedding?.total_budget
                    ? `₹${wedding.total_budget.toLocaleString('en-IN')}`
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-xs text-warm-400 font-semibold mb-1">Space ID</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-blush-50 px-2 py-1 rounded-sm text-warm-500 truncate max-w-[200px]">
                    {wedding?.id}
                  </code>
                  <button
                    onClick={handleCopyId}
                    className="text-warm-400 hover:text-warm-600 transition-colors cursor-pointer"
                  >
                    {copied ? <Check size={14} className="text-mint-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {isAdmin && wedding && (
              <div className="mt-4 pt-4 border-t border-blush-100">
                <p className="text-xs text-warm-400 font-semibold mb-2">Invite Link</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-blush-50 px-3 py-2 rounded-sm text-warm-500 truncate">
                    {window.location.origin}/join/{wedding.id}
                  </code>
                  <Button
                    size="sm"
                    variant={copiedLink ? 'secondary' : 'primary'}
                    icon={copiedLink ? <Check size={14} /> : <Link size={14} />}
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/join/${wedding.id}`);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                  >
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </Button>
                </div>
                <p className="text-xs text-warm-300 mt-1">
                  Anyone with this link can join as a viewer after signing in.
                </p>
              </div>
            )}
          </>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-warm-700 flex items-center gap-2 mb-4">
          <Shield size={20} />
          Members ({members.filter((m) => !hiddenKeys.has(`member:${m.id}`)).length})
        </h2>

        <div className="space-y-3">
          {members.filter((member) => !hiddenKeys.has(`member:${member.id}`)).map((member) => {
              const isMe = member.user_id === user?.id;
              const memberIsOwner = member.user_id === wedding?.user_id;
              const config = roleConfig[member.role];
              const RoleIcon = config.icon;

              return (
                <div
                  key={member.id}
                  className={`flex items-center gap-4 p-3 rounded-sm ${isMe ? 'bg-blush-50' : 'hover:bg-blush-50'} transition-colors`}
                >
                  <Avatar
                    name={member.display_name || member.email || 'Member'}
                    src={member.avatar_url}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-warm-700">
                      {member.display_name || member.email || 'Team Member'}
                      {isMe && (
                        <span className="ml-2 text-xs text-warm-400">(you)</span>
                      )}
                    </p>
                    {isAdmin && member.email && (
                      <p className="text-xs text-warm-400 truncate">{member.email}</p>
                    )}
                    <p className="text-xs text-warm-300">
                      Added {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {memberIsOwner ? (
                    <Badge variant="blush">
                      <Crown size={12} className="mr-1" />
                      Owner
                    </Badge>
                  ) : isAdmin && !isMe ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        options={[
                          { value: 'admin', label: 'Admin' },
                          { value: 'editor', label: 'Editor' },
                          { value: 'viewer', label: 'Viewer' },
                        ]}
                        className="!py-1.5 !text-xs w-28"
                      />
                      <button
                        onClick={() => scheduleDelete(
                          member.display_name || member.email || 'Member',
                          async () => {
                            await supabase.from('wedding_members').delete().eq('id', member.id);
                            fetchMembers();
                          },
                          `member:${member.id}`
                        )}
                        className="p-1.5 rounded-full hover:bg-red-50 text-warm-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <Badge variant={config.variant}>
                      <RoleIcon size={12} className="mr-1" />
                      {config.label}
                    </Badge>
                  )}
                </div>
              );
          })}

          {members.filter((m) => !hiddenKeys.has(`member:${m.id}`)).length <= 1 && (
            <EmptyState
              icon={<Users size={36} />}
              title="Just you for now"
              description="Add family members or your partner to collaborate on the planning."
              actionLabel={isAdmin ? 'Invite Someone' : undefined}
              onAction={isAdmin ? () => setShowInvite(true) : undefined}
            />
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-bold text-warm-600 mb-3">Role Permissions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(roleConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div key={key} className="p-3 rounded-sm bg-blush-50">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className="text-warm-500" />
                  <span className="text-sm font-semibold text-warm-700">
                    {config.label}
                  </span>
                </div>
                <p className="text-xs text-warm-400">{config.description}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Modal
        open={showInvite}
        onClose={() => {
          setShowInvite(false);
          setInviteError('');
          setInviteSuccess('');
        }}
        title="Add Team Member"
        size="sm"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="partner@email.com"
          />
          <Select
            label="Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            options={[
              { value: 'admin', label: 'Admin - Full access' },
              { value: 'editor', label: 'Editor - Can edit data' },
              { value: 'viewer', label: 'Viewer - Read only' },
            ]}
          />

          {inviteError && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-sm">
              {inviteError}
            </p>
          )}
          {inviteSuccess && (
            <p className="text-sm text-mint-600 bg-mint-50 px-4 py-2 rounded-sm">
              {inviteSuccess}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={inviteLoading}>
              Send Invite
            </Button>
          </div>
        </form>
      </Modal>

      <UndoToast pending={undoPending} onUndo={undo} undoWindowMs={undoWindowMs} />
    </div>
  );
}
