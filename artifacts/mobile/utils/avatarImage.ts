// Photo avatar helpers: picking, validation, square crop, and direct upload.
// Nothing here logs request headers or tokens.
import { Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_MAX_PIXELS = 16_000_000;
export const AVATAR_OUTPUT = 512;
export type AvatarMime = 'image/jpeg' | 'image/png' | 'image/webp';
const ALLOWED: AvatarMime[] = ['image/jpeg', 'image/png', 'image/webp'];

export interface PickedPhoto { uri: string; width: number; height: number; mime: AvatarMime; size: number }
export type PickOutcome =
  | { kind: 'picked'; photo: PickedPhoto }
  | { kind: 'cancelled' }
  | { kind: 'denied'; canAskAgain: boolean }
  | { kind: 'invalid'; message: string };

export interface CropRect { originX: number; originY: number; width: number; height: number }

function mimeFrom(asset: ImagePicker.ImagePickerAsset): string | null {
  const m = asset.mimeType?.toLowerCase();
  if (m) return m === 'image/jpg' ? 'image/jpeg' : m;
  const data = /^data:([^;,]+)/.exec(asset.uri);
  if (data) return data[1].toLowerCase();
  const ext = /\.([a-z0-9]+)(?:\?|$)/i.exec(asset.fileName ?? asset.uri)?.[1]?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return null;
}

async function sizeOf(asset: ImagePicker.ImagePickerAsset): Promise<number | null> {
  if (typeof asset.fileSize === 'number' && asset.fileSize > 0) return asset.fileSize;
  if (Platform.OS === 'web') {
    if (asset.file) return asset.file.size;
    try { return (await (await fetch(asset.uri)).blob()).size; } catch { return null; }
  }
  try {
    const { File } = await import('expo-file-system');
    return new File(asset.uri).size;
  } catch { return null; }
}

export async function pickAvatarPhoto(): Promise<PickOutcome> {
  // Android uses the system photo picker, which grants access to the chosen
  // image without broad media-library permission (intentionally not declared).
  if (Platform.OS === 'ios') {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    let perm = current;
    if (!current.granted && current.canAskAgain) perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted && perm.accessPrivileges !== 'limited') return { kind: 'denied', canAskAgain: perm.canAskAgain };
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsEditing: false, quality: 1, exif: false, base64: false, selectionLimit: 1,
  });
  if (res.canceled || !res.assets?.length) return { kind: 'cancelled' };
  const asset = res.assets[0];
  const mime = mimeFrom(asset);
  if (!mime || !ALLOWED.includes(mime as AvatarMime)) {
    return { kind: 'invalid', message: 'Choose a JPEG, PNG or WebP photo. HEIC/HEIF is supported only when your photo library converts it to one of these formats; otherwise export a JPEG first. SVG, documents and animated formats are not supported.' };
  }
  const size = await sizeOf(asset);
  if (size == null) return { kind: 'invalid', message: 'The photo size could not be read. Try a different photo.' };
  if (size > AVATAR_MAX_BYTES) return { kind: 'invalid', message: `That photo is ${(size / 1048576).toFixed(1)} MB. The limit is 5 MB.` };
  if (!asset.width || !asset.height) return { kind: 'invalid', message: 'The photo dimensions could not be read. Try a different photo.' };
  if (asset.width * asset.height > AVATAR_MAX_PIXELS) {
    return { kind: 'invalid', message: `That photo is ${asset.width} x ${asset.height}. The limit is 16 megapixels.` };
  }
  // Do not trust a file extension or picker-provided dimensions alone. Decode
  // locally before exposing the crop editor; the server validates again on save.
  try {
    const decoded = await ImageManipulator.manipulate(asset.uri).renderAsync();
    if (!decoded.width || !decoded.height || decoded.width * decoded.height > AVATAR_MAX_PIXELS) {
      return { kind: 'invalid', message: 'The decoded photo exceeds the 16 megapixel limit.' };
    }
    return { kind: 'picked', photo: { uri: asset.uri, width: decoded.width, height: decoded.height, mime: mime as AvatarMime, size } };
  } catch {
    return { kind: 'invalid', message: 'This image could not be decoded. Choose a different JPEG, PNG or WebP photo.' };
  }
}

export async function openAppSettings() {
  if (Platform.OS === 'web') return;
  await Linking.openSettings();
}

/** Real square crop + resize to 512 JPEG. Re-encoding drops EXIF/location metadata. */
export async function renderSquareCrop(uri: string, rect: CropRect): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.crop({
    originX: Math.max(0, Math.round(rect.originX)), originY: Math.max(0, Math.round(rect.originY)),
    width: Math.max(1, Math.round(rect.width)), height: Math.max(1, Math.round(rect.height)),
  });
  ctx.resize({ width: AVATAR_OUTPUT, height: AVATAR_OUTPUT });
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.86 });
  return out.uri;
}

/** Reads the cropped JPEG as bytes for the authenticated, size-limited PUT. */
export async function readCroppedBody(uri: string): Promise<{ size: number; send: (url: string, options: RequestInit) => Promise<void> }> {
  if (Platform.OS === 'web') {
    const r = await fetch(uri);
    if (!r.ok) throw new Error('The cropped photo could not be read.');
    const blob = await r.blob();
    return {
      size: blob.size,
      send: async (url, options) => {
        const put = await fetch(url, { ...options, method: 'PUT', headers: { ...options.headers, 'Content-Type': 'image/jpeg' }, body: blob });
        if (!put.ok) throw new Error(`Upload failed (${put.status}).`);
      },
    };
  }
  const { File } = await import('expo-file-system');
  const { fetch: expoFetch } = await import('expo/fetch');
  const file = new File(uri);
  const bytes = await file.bytes();
  return {
    size: bytes.byteLength,
    send: async (url, options) => {
      const put = await expoFetch(url, { method: 'PUT', signal:options.signal ?? undefined, headers: { ...options.headers, 'Content-Type': 'image/jpeg' }, body: bytes });
      if (!put.ok) throw new Error(`Upload failed (${put.status}).`);
    },
  };
}

export function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The photo could not be read.'));
    reader.readAsDataURL(blob);
  });
}

export function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
