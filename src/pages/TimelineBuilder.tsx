import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTimeline } from '@/hooks/useTimeline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { exportElementAsImage, exportToCSV, eventsToExportData } from '@/lib/export';
import type { Wedding, TimelineEvent } from '@/types';
import type { User } from '@supabase/supabase-js';
import {
  Plus,
  CalendarDays,
  GripVertical,
  Edit3,
  Trash2,
  Download,
  Image,
  Clock,
  MapPin,
  UserCircle,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

function isUrl(str: string): boolean {
  return /^https?:\/\//i.test(str) || str.includes('maps.google') || str.includes('goo.gl') || str.includes('maps.app');
}

function formatEventTime(timeStr: string): string {
  const match = timeStr.match(/T(\d{2}):(\d{2})/);
  if (!match) return timeStr;
  const h = parseInt(match[1]);
  const m = match[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12.toString().padStart(2, '0')}:${m} ${ampm}`;
}

function SortableEventBlock({
  event,
  onEdit,
  onDelete,
  hasConflict,
  canDelete = true,
}: {
  event: TimelineEvent;
  onEdit: () => void;
  onDelete: () => void;
  hasConflict: boolean;
  canDelete?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const startTime = formatEventTime(event.start_time);
  const endTime = formatEventTime(event.end_time);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-stretch gap-0 rounded-sm bg-white border-2 transition-all
        hover:shadow-soft group
        ${hasConflict ? 'border-red-300 bg-red-50/50' : 'border-blush-100'}
      `}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center px-2 cursor-grab active:cursor-grabbing text-warm-300 hover:text-warm-500"
      >
        <GripVertical size={16} />
      </div>

      <div className="flex-1 py-3 pr-3 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-bold text-warm-700 truncate">
            {event.title}
          </h4>
          {hasConflict && (
            <AlertTriangle size={14} className="text-red-500 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-warm-400">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {startTime} - {endTime}
          </span>
          {event.location && (
            isUrl(event.location) ? (
              <a
                href={event.location.startsWith('http') ? event.location : `https://${event.location}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blush-500 hover:text-blush-600 truncate"
                onClick={(e) => e.stopPropagation()}
              >
                <MapPin size={12} />
                Location
                <ExternalLink size={10} />
              </a>
            ) : (
              <span className="flex items-center gap-1 truncate">
                <MapPin size={12} />
                {event.location}
              </span>
            )
          )}
          {event.owner && (
            <span className="flex items-center gap-1 truncate">
              <UserCircle size={12} />
              {event.owner}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-full hover:bg-blush-100 text-warm-400 hover:text-warm-600 transition-colors cursor-pointer"
        >
          <Edit3 size={14} />
        </button>
        {canDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-full hover:bg-red-50 text-warm-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function EventForm({
  open,
  onClose,
  onSubmit,
  initialData,
  dayNumber,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<TimelineEvent>) => void;
  initialData?: TimelineEvent | null;
  dayNumber: number;
  loading?: boolean;
}) {
  const [form, setForm] = useState(() => {
    const extractTime = (str: string) => {
      const match = str.match(/T(\d{2}:\d{2})/);
      return match ? match[1] : '09:00';
    };
    return {
      title: initialData?.title ?? '',
      start_time: initialData ? extractTime(initialData.start_time) : '09:00',
      end_time: initialData ? extractTime(initialData.end_time) : '10:00',
      location: initialData?.location ?? '',
      owner: initialData?.owner ?? '',
    };
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }

    const [sh, sm] = form.start_time.split(':').map(Number);
    const [eh, em] = form.end_time.split(':').map(Number);
    const startSnapped = Math.round(sm / 15) * 15;
    const endSnapped = Math.round(em / 15) * 15;

    const startMinutes = sh * 60 + startSnapped;
    const endMinutes = eh * 60 + endSnapped;

    if (endMinutes <= startMinutes) {
      setError('End time must be after start time');
      return;
    }

    // Store as fixed UTC strings -- the HH:MM is the intended display time
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dayPad = Math.abs(dayNumber).toString().padStart(2, '0');
    const startStr = `2025-01-${dayPad}T${pad(sh)}:${pad(startSnapped)}:00+00:00`;
    const endStr = `2025-01-${dayPad}T${pad(eh)}:${pad(endSnapped)}:00+00:00`;

    onSubmit({
      title: form.title.trim(),
      start_time: startStr,
      end_time: endStr,
      location: form.location.trim() || null,
      owner: form.owner.trim() || null,
      day_number: dayNumber,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? 'Edit Event' : 'Add Event'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Event Title *"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g., Mehendi Ceremony"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Time"
            type="time"
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
          />
          <Input
            label="End Time"
            type="time"
            value={form.end_time}
            onChange={(e) => setForm({ ...form, end_time: e.target.value })}
          />
        </div>
        <Input
          label="Location"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="e.g., Grand Ballroom"
        />
        <Input
          label="Responsible Person"
          value={form.owner}
          onChange={(e) => setForm({ ...form, owner: e.target.value })}
          placeholder="e.g., Rahul"
        />

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-sm">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {initialData ? 'Save Changes' : 'Add Event'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function TimelineBuilderPage() {
  const { wedding, canDelete } = useOutletContext<{ wedding: Wedding | null; user: User | null; canDelete: boolean }>();
  const { events, isLoading, addEvent, updateEvent, deleteEvent, reorderEvents } =
    useTimeline(wedding?.id);

  const [totalDays, setTotalDays] = useState(3);
  const [preDays, setPreDays] = useState(0);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [activeDay, setActiveDay] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const allDayNumbers = useMemo(() => {
    const days: number[] = [];
    for (let d = -preDays; d <= 0; d++) if (preDays > 0) days.push(d);
    for (let d = 1; d <= totalDays; d++) days.push(d);
    return days;
  }, [totalDays, preDays]);

  const eventsByDay = useMemo(() => {
    const grouped: Record<number, TimelineEvent[]> = {};
    for (const d of allDayNumbers) grouped[d] = [];
    events.forEach((ev) => {
      const day = ev.day_number;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(ev);
    });
    for (const day in grouped) {
      grouped[day].sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      });
    }
    return grouped;
  }, [events, allDayNumbers]);

  const conflicts = useMemo(() => {
    const conflictIds = new Set<string>();
    const dayEvents = eventsByDay[activeDay] ?? [];
    for (let i = 0; i < dayEvents.length; i++) {
      for (let j = i + 1; j < dayEvents.length; j++) {
        const a = dayEvents[i];
        const b = dayEvents[j];
        const aStart = new Date(a.start_time).getTime();
        const aEnd = new Date(a.end_time).getTime();
        const bStart = new Date(b.start_time).getTime();
        const bEnd = new Date(b.end_time).getTime();
        if (aStart < bEnd && bStart < aEnd) {
          conflictIds.add(a.id);
          conflictIds.add(b.id);
        }
      }
    }
    return conflictIds;
  }, [eventsByDay, activeDay]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const dayEvents = [...(eventsByDay[activeDay] ?? [])];
    const oldIdx = dayEvents.findIndex((e) => e.id === active.id);
    const newIdx = dayEvents.findIndex((e) => e.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const [moved] = dayEvents.splice(oldIdx, 1);
    dayEvents.splice(newIdx, 0, moved);

    const updates = dayEvents.map((e, i) => ({
      id: e.id,
      sort_order: i,
      day_number: activeDay,
    }));
    reorderEvents.mutate(updates);
  };

  const handleAddEvent = (data: Partial<TimelineEvent>) => {
    const dayEvents = eventsByDay[activeDay] ?? [];
    addEvent.mutate(
      { ...data, sort_order: dayEvents.length },
      { onSuccess: () => setShowEventForm(false) },
    );
  };

  const handleEditEvent = (data: Partial<TimelineEvent>) => {
    if (!editingEvent) return;
    updateEvent.mutate(
      { id: editingEvent.id, ...data },
      { onSuccess: () => setEditingEvent(null) },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-blush-200 border-t-blush-400 rounded-full animate-spin" />
      </div>
    );
  }

  const currentDayEvents = eventsByDay[activeDay] ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-700">Timeline Builder</h1>
          <p className="text-sm text-warm-400 mt-1">
            Plan your wedding schedule day by day
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<Image size={16} />}
            onClick={() => exportElementAsImage('timeline-grid', 'wedding-timeline')}
            disabled={events.length === 0}
          >
            Export Image
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Download size={16} />}
            onClick={() =>
              exportToCSV(eventsToExportData(events), 'wedding-timeline')
            }
            disabled={events.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      <Card padding="sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-warm-600">Days:</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 7].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setTotalDays(n);
                    if (activeDay > n) setActiveDay(Math.min(activeDay, n));
                  }}
                  className={`
                    px-3 py-1.5 rounded-pill text-xs font-bold transition-all cursor-pointer
                    ${totalDays === n ? 'bg-blush-300 text-warm-700' : 'bg-blush-50 text-warm-400 hover:bg-blush-100'}
                  `}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-warm-600">Pre-days:</label>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setPreDays(n)}
                  className={`
                    px-3 py-1.5 rounded-pill text-xs font-bold transition-all cursor-pointer
                    ${preDays === n ? 'bg-mint-200 text-warm-700' : 'bg-blush-50 text-warm-400 hover:bg-blush-100'}
                  `}
                >
                  {n === 0 ? 'None' : `-${n}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 flex-wrap">
        {allDayNumbers.map((day) => {
          const label = day <= 0 ? `Day ${day}` : `Day ${day}`;
          const count = eventsByDay[day]?.length ?? 0;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`
                px-4 py-2 rounded-pill text-sm font-bold transition-all cursor-pointer
                ${
                  activeDay === day
                    ? day <= 0
                      ? 'bg-white text-mint-600 shadow-card ring-1 ring-mint-200'
                      : 'bg-white text-warm-700 shadow-card'
                    : day <= 0
                      ? 'bg-mint-50 text-mint-400 hover:bg-mint-100'
                      : 'bg-blush-50 text-warm-400 hover:bg-blush-100'
                }
              `}
            >
              {label}
              {count > 0 && (
                <Badge variant={day <= 0 ? 'mint' : 'blush'} className="ml-2">
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      <div id="timeline-grid">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-warm-700">
              {activeDay <= 0 ? `Day ${activeDay} (Pre-Event)` : `Day ${activeDay}`} Schedule
            </h2>
            <Button
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setShowEventForm(true)}
            >
              Add Event
            </Button>
          </div>

          {conflicts.size > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 mb-4 bg-red-50 rounded-sm text-sm text-red-600">
              <AlertTriangle size={16} />
              <span>
                {conflicts.size} events have time conflicts
              </span>
            </div>
          )}

          {currentDayEvents.length === 0 ? (
            <EmptyState
              icon={<CalendarDays size={48} />}
              title={`No events on Day ${activeDay}`}
              description="Add your first event to start building your schedule."
              actionLabel="Add Event"
              onAction={() => setShowEventForm(true)}
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={currentDayEvents.map((e) => e.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {currentDayEvents.map((event) => (
                    <SortableEventBlock
                      key={event.id}
                      event={event}
                      hasConflict={conflicts.has(event.id)}
                      onEdit={() => setEditingEvent(event)}
                      onDelete={() => setDeleteId(event.id)}
                      canDelete={canDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </Card>
      </div>

      <EventForm
        open={showEventForm}
        onClose={() => setShowEventForm(false)}
        onSubmit={handleAddEvent}
        dayNumber={activeDay}
        loading={addEvent.isPending}
      />

      {editingEvent && (
        <EventForm
          open
          onClose={() => setEditingEvent(null)}
          onSubmit={handleEditEvent}
          initialData={editingEvent}
          dayNumber={editingEvent.day_number}
          loading={updateEvent.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteEvent.mutate(deleteId);
          setDeleteId(null);
        }}
        title="Delete Event"
        message="Are you sure you want to remove this event?"
        confirmLabel="Delete"
      />
    </div>
  );
}
