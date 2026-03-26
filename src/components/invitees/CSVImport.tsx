import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface CSVImportProps {
  open: boolean;
  onClose: () => void;
  onImport: (rows: Record<string, string>[]) => void;
}

export function CSVImport({ open, onClose, onImport }: CSVImportProps) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
          defval: '',
        });
        if (json.length === 0) {
          setError('File is empty');
          return;
        }
        setHeaders(Object.keys(json[0]));
        setRows(json);
      } catch {
        setError('Failed to parse file. Make sure it is a valid CSV or Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = () => {
    const mapped = rows.map((row) => {
      const normalized: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        const lower = key.toLowerCase().trim();
        if (lower === 'name') normalized.name = value;
        else if (lower === 'address' || lower === 'area')
          normalized.address = value;
        else if (lower.includes('map') || lower.includes('link'))
          normalized.map_link = value;
        else if (lower === 'phone' || lower === 'mobile')
          normalized.phone = value;
        else if (lower === 'side') normalized.side = value;
        else if (lower === 'priority') normalized.priority = value;
        else if (lower === 'notes') normalized.notes = value;
        else if (lower === 'tags') normalized.tags = value;
      }
      return normalized;
    });

    const valid = mapped.filter((r) => r.name);
    if (valid.length === 0) {
      setError('No rows with a "Name" column found');
      return;
    }

    onImport(valid);
    setRows([]);
    setHeaders([]);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Import Guests from CSV/Excel" size="lg">
      <div className="space-y-4">
        <div
          className="border-2 border-dashed border-blush-200 rounded-card p-8 text-center cursor-pointer hover:bg-blush-50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <FileSpreadsheet size={36} className="mx-auto text-blush-300 mb-3" />
          <p className="text-sm text-warm-500 font-medium">
            Click to upload CSV or Excel file
          </p>
          <p className="text-xs text-warm-300 mt-1">
            File should have columns: Name, Address, Map Link, Phone, Side, Priority
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFile}
            className="hidden"
          />
        </div>

        {rows.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-warm-600 mb-2">
              Preview ({rows.length} rows found)
            </p>
            <div className="overflow-x-auto max-h-64 rounded-sm border border-blush-100">
              <table className="w-full text-xs">
                <thead className="bg-blush-50 sticky top-0">
                  <tr>
                    {headers.map((h) => (
                      <th
                        key={h}
                        className="text-left px-3 py-2 font-semibold text-warm-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-blush-50">
                      {headers.map((h) => (
                        <td key={h} className="px-3 py-1.5 text-warm-600 max-w-[200px] truncate">
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 10 && (
                <p className="text-xs text-warm-300 text-center py-2">
                  ...and {rows.length - 10} more rows
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-sm">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={rows.length === 0}
            icon={<Upload size={16} />}
          >
            Import {rows.length > 0 ? `${rows.length} Guests` : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
