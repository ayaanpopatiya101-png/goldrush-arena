// Pure colour conversion helpers shared by the colour picker and paddle designer.
export interface HSV { h: number; s: number; v: number } // h 0..360, s/v 0..100

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function normalizeHex(input: string): string | null {
  let t = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(t)) t = t.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(t)) return null;
  return `#${t.toUpperCase()}`;
}

export function isValidHex(input: string): boolean {
  return normalizeHex(input) !== null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  const x = parseInt(n.slice(1), 16);
  return { r: (x >> 16) & 255, g: (x >> 8) & 255, b: x & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

/** Returns HSV; when the colour is grey/black, `fallbackHue` is kept so hue is not lost. */
export function hexToHsv(hex: string, fallbackHue = 0, fallbackSat = 0): HSV | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = fallbackHue;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
  }
  const s = max === 0 ? fallbackSat : (d / max) * 100;
  return { h, s, v: max * 100 };
}

export function hsvToHex({ h, s, v }: HSV): string {
  const S = clamp(s, 0, 100) / 100, V = clamp(v, 0, 100) / 100;
  const H = ((h % 360) + 360) % 360;
  const c = V * S, x = c * (1 - Math.abs(((H / 60) % 2) - 1)), m = V - c;
  let r = 0, g = 0, b = 0;
  if (H < 60) [r, g, b] = [c, x, 0];
  else if (H < 120) [r, g, b] = [x, c, 0];
  else if (H < 180) [r, g, b] = [0, c, x];
  else if (H < 240) [r, g, b] = [0, x, c];
  else if (H < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** Readable ink (dark or light) for text placed on `hex`. */
export function inkOn(hex: string, dark = '#252A2B', light = '#EEE9DE'): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return dark;
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum > 0.55 ? dark : light;
}

export { clamp };
