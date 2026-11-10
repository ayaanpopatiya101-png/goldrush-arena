export const WEB_PHOTOS_HELP = 'GIF export only, not MP4. On iPhone: download the GIF, open Files → Downloads, open the GIF, then Share → Save Image if offered. On Android: open Downloads and use your gallery’s import/save option. A website cannot write directly to Photos. Caption and sticker are library decorations, not burned into the exported GIF.';

export function exportErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/space|storage|disk|ENOSPC/i.test(message)) return 'Device storage may be full. Free some space, then retry. The save was not confirmed.';
  if (/permission|denied|access/i.test(message)) return 'Photos access was not allowed. Enable permission in device Settings, or use Share GIF instead.';
  return 'The export could not be confirmed. Try again, or use Share GIF. Your clip in My Clips has not been removed.';
}

export function canSavePhotos(permission: { granted: boolean; accessPrivileges?: string }): boolean {
  // Limited access still permits adding a new asset; never request full-library reads.
  return permission.granted || permission.accessPrivileges === 'limited';
}
