/**
 * Web stub — highlight capture requires react-native-view-shot (native only).
 * Metro picks `useHighlightCapture.native.ts` on iOS/Android and this file on web.
 */
import { RefObject } from 'react';
import { View } from 'react-native';

export type HighlightType = 'multi_block' | 'near_death' | 'hot_streak' | 'manual';

export function useHighlightCapture() {
  return {
    startCapture:     (_ref: RefObject<View>) => {},
    triggerHighlight: (_type: HighlightType) => {},
    snapshotClip:     (): null => null,
    stopAndGetClip:   (): null => null,
    isCapturing:      (): boolean => false,
  };
}
