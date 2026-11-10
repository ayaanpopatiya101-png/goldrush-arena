import { useEffect, useRef } from 'react';
import { Platform, type View } from 'react-native';
import { bindBrowserCourt } from '@/utils/browserCourt';

export function useBrowserCourt(enabled: boolean, move: (x: number, y: number) => void) {
  const ref = useRef<View>(null);
  const latest = useRef(move);
  latest.current = move;
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled || !ref.current) return;
    return bindBrowserCourt(ref.current as unknown as HTMLElement, (x, y) => latest.current(x, y));
  }, [enabled]);
  return ref;
}
