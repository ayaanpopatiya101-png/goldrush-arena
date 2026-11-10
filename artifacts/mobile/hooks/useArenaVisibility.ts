import { useEffect, useRef, useState } from 'react';
import { AppState, Dimensions, Platform, type View } from 'react-native';

/** Home demo only: focus is supplied by its route; visibility includes scroll and tab hiding. */
export function useArenaVisibility() {
  const ref = useRef<View>(null);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [visible, setVisible] = useState(Platform.OS !== 'web');
  useEffect(() => {
    const app = AppState.addEventListener('change', state => setForeground(state === 'active'));
    if (Platform.OS !== 'web') {
      const timer = setInterval(() => ref.current?.measureInWindow((_x, y, _width, height) => {
        setVisible(height > 0 && y < Dimensions.get('window').height - 84 && y + height > 0);
      }), 500);
      return () => { app.remove(); clearInterval(timer); };
    }
    const visibility = () => setForeground(document.visibilityState === 'visible');
    visibility();
    document.addEventListener('visibilitychange', visibility);
    // The fixed tab bar can cover a court which is technically in the viewport.
    const observer = new IntersectionObserver(entries => setVisible(entries[0]?.isIntersecting ?? false),
      { rootMargin: '0px 0px -84px 0px' });
    if (ref.current) observer.observe(ref.current as unknown as Element);
    return () => { app.remove(); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  return { ref, visible: foreground && visible };
}
