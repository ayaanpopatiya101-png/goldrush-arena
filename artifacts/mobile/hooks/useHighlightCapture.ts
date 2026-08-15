/**
 * Web stub — highlight capture requires react-native-view-shot which is a
 * native-only module.  Metro picks `useHighlightCapture.native.ts` on
 * iOS/Android and this file on web (no-ops so the rest of the code compiles).
 */
import { RefObject } from 'react';
import { View } from 'react-native';

export type HighlightType = 'multi_block' | 'near_death' | 'hot_streak';

export function useHighlightCapture() {
  return {
    startCapture:    (_ref: RefObject<View>) => {},
    triggerHighlight: (_type: HighlightType) => {},
    stopAndGetClip:  (): null => null,
  };
}
