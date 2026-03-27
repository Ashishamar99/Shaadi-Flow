import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';
import type { Wedding, TimelineEvent } from '@/types';
import { CalendarDays, MapPin, UserCircle, Heart, Moon, Sun, LogOut, X, UserPlus, Check, Share2, Download } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

const REACTION_EMOJIS = ['❤️', '🎉', '🥳', '💃', '🙌', '😍'];

function formatEventTime(timeStr: string): string {
  const match = timeStr.match(/T(\d{2}):(\d{2})/);
  if (!match) return timeStr;
  const h = parseInt(match[1]);
  const m = match[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12.toString().padStart(2, '0')}:${m} ${ampm}`;
}

async function shareScheduleAsImage(weddingName: string) {
  const el = document.getElementById('viewer-schedule');
  if (!el) return;

  const hiddenEls = el.querySelectorAll('.emoji-reactions-hide');
  hiddenEls.forEach((e) => (e as HTMLElement).style.display = 'none');

  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(el, { quality: 0.95, backgroundColor: '#FFF9F9' });

  hiddenEls.forEach((e) => (e as HTMLElement).style.display = '');
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], `${weddingName}-schedule.png`, { type: 'image/png' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: `${weddingName} - Schedule`,
      files: [file],
    });
  } else {
    const link = document.createElement('a');
    link.download = `${weddingName}-schedule.png`;
    link.href = dataUrl;
    link.click();
  }
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function generateReactions(eventId: string, guestCount: number): Record<string, number> {
  const rng = seededRandom(hashString(eventId));
  const result: Record<string, number> = {};
  const base = Math.max(1, Math.floor(guestCount * 0.6));

  for (const emoji of REACTION_EMOJIS) {
    const chance = rng();
    if (chance < 0.75) {
      const count = Math.max(1, Math.floor(rng() * base * 0.8) + 1);
      result[emoji] = count;
    }
  }

  // Guarantee at least 2 emojis have reactions
  const active = Object.keys(result).length;
  if (active < 2) {
    for (const emoji of REACTION_EMOJIS) {
      if (!result[emoji]) {
        result[emoji] = Math.max(1, Math.floor(rng() * base * 0.5) + 1);
        if (Object.keys(result).length >= 2) break;
      }
    }
  }

  return result;
}

function EmojiReactions({ eventId, guestCount }: { eventId: string; guestCount: number }) {
  const [reactions, setReactions] = useState<Record<string, number>>(() =>
    generateReactions(eventId, guestCount),
  );
  const [popping, setPopping] = useState<string | null>(null);

  const handleReact = (emoji: string) => {
    setReactions((prev) => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
    setPopping(emoji);
    setTimeout(() => setPopping(null), 400);
  };

  return (
    <div className="flex items-center gap-1 mt-2 flex-wrap">
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          className={`
            relative px-1.5 py-0.5 rounded-pill text-sm cursor-pointer
            transition-all duration-200 hover:scale-110 active:scale-95
            ${reactions[emoji] ? 'bg-blush-100' : 'hover:bg-blush-50'}
          `}
        >
          <span className={popping === emoji ? 'inline-block animate-bounce' : ''}>
            {emoji}
          </span>
          {reactions[emoji] ? (
            <span className="text-[10px] font-bold text-blush-500 ml-0.5">
              {reactions[emoji]}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

const VIEWER_TAG_OPTIONS = [
  { value: 'Family', label: 'Family' },
  { value: 'Friends', label: 'Friends' },
  { value: 'Work', label: 'Work' },
  { value: 'Neighbors', label: 'Neighbors' },
];

const VIEWER_SIDE_OPTIONS = [
  { value: 'bride', label: "Bride's Side" },
  { value: 'groom', label: "Groom's Side" },
  { value: 'mutual', label: 'Mutual' },
];

function ViewerRsvpForm({ weddingId, isPreview }: { weddingId: string; isPreview?: boolean }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(user?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [mapLink, setMapLink] = useState('');
  const [side, setSide] = useState('');
  const [tag, setTag] = useState('');
  const [totalPeople, setTotalPeople] = useState(1);

  const displayName = user?.user_metadata?.full_name || user?.email || 'Guest';

  useEffect(() => {
    if (isPreview) { setChecking(false); return; }
    if (!user?.id) { setChecking(false); return; }

    async function checkExisting() {
      const { data } = await supabase
        .from('invitees')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('created_by', user!.id)
        .eq('is_family_head', true)
        .limit(1)
        .maybeSingle();

      if (data) {
        setExistingId(data.id);
        setName(data.name);
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setMapLink(data.map_link || '');
        setSide(data.side || '');
        setTag(data.tags?.[0] || '');
        setTotalPeople(1 + (data.extra_members || 0));
        setSaved(true);
      }
      setChecking(false);
    }
    checkExisting();
  }, [user?.id, weddingId, isPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) return;
    if (!name.trim()) { setError('Your name is required'); return; }
    if (!address.trim() && !mapLink.trim()) {
      setError('Please provide either an address or a Google Maps link');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const inviteeData = {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        map_link: mapLink.trim() || null,
        side: (side || null) as 'bride' | 'groom' | 'mutual' | null,
        tags: tag ? [tag] : [],
        extra_members: Math.max(0, totalPeople - 1),
        rsvp_status: 'confirmed' as const,
      };

      if (existingId) {
        const { error: updateErr } = await supabase
          .from('invitees')
          .update(inviteeData)
          .eq('id', existingId);
        if (updateErr) throw updateErr;
      } else {
        const { data, error: insertErr } = await supabase
          .from('invitees')
          .insert({
            ...inviteeData,
            wedding_id: weddingId,
            priority: 'normal',
            visited: false,
            family_id: null,
            is_family_head: true,
            created_by: user?.id,
            created_by_name: displayName,
          })
          .select()
          .single();
        if (insertErr) throw insertErr;
        if (data) setExistingId(data.id);
      }

      setSaved(true);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit RSVP');
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  if (saved && !showForm) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-mint-100 rounded-full flex items-center justify-center">
              <Check size={20} className="text-mint-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-warm-700">RSVP Confirmed</p>
              <p className="text-xs text-warm-400">
                {name} {totalPeople > 1 ? `+ ${totalPeople - 1} (${totalPeople} total)` : ''}
              </p>
            </div>
          </div>
          {!isPreview && (
            <Button size="sm" variant="ghost" onClick={() => setShowForm(true)}>
              Edit RSVP
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-warm-700 flex items-center gap-2">
          <UserPlus size={22} />
          RSVP
        </h2>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            Confirm Attendance
          </Button>
        )}
      </div>

      {!showForm ? (
        <p className="text-sm text-warm-400">
          Let the couple know you're coming!
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Your Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 ..."
            />
            <Input
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Your area / address"
            />
          </div>

          <Input
            label="Google Maps Link"
            value={mapLink}
            onChange={(e) => setMapLink(e.target.value)}
            placeholder="Paste a Google Maps link (optional if address is filled)"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Side"
              value={side}
              onChange={(e) => setSide(e.target.value)}
              options={VIEWER_SIDE_OPTIONS}
              placeholder="Select side"
            />
            <Select
              label="Relationship"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              options={VIEWER_TAG_OPTIONS}
              placeholder="Select relationship"
            />
          </div>

          <div className="p-4 bg-blush-50 rounded-card">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-warm-600">
                Total people (including you):
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={totalPeople || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') { setTotalPeople(0); return; }
                  const num = parseInt(val);
                  if (!isNaN(num)) setTotalPeople(Math.min(20, Math.max(0, num)));
                }}
                onBlur={() => { if (totalPeople < 1) setTotalPeople(1); }}
                className="w-20 rounded-pill border border-blush-200 bg-white px-3 py-1.5 text-sm text-warm-700 text-center focus:outline-none focus:ring-2 focus:ring-blush-300"
              />
            </div>
            {totalPeople > 1 && (
              <p className="text-xs text-warm-400 mt-1">
                You + {totalPeople - 1} family member{totalPeople > 2 ? 's' : ''}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-sm">{error}</p>
          )}

          <div className="flex gap-3">
            <Button type="submit" size="lg" className="flex-1" loading={loading} disabled={isPreview}>
              {existingId ? 'Update RSVP' : `Confirm RSVP (${totalPeople})`}
            </Button>
            {showForm && existingId && (
              <Button type="button" variant="ghost" size="lg" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}
    </Card>
  );
}

interface ViewerPageProps {
  wedding: Wedding;
  isPreview?: boolean;
  onExitPreview?: () => void;
}

export function ViewerPage({ wedding, isPreview, onExitPreview }: ViewerPageProps) {
  const { signOut } = useAuth();
  const { dark, toggle } = useTheme();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [totalDays, setTotalDays] = useState(1);
  const [guestCount, setGuestCount] = useState(10);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('wedding_id', wedding.id)
        .order('day_number')
        .order('sort_order');
      if (data) {
        setEvents(data);
        const maxDay = data.reduce((m, e) => Math.max(m, e.day_number), 1);
        setTotalDays(maxDay);
      }

      const { count } = await supabase
        .from('invitees')
        .select('*', { count: 'exact', head: true })
        .eq('wedding_id', wedding.id);
      if (count) setGuestCount(count);
    }
    load();
  }, [wedding.id]);

  const weddingDate = wedding.wedding_date
    ? new Date(wedding.wedding_date + 'T00:00:00')
    : null;
  const daysUntil = weddingDate
    ? Math.ceil((weddingDate.getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-blush-50">
      {isPreview && (
        <div className="sticky top-0 z-50 bg-warm-700 text-white px-4 py-2 flex items-center justify-between text-sm">
          <span className="font-medium">Previewing as Viewer</span>
          <button
            onClick={onExitPreview}
            className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-pill text-xs font-semibold cursor-pointer transition-colors"
          >
            <X size={14} />
            Exit Preview
          </button>
        </div>
      )}

      {!isPreview && (
        <div className="flex justify-end gap-2 p-4">
          <button
            onClick={toggle}
            className="p-2 rounded-full hover:bg-blush-100 text-warm-400 transition-colors cursor-pointer"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={signOut}
            className="p-2 rounded-full hover:bg-red-50 text-warm-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            <LogOut size={18} />
          </button>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 pb-12 space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blush-200 rounded-full mb-4">
            <Heart size={28} className="text-blush-500" />
          </div>
          <h1 className="text-3xl font-bold text-warm-700">{wedding.name}</h1>
          {daysUntil !== null && daysUntil > 0 && (
            <p className="text-warm-400 mt-2">
              <span className="text-4xl font-bold text-blush-400">{daysUntil}</span>{' '}
              days to go
            </p>
          )}
          {weddingDate && (
            <p className="text-sm text-warm-400 mt-1">
              {weddingDate.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}

          <div className="flex justify-center gap-2 mt-4">
            {['💍', '💐', '🎊', '🥂', '✨'].map((emoji) => (
              <span key={emoji} className="text-2xl opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-default">
                {emoji}
              </span>
            ))}
          </div>
        </div>

        <ViewerRsvpForm weddingId={wedding.id} isPreview={isPreview} />

        <div id="viewer-schedule">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-warm-700 flex items-center gap-2">
              <CalendarDays size={22} />
              Schedule
            </h2>
            {events.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                icon={'share' in navigator ? <Share2 size={14} /> : <Download size={14} />}
                onClick={() => shareScheduleAsImage(wedding.name)}
              >
                {'share' in navigator ? 'Share' : 'Save Image'}
              </Button>
            )}
          </div>

          {events.length === 0 ? (
            <Card>
              <p className="text-center text-warm-400 py-8">
                No events scheduled yet.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                const dayEvents = events.filter((e) => e.day_number === day);
                if (dayEvents.length === 0) return null;
                return (
                  <div key={day}>
                    <h3 className="text-sm font-bold text-warm-500 mb-2">Day {day}</h3>
                    <div className="space-y-2">
                      {dayEvents.map((ev) => (
                        <Card key={ev.id} padding="sm">
                          <div className="flex items-start gap-3">
                            <div className="w-16 shrink-0 text-center">
                              <p className="text-sm font-bold text-blush-500">
                                {formatEventTime(ev.start_time)}
                              </p>
                              <p className="text-[10px] text-warm-300">
                                {formatEventTime(ev.end_time)}
                              </p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-warm-700">{ev.title}</p>
                              <div className="flex flex-wrap gap-3 mt-1 text-xs text-warm-400">
                                {ev.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin size={11} />
                                    {ev.location}
                                  </span>
                                )}
                                {ev.owner && (
                                  <span className="flex items-center gap-1">
                                    <UserCircle size={11} />
                                    {ev.owner}
                                  </span>
                                )}
                              </div>
                              <div className="emoji-reactions-hide">
                                <EmojiReactions eventId={ev.id} guestCount={guestCount} />
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!isPreview && (
          <p className="text-center text-xs text-warm-300 pb-8">
            <Badge variant="warm">Viewer</Badge>
            <span className="ml-2">You have view-only access to this wedding space.</span>
          </p>
        )}
      </div>
    </div>
  );
}
