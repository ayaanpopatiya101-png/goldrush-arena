import { useEffect } from 'react';
let shown = false;
export function cinemaHasShown() { return shown; }
export function CinematicSplash({ onDone }: { onDone: () => void }) {
  useEffect(() => { shown = true; onDone(); }, [onDone]);
  return null;
}
