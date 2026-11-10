// Browser implementation. Native media APIs live only in the .native module.
import { WEB_PHOTOS_HELP } from './clipExportRules';
export { WEB_PHOTOS_HELP, exportErrorMessage } from './clipExportRules';

export async function exportClip(base64: string, action: 'share' | 'download' | 'photos'): Promise<string> {
  const binary = atob(base64);
  if (!binary.startsWith('GIF89a') || binary.charCodeAt(binary.length - 1) !== 0x3b) throw new Error('Invalid GIF');
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const file = new File([bytes], 'goldrush-highlight.gif', { type: 'image/gif' });
  if (action === 'share' && navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: 'GoldRush highlight GIF' });
      return 'Share sheet closed. This does not confirm a social post or a Photos save.';
    } catch (error) {
      if ((error as Error).name === 'AbortError') return 'Sharing cancelled. Nothing was confirmed saved or posted.';
      throw error;
    }
  }
  if (action === 'photos') throw new Error('Use Download GIF in this browser');
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return `GIF download requested${action === 'share' ? ' because file sharing is unavailable' : ''}. Check Downloads; this is not a Photos save. ${WEB_PHOTOS_HELP}`;
}
