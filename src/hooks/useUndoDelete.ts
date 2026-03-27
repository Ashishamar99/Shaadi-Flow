import { useState, useCallback, useRef } from 'react';

export interface PendingDelete {
  id: string;
  label: string;
  onConfirm: () => void;
  timeoutId?: ReturnType<typeof setTimeout>;
  startedAt: number;
}

const UNDO_WINDOW_MS = 5000;

export function useUndoDelete() {
  const [pending, setPending] = useState<PendingDelete[]>([]);
  const pendingRef = useRef<PendingDelete[]>([]);

  const scheduleDelete = useCallback((label: string, onConfirm: () => void): string => {
    const id = crypto.randomUUID();

    const timeoutId = setTimeout(() => {
      onConfirm();
      setPending((prev) => prev.filter((p) => p.id !== id));
      pendingRef.current = pendingRef.current.filter((p) => p.id !== id);
    }, UNDO_WINDOW_MS);

    const entry: PendingDelete = { id, label, onConfirm, timeoutId, startedAt: Date.now() };
    pendingRef.current = [...pendingRef.current, entry];
    setPending([...pendingRef.current]);

    return id;
  }, []);

  const undo = useCallback((id: string) => {
    const entry = pendingRef.current.find((p) => p.id === id);
    if (entry?.timeoutId) clearTimeout(entry.timeoutId);
    pendingRef.current = pendingRef.current.filter((p) => p.id !== id);
    setPending([...pendingRef.current]);
  }, []);

  const undoWindowMs = UNDO_WINDOW_MS;

  return { pending, scheduleDelete, undo, undoWindowMs };
}
