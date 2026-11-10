import React, { forwardRef } from "react";
import { View, type ViewProps } from "react-native";
import type { LinearGradientProps } from "expo-linear-gradient";

/** Compatibility boundary while old screens migrate to explicit solid surfaces. */
export const LinearGradient = forwardRef<View, LinearGradientProps>(
  function FlatSurface(
    {
      colors,
      locations: _locations,
      start: _start,
      end: _end,
      dither: _dither,
      style,
      ...props
    },
    ref,
  ) {
    const fill =
      colors.find((color) => color !== "transparent") ?? "transparent";
    return (
      <View
        ref={ref}
        {...(props as ViewProps)}
        style={[{ backgroundColor: fill }, style]}
      />
    );
  },
);
