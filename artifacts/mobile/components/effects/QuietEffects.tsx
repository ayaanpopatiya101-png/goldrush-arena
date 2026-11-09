import React from "react";
import { View, type ViewProps } from "react-native";
import { Text } from "@/components/ui/Text";
import type { GlowTextProps } from "./GlowText";
import { palette } from "@/constants/colors";

export function GlowText({
  color = palette.foreground,
  glowColor: _glow,
  intensity: _intensity,
  pulse: _pulse,
  glitch: _glitch,
  ...props
}: GlowTextProps) {
  return <Text {...props} style={[props.style, { color }]} />;
}
type SurfaceProps = ViewProps & {
  borderRadius?: number;
  shimmerColor?: string;
  duration?: number;
  pauseBetween?: number;
  active?: boolean;
  disabled?: boolean;
  maxTilt?: number;
  rainbow?: boolean;
  color?: string;
  borderWidth?: number;
  pulse?: boolean;
  spread?: number;
};
export function ShimmerCard({
  borderRadius: _radius,
  shimmerColor: _shimmer,
  duration: _duration,
  pauseBetween: _pause,
  active: _active,
  disabled: _disabled,
  maxTilt: _tilt,
  rainbow: _rainbow,
  color: _color,
  borderWidth: _border,
  pulse: _pulse,
  spread: _spread,
  ...props
}: SurfaceProps) {
  return <View {...props} style={[props.style, { borderRadius: 2 }]} />;
}
export const HolographicShimmer = ShimmerCard;
export const HolographicCard = ShimmerCard;
export const GlowBorder = ShimmerCard;
export function FloatingOrbs(
  _props: React.ComponentProps<typeof import("./FloatingOrbs").FloatingOrbs>,
) {
  return null;
}
export function PulseRing(
  props: React.ComponentProps<typeof import("./PulseRing").PulseRing>,
) {
  return <>{props.children}</>;
}
export function ParticleField(
  _props: React.ComponentProps<typeof import("./ParticleField").ParticleField>,
) {
  return null;
}
export function ScanlineOverlay(
  _props: React.ComponentProps<
    typeof import("./ScanlineOverlay").ScanlineOverlay
  >,
) {
  return null;
}
