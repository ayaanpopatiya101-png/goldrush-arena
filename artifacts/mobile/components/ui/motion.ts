// Decorative looping animation is not allowed (visual rules + reduced motion).
// staticLoop replaces Animated.loop at decorative call sites: values hold their
// initial state and nothing repeats. Gameplay motion in GameArena is unaffected.
import type { Animated } from 'react-native';

export function staticLoop(_animation: Animated.CompositeAnimation, _config?: { iterations?: number; resetBeforeIteration?: boolean }): Animated.CompositeAnimation {
  return {
    start: () => { /* no decorative loop */ },
    stop: () => {},
    reset: () => {},
  };
}
