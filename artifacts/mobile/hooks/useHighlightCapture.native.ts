import { captureRef } from 'react-native-view-shot';
import { useClipCaptureBuffer } from './useClipCaptureBuffer';
export type { HighlightType } from '../store/highlightClip';

export function useHighlightCapture() {
  return useClipCaptureBuffer(async view => captureRef(view, {
    format: 'jpg', quality: 0.48, result: 'base64', width: 180, height: 180,
  }));
}
