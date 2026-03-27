import { useState, useCallback, useRef, useMemo } from 'react';

export interface PendingDelete {
  id: string;
  label: string;
  onConfirm: () => void;
  hiddenKey: string;
  timeoutId?: ReturnType<typeof setTimeout>;
  startedAt: number;
}

const UNDO_WINDOW_MS = 5000;

export function useUndoDelete() {
  const [pending, setPending] = useState<PendingDelete[]>([]);
  const pendingRef = useRef<PendingDelete[]>([]);

  const scheduleDelete = useCallback((
    label: string,
    onConfirm: () => void,
    hiddenKey?: string,
  ): string => {
    const id = crypto.randomUUID();
    const effectiveHiddenKey = hiddenKey ?? id;

    const timeoutId = setTimeout(() => {
      onConfirm();
      pendingRef.current = pendingRef.current.filter((p) => p.id !== id);
      setPending([...pendingRef.current]);
    }, UNDO_WINDOW_MS);

    const entry: PendingDelete = {
      id,
      label,
      onConfirm,
      hiddenKey: effectiveHiddenKey,
      timeoutId,
      startedAt: Date.now(),
    };
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

  const hiddenKeys = useMemo(
    () => new Set(pending.map((p) => p.hiddenKey)),
    [pending],
  );

  const undoWindowMs = UNDO_WINDOW_MS;

  return { pending, scheduleDelete, undo, undoWindowMs, hiddenKeys };
}
