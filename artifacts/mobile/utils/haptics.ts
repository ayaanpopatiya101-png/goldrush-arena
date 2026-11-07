import * as NativeHaptics from 'expo-haptics';
import { Platform } from 'react-native';
import { getSettings } from '@/hooks/useSettings';

export const ImpactFeedbackStyle = NativeHaptics.ImpactFeedbackStyle;
export type ImpactFeedbackStyle = NativeHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = NativeHaptics.NotificationFeedbackType;
export type NotificationFeedbackType = NativeHaptics.NotificationFeedbackType;
const allowed = () => Platform.OS !== 'web' && getSettings().hapticsEnabled;
export async function impactAsync(style?: NativeHaptics.ImpactFeedbackStyle) {
  if (allowed()) await NativeHaptics.impactAsync(style).catch(() => {});
}
export async function notificationAsync(type?: NativeHaptics.NotificationFeedbackType) {
  if (allowed()) await NativeHaptics.notificationAsync(type).catch(() => {});
}
export async function selectionAsync() {
  if (allowed()) await NativeHaptics.selectionAsync().catch(() => {});
}
