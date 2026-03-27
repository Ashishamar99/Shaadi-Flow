import * as XLSX from 'xlsx';
import type { Invitee, TimelineEvent } from '@/types';

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}.csv`);
}

export function exportToXLSX(data: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function inviteesToExportData(invitees: Invitee[]): Record<string, unknown>[] {
  return invitees.map((inv) => ({
    Name: inv.name,
    Address: inv.address ?? '',
    'Map Link': inv.map_link ?? '',
    Phone: inv.phone ?? '',
    Side: inv.side ?? '',
    Priority: inv.priority,
    Visited: inv.visited ? 'Yes' : 'No',
    'RSVP Status': inv.rsvp_status,
    Tags: inv.tags?.join(', ') ?? '',
    Notes: inv.notes ?? '',
  }));
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

export function eventsToExportData(events: TimelineEvent[]): Record<string, unknown>[] {
  return events.map((ev) => ({
    'Day': ev.day_number,
    'Title': ev.title,
    'Start Time': formatEventTime(ev.start_time),
    'End Time': formatEventTime(ev.end_time),
    'Location': ev.location ?? '',
    'Owner': ev.owner ?? '',
  }));
}

export async function exportElementAsImage(
  elementId: string,
  filename: string,
) {
  const { toPng } = await import('html-to-image');
  const el = document.getElementById(elementId);
  if (!el) return;

  const dataUrl = await toPng(el, { quality: 0.95 });
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}
