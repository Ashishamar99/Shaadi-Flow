import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { VendorAttachment } from '@/types';
import { Upload, FileText, Image as ImageIcon, Trash2, X, Download, Eye } from 'lucide-react';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(type: string | null): boolean {
  return !!type && type.startsWith('image/');
}

function isPdf(type: string | null): boolean {
  return type === 'application/pdf';
}

interface FileUploadProps {
  attachments: VendorAttachment[];
  onUpload: (file: File) => void;
  onDelete: (attachment: VendorAttachment) => void;
  getSignedUrl: (path: string) => Promise<string>;
  uploading?: boolean;
}

export function FileUpload({ attachments, onUpload, onDelete, getSignedUrl, uploading }: FileUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<VendorAttachment | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      onUpload(files[i]);
    }
  };

  const handlePreview = async (att: VendorAttachment) => {
    const url = await getSignedUrl(att.file_path);
    setPreviewUrl(url);
    setPreviewType(att.file_type);
    setPreviewName(att.file_name);
  };

  return (
    <div className="space-y-3">
      <div
        className="border-2 border-dashed border-blush-200 rounded-card p-6 text-center cursor-pointer hover:bg-blush-50 transition-colors"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files); }}
      >
        <Upload size={24} className="mx-auto text-blush-300 mb-2" />
        <p className="text-sm text-warm-500 font-medium">
          {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
        </p>
        <p className="text-xs text-warm-300 mt-1">PDF, images, documents (max 50MB)</p>
        <input
          ref={fileRef}
          type="file"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx"
        />
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-3 p-3 rounded-sm bg-blush-50 hover:bg-blush-100 transition-colors group"
            >
              <div className="w-8 h-8 rounded-sm bg-white flex items-center justify-center shrink-0">
                {isImage(att.file_type) ? (
                  <ImageIcon size={16} className="text-blush-400" />
                ) : (
                  <FileText size={16} className="text-warm-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-warm-700 truncate">{att.file_name}</p>
                <p className="text-xs text-warm-400">{formatFileSize(att.file_size)}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handlePreview(att)}
                  className="p-1.5 rounded-full hover:bg-white text-warm-400 hover:text-warm-600 cursor-pointer transition-colors"
                  title="Preview"
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={async () => {
                    const url = await getSignedUrl(att.file_path);
                    window.open(url, '_blank');
                  }}
                  className="p-1.5 rounded-full hover:bg-white text-warm-400 hover:text-warm-600 cursor-pointer transition-colors"
                  title="Download"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => setDeleteTarget(att)}
                  className="p-1.5 rounded-full hover:bg-red-50 text-warm-400 hover:text-red-500 cursor-pointer transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* In-app preview overlay */}
      {previewUrl && (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-card shadow-lifted max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-blush-100">
              <p className="text-sm font-semibold text-warm-700 truncate">{previewName}</p>
              <button
                onClick={() => { setPreviewUrl(null); setPreviewType(null); }}
                className="p-1.5 rounded-full hover:bg-blush-100 text-warm-400 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-56px)]">
              {isPdf(previewType) ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[80vh] border-0"
                  title={previewName}
                />
              ) : isImage(previewType) ? (
                <img
                  src={previewUrl}
                  alt={previewName}
                  className="max-w-full mx-auto"
                />
              ) : (
                <div className="p-8 text-center">
                  <FileText size={48} className="mx-auto text-warm-300 mb-4" />
                  <p className="text-warm-500 mb-4">Preview not available for this file type.</p>
                  <Button onClick={() => window.open(previewUrl!, '_blank')}>
                    Download File
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget);
          setDeleteTarget(null);
        }}
        title="Delete File"
        message={`Delete "${deleteTarget?.file_name}"? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
