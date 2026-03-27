import { useEffect, useState } from 'react';
import type { PendingDelete } from '@/hooks/useUndoDelete';
import { Trash2, RotateCcw, X } from 'lucide-react';

interface UndoToastProps {
  pending: PendingDelete[];
  onUndo: (id: string) => void;
  onDismiss?: (id: string) => void;
  undoWindowMs: number;
}

function ToastItem({
  item,
  onUndo,
  onDismiss,
  undoWindowMs,
}: {
  item: PendingDelete;
  onUndo: (id: string) => void;
  onDismiss?: (id: string) => void;
  undoWindowMs: number;
}) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - item.startedAt;
      const remaining = Math.max(0, 100 - (elapsed / undoWindowMs) * 100);
      setProgress(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [item.startedAt, undoWindowMs]);

  return (
    <div className="flex items-center gap-3 bg-warm-700 text-white rounded-card px-4 py-3 shadow-lifted min-w-[280px] relative overflow-hidden">
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-blush-300 transition-all"
        style={{ width: `${progress}%` }}
      />

      <Trash2 size={16} className="text-blush-300 shrink-0" />
      <span className="text-sm font-medium flex-1 truncate">
        {item.label} deleted
      </span>
      <button
        onClick={() => onUndo(item.id)}
        className="flex items-center gap-1.5 px-3 py-1 bg-blush-300 text-warm-700 rounded-pill text-xs font-bold hover:bg-blush-200 transition-colors cursor-pointer shrink-0"
      >
        <RotateCcw size={12} />
        Undo
      </button>
      <button
        onClick={() => onDismiss?.(item.id)}
        className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function UndoToast({ pending, onUndo, onDismiss, undoWindowMs }: UndoToastProps) {
  if (pending.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center">
      {pending.map((item) => (
        <ToastItem
          key={item.id}
          item={item}
          onUndo={onUndo}
          onDismiss={onDismiss}
          undoWindowMs={undoWindowMs}
        />
      ))}
    </div>
  );
}
