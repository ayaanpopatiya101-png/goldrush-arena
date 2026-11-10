import { toJpeg } from 'html-to-image';
import { useClipCaptureBuffer } from './useClipCaptureBuffer';
export type { HighlightType } from '../store/highlightClip';

export function useHighlightCapture() {
  return useClipCaptureBuffer(async view => {
    if (document.visibilityState !== 'visible') throw new Error('Recording paused');
    const uri = await toJpeg(view.current as unknown as HTMLElement, {
      quality: 0.48, canvasWidth: 180, canvasHeight: 180,
      pixelRatio: 1, skipFonts: true, backgroundColor: '#101410',
    });
    return uri.split(',')[1];
  });
}
