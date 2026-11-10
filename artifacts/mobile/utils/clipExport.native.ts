import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { canSavePhotos } from './clipExportRules';
export { WEB_PHOTOS_HELP, exportErrorMessage } from './clipExportRules';

export async function exportClip(base64: string, action: 'share' | 'download' | 'photos'): Promise<string> {
  const binary = atob(base64);
  if (!binary.startsWith('GIF89a') || binary.charCodeAt(binary.length - 1) !== 0x3b) throw new Error('Invalid GIF');
  if (!FileSystem.cacheDirectory) throw new Error('Device cache storage unavailable');
  const path = `${FileSystem.cacheDirectory}goldrush-${Date.now()}-${Math.random().toString(36).slice(2)}.gif`;
  try {
    await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists || info.size !== binary.length) throw new Error('Incomplete GIF write');
    if (action === 'photos') {
      // SDK 54 requires legacy WRITE_EXTERNAL_STORAGE below Android 13.
      // Neither platform needs permission to read existing photos.
      if (Platform.OS === 'ios' || Number(Platform.Version) < 33) {
        let permission = await MediaLibrary.getPermissionsAsync(true, []);
        if (!canSavePhotos(permission) && permission.canAskAgain) {
          permission = await MediaLibrary.requestPermissionsAsync(true, []);
        }
        if (!canSavePhotos(permission)) throw new Error('Photos permission denied');
      }
      await MediaLibrary.saveToLibraryAsync(path);
      return 'GIF saved to Photos. Find it in Recents (or your Android gallery).';
    }
    if (!await Sharing.isAvailableAsync()) throw new Error('Sharing unavailable on this device');
    await Sharing.shareAsync(path, { mimeType: 'image/gif', UTI: 'com.compuserve.gif', dialogTitle: 'Share GoldRush GIF' });
    return 'Share sheet closed. This does not confirm a social post or a Photos save.';
  } finally {
    await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
  }
}
