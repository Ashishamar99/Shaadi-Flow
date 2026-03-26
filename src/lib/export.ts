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

export function eventsToExportData(events: TimelineEvent[]): Record<string, unknown>[] {
  return events.map((ev) => ({
    'Day': ev.day_number,
    'Title': ev.title,
    'Start Time': new Date(ev.start_time).toLocaleTimeString(),
    'End Time': new Date(ev.end_time).toLocaleTimeString(),
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
