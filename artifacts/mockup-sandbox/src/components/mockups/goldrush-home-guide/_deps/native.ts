// Runtime rendering is the real React Native Web renderer, not translated CSS.
// This thin, group-local typing boundary avoids importing the native app/types.
// @ts-ignore react-native-web ships JS; local types below cover the copied surface.
import * as Native from 'react-native-web';
import type React from 'react';

export type ViewStyle = Record<string, any>;
export type TextStyle = Record<string, any>;
export type StyleProp<T> = T | false | null | undefined | StyleProp<T>[];
export type ViewProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  [key: string]: any;
};
export type TextProps = ViewProps;
type PressableProps = Omit<ViewProps, 'style'> & {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean; hovered: boolean; focused: boolean }) => StyleProp<ViewStyle>);
};
export const View = Native.View as React.ComponentType<ViewProps>;
export const Text = Native.Text as React.ComponentType<TextProps>;
export const Pressable = Native.Pressable as React.ComponentType<PressableProps>;
export const ScrollView = Native.ScrollView as React.ComponentType<ViewProps>;
export const TextInput = Native.TextInput as React.ComponentType<ViewProps & { onChangeText?: (value: string) => void }>;
export const ActivityIndicator = Native.ActivityIndicator as React.ComponentType<ViewProps>;
export const Modal = Native.Modal as React.ComponentType<ViewProps>;
export const Animated = Native.Animated;
export const StyleSheet = Native.StyleSheet as {
  create: <T extends Record<string, ViewStyle>>(styles: T) => T;
  flatten: (style: StyleProp<ViewStyle>) => ViewStyle;
  absoluteFill: ViewStyle;
};
export const useWindowDimensions = Native.useWindowDimensions as () => { width: number; height: number; scale: number; fontScale: number };
export const Platform = { OS: 'web' } as const;
// Keep share/alert side effects local; no native sheets, clipboard or networking.
export const Share = { share: async (_data: { message: string }) => ({ action: 'dismissedAction' }) };
export const Alert = { alert: (_title: string, _message: string, _actions?: unknown[]) => {} };
