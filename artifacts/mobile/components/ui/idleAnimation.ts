import type { Animated } from "react-native";
/** Legacy decorative loops stay inert. Physics and event feedback are unaffected. */
export function idleAnimation(
  _animation: Animated.CompositeAnimation,
  _config?: unknown,
): Animated.CompositeAnimation {
  return { start: () => {}, stop: () => {}, reset: () => {} };
}
