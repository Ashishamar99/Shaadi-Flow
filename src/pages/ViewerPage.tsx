import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';
import type { Wedding, TimelineEvent } from '@/types';
import { CalendarDays, MapPin, UserCircle, Heart, Moon, Sun, LogOut } from 'lucide-react';

interface ViewerPageProps {
  wedding: Wedding;
}

export function ViewerPage({ wedding }: ViewerPageProps) {
  const { signOut } = useAuth();
  const { dark, toggle } = useTheme();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [totalDays, setTotalDays] = useState(1);

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
        </div>

        <div>
          <h2 className="text-xl font-bold text-warm-700 mb-4 flex items-center gap-2">
            <CalendarDays size={22} />
            Schedule
          </h2>

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
                                {new Date(ev.start_time).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              <p className="text-[10px] text-warm-300">
                                {new Date(ev.end_time).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
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

        <p className="text-center text-xs text-warm-300 pb-8">
          <Badge variant="warm">Viewer</Badge>
          <span className="ml-2">You have view-only access to this wedding space.</span>
        </p>
      </div>
    </div>
  );
}
