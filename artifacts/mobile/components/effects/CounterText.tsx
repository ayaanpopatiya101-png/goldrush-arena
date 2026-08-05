/**
 * CounterText — animates a number from 0 (or previous value) to target.
 * Uses a requestAnimationFrame-driven counter with easing for smooth counting.
 * Works on web and native without Reanimated animatedProps complexity.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, TextProps } from 'react-native';

interface CounterTextProps extends TextProps {
  value: number;
  /** Seed the display counter at this value on first render instead of 0.
   *  Prevents a visible 0 → N animation when the component mounts or re-mounts
   *  mid-game (e.g. after a pause). */
  initialValue?: number;
  /** Format the number to string (default: toLocaleString) */
  format?: (n: number) => string;
  /** Animation duration ms */
  duration?: number;
  prefix?: string;
  suffix?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function CounterText({
  value,
  initialValue,
  format,
  duration = 1200,
  prefix = '',
  suffix = '',
  style,
  ...rest
}: CounterTextProps) {
  const [display, setDisplay] = useState(() => initialValue ?? 0);
  const startRef   = useRef<number | null>(null);
  const fromRef    = useRef(initialValue ?? 0);
  const rafRef     = useRef<number | null>(null);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;

    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(t);
      const current = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const text = prefix + (format ? format(Math.round(display)) : Math.round(display).toLocaleString()) + suffix;

  return <Text style={style} {...rest}>{text}</Text>;
}
