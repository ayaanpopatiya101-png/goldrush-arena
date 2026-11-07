import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from 'react';

const OverlayContext = createContext<{
  first?: string;
  request: (id: string, active: boolean) => void;
} | null>(null);

/** Only the head of this app-wide queue may mount a blocking reward dialog. */
export function OverlayQueueProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<string[]>([]);
  const request = useCallback((id: string, active: boolean) => {
    setQueue(current => active
      ? current.includes(id) ? current : [...current, id]
      : current.includes(id) ? current.filter(value => value !== id) : current);
  }, []);
  const value = useMemo(() => ({ first: queue[0], request }), [queue, request]);
  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

export function useBlockingOverlay(wanted: boolean): boolean {
  const id = useId();
  const queue = useContext(OverlayContext);
  const request = queue?.request;
  useEffect(() => {
    request?.(id, wanted);
    return () => request?.(id, false);
  }, [id, wanted, request]);
  return wanted && queue?.first === id;
}
