import { useOutletContext, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import type { Wedding, Invitee, TimelineEvent } from '@/types';
import type { User } from '@supabase/supabase-js';
import {
  Users,
  MapPin,
  CalendarDays,
  CheckCircle2,
  Clock,
  UserPlus,
  Pencil,
} from 'lucide-react';

function formatEventTime(timeStr: string): string {
  const match = timeStr.match(/T(\d{2}):(\d{2})/);
  if (!match) return timeStr;
  const h = parseInt(match[1]);
  const m = match[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12.toString().padStart(2, '0')}:${m} ${ampm}`;
}

interface DashboardContext {
  wedding: Wedding | null;
  user: User | null;
  updateWedding: (updates: Partial<Wedding>) => Promise<void>;
}

export function DashboardPage() {
  const { wedding, user, updateWedding } = useOutletContext<DashboardContext>();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalGuests: 0,
    headcount: 0,
    confirmed: 0,
    visited: 0,
    pendingRsvp: 0,
    receptionCount: 0,
    muhurthamCount: 0,
  });
  const [upcomingEvents, setUpcomingEvents] = useState<TimelineEvent[]>([]);
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState('');

  useEffect(() => {
    if (!wedding) return;

    async function fetchStats() {
      const { data: invitees } = await supabase
        .from('invitees')
        .select('*')
        .eq('wedding_id', wedding!.id);

      if (invitees) {
        const headcount = invitees.reduce(
          (sum: number, i: Invitee) =>
            sum + 1 + (i.is_family_head ? (i.extra_members ?? 0) : 0),
          0,
        );
        const receptionHeads = invitees.filter(
          (i: Invitee) => i.attending_reception && (i.is_family_head || !i.family_id),
        );
        const receptionCount = receptionHeads.reduce(
          (s: number, i: Invitee) => s + 1 + (i.extra_members ?? 0), 0,
        );
        const muhurthamHeads = invitees.filter(
          (i: Invitee) => i.attending_muhurtham && (i.is_family_head || !i.family_id),
        );
        const muhurthamCount = muhurthamHeads.reduce(
          (s: number, i: Invitee) => s + 1 + (i.extra_members ?? 0), 0,
        );
        setStats({
          totalGuests: invitees.length,
          headcount,
          receptionCount,
          muhurthamCount,
          confirmed: invitees.filter(
            (i: Invitee) => i.rsvp_status === 'confirmed',
          ).length,
          visited: invitees.filter((i: Invitee) => i.visited).length,
          pendingRsvp: invitees.filter(
            (i: Invitee) => i.rsvp_status === 'pending',
          ).length,
        });
      }

      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('wedding_id', wedding!.id)
        .order('day_number', { ascending: true })
        .order('sort_order', { ascending: true })
        .limit(5);

      if (events) setUpcomingEvents(events);
    }

    fetchStats();
  }, [wedding]);

  const weddingDate = wedding?.wedding_date
    ? new Date(wedding.wedding_date + 'T00:00:00')
    : null;
  const daysUntil = weddingDate
    ? Math.ceil(
        (weddingDate.getTime() - new Date().setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const displayName =
    user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  const handleSaveDate = async () => {
    if (dateValue) {
      await updateWedding({ wedding_date: dateValue });
    }
    setEditingDate(false);
  };

  const statCards = [
    {
      label: 'Headcount',
      value: stats.headcount,
      icon: Users,
      color: 'text-blush-500',
      bg: 'bg-blush-100',
    },
    {
      label: 'RSVPs Confirmed',
      value: stats.confirmed,
      icon: CheckCircle2,
      color: 'text-mint-500',
      bg: 'bg-mint-100',
    },
    {
      label: 'Visited',
      value: stats.visited,
      icon: MapPin,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'Reception',
      value: stats.receptionCount,
      icon: CalendarDays,
      color: 'text-blush-500',
      bg: 'bg-blush-100',
    },
    {
      label: 'Muhurtham',
      value: stats.muhurthamCount,
      icon: CalendarDays,
      color: 'text-mint-500',
      bg: 'bg-mint-100',
    },
    {
      label: 'RSVP Pending',
      value: stats.pendingRsvp,
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card className="bg-gradient-to-r from-blush-200 via-blush-100 to-mint-100 border-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-warm-700 mb-1">
              Hi {displayName}, welcome back!
            </h1>
            {daysUntil !== null && daysUntil > 0 ? (
              <div className="flex items-center gap-2">
                <p className="text-warm-500">
                  <span className="text-3xl font-bold text-blush-500">
                    {daysUntil}
                  </span>{' '}
                  days until the big day
                </p>
                <button
                  onClick={() => {
                    setDateValue(wedding?.wedding_date ?? '');
                    setEditingDate(true);
                  }}
                  className="p-1 rounded-full hover:bg-white/50 text-warm-400 hover:text-warm-600 transition-colors cursor-pointer"
                >
                  <Pencil size={14} />
                </button>
              </div>
            ) : daysUntil !== null && daysUntil <= 0 ? (
              <p className="text-warm-500 font-semibold">
                The big day is here (or already passed)! Congratulations!
              </p>
            ) : editingDate ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="rounded-pill border border-blush-200 bg-white px-4 py-1.5 text-sm text-warm-700 focus:outline-none focus:ring-2 focus:ring-blush-300"
                />
                <Button size="sm" onClick={handleSaveDate}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingDate(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setEditingDate(true)}
                className="text-warm-400 hover:text-blush-500 text-sm cursor-pointer hover:underline transition-colors"
              >
                Set your wedding date to see the countdown
              </button>
            )}
          </div>
          <div className="hidden md:block text-6xl opacity-40">💍</div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} hover>
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 ${stat.bg} rounded-sm flex items-center justify-center`}
              >
                <stat.icon size={22} className={stat.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-warm-700">{stat.value}</p>
                <p className="text-xs text-warm-400 font-medium">
                  {stat.label}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-bold text-warm-700 mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button
              icon={<UserPlus size={16} />}
              onClick={() => navigate('/invitees')}
            >
              Add Guest
            </Button>
            <Button
              variant="secondary"
              icon={<MapPin size={16} />}
              onClick={() => navigate('/routes')}
            >
              Plan Routes
            </Button>
            <Button
              variant="ghost"
              icon={<CalendarDays size={16} />}
              onClick={() => navigate('/timeline')}
            >
              View Timeline
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-warm-700 mb-4">
            Upcoming Events
          </h2>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-warm-300">
              No events yet. Head to the Timeline to create your schedule.
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 p-3 rounded-sm bg-blush-50"
                >
                  <div className="w-10 h-10 bg-mint-100 rounded-sm flex items-center justify-center text-sm font-bold text-mint-600">
                    D{ev.day_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-warm-700 truncate">
                      {ev.title}
                    </p>
                    <p className="text-xs text-warm-400">
                      {formatEventTime(ev.start_time)} - {formatEventTime(ev.end_time)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
