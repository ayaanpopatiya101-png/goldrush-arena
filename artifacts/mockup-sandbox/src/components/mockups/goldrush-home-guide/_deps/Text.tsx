import React, { forwardRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text as NativeText,
  type TextProps,
} from "./native";
import { Feather } from "./icons";

import { cleanCopy } from "./displayCopy";
import { palette } from "./colors";
const symbols: [RegExp, React.ComponentProps<typeof Feather>["name"]][] = [
  [/🏆|🥇|👑/, "award"],
  [/🪙|💰|💎/, "disc"],
  [/⚡|🔥/, "zap"],
  [/🛡|❤️|♥/, "shield"],
  [/🎮|🏓|⚔/, "target"],
  [/🔒|🔐/, "lock"],
  [/🎁|📦/, "package"],
  [/⏱|⌛/, "clock"],
  [/🎯|🏹/, "crosshair"],
];

/** One text boundary also handles avatars saved by older versions of the game. */
export const Text = forwardRef<any, TextProps>(function Text(
  { children, style, ...props },
  ref,
) {
  const flat = StyleSheet.flatten(style) ?? {};
  const render = (child: React.ReactNode): React.ReactNode => {
    if (typeof child !== "string") return child;
    const clean = cleanCopy(child);
    if (/\p{Extended_Pictographic}/u.test(child) && !clean.trim()) {
      const name =
        symbols.find(([pattern]) => pattern.test(child))?.[1] ?? "hexagon";
      return (
        <Feather
          name={name}
          size={Math.min(flat.fontSize ?? 18, 32)}
          color={flat.color ?? palette.slate}
        />
      );
    }
    return clean;
  };
  return (
    <NativeText
      ref={ref}
      {...props}
      style={[
        {
          color: palette.charcoal,
          fontFamily: "SourceSans3_400Regular",
        },
        style,
      ]}
    >
      {React.Children.map(children, render)}
    </NativeText>
  );
});

export const AnimatedText = Animated.createAnimatedComponent(Text);
