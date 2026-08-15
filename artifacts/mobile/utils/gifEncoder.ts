/**
 * Pure-JS GIF89a encoder for highlight clips.
 *
 * Pipeline:
 *   base64 JPEG frames  →  JPEG decode (jpeg-js)
 *   →  R3G3B2 colour quantisation  →  GIF LZW  →  GIF89a Uint8Array
 *
 * No native modules required — runs entirely on the React Native JS thread.
 */

import jpeg from 'jpeg-js';

// ── Colour palette: R=3bits, G=3bits, B=2bits → 256 unique colours ──────────
const PALETTE: Uint8Array = (() => {
  const p = new Uint8Array(768);
  for (let i = 0; i < 256; i++) {
    p[i * 3]     = Math.round(((i >> 5) & 7) * 255 / 7);
    p[i * 3 + 1] = Math.round(((i >> 2) & 7) * 255 / 7);
    p[i * 3 + 2] = Math.round( (i & 3)        * 255 / 3);
  }
  return p;
})();

function quantizePixel(r: number, g: number, b: number): number {
  return ((Math.round(r * 7 / 255) & 7) << 5) |
         ((Math.round(g * 7 / 255) & 7) << 2) |
          (Math.round(b * 3 / 255) & 3);
}

// ── GIF LZW encoder ──────────────────────────────────────────────────────────
function lzwEncode(indices: Uint8Array): number[] {
  const CLEAR = 256, EOF = 257;
  let codeSize = 9, nextCode = 258, maxCode = 511;
  const output: number[] = [];
  const table = new Map<number, number>();
  let acc = 0, bits = 0;

  const emit = (code: number) => {
    acc |= code << bits;
    bits += codeSize;
    while (bits >= 8) { output.push(acc & 0xFF); acc >>>= 8; bits -= 8; }
  };
  const reset = () => { table.clear(); codeSize = 9; nextCode = 258; maxCode = 511; };

  emit(CLEAR);
  reset();

  let w = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k   = indices[i];
    const key = w * 256 + k;            // w ≤ 4095, k ≤ 255 → no integer-precision issue
    if (table.has(key)) {
      w = table.get(key)!;
    } else {
      emit(w);
      if (nextCode < 4096) {
        table.set(key, nextCode++);
        if (nextCode > maxCode && codeSize < 12) { codeSize++; maxCode = (1 << codeSize) - 1; }
      } else {
        emit(CLEAR); reset();
      }
      w = k;
    }
  }
  emit(w);
  emit(EOF);
  if (bits > 0) output.push(acc & 0xFF);
  return output;
}

// ── GIF assembler ─────────────────────────────────────────────────────────────
/**
 * Encode RGBA frames to a GIF89a binary.
 * @param frames   Flat RGBA arrays (Uint8ClampedArray), all the same width × height.
 * @param width    Frame width in pixels.
 * @param height   Frame height in pixels.
 * @param delayCs  Frame delay in 1/100-second units (25 = 4 fps).
 */
export function encodeGIF(
  frames: Uint8ClampedArray[],
  width: number,
  height: number,
  delayCs: number,
): Uint8Array {
  const bytes: number[] = [];
  const push    = (...vals: number[]) => vals.forEach(v => bytes.push(v & 0xFF));
  const pushLE  = (val: number, n: number) => { for (let i = 0; i < n; i++) bytes.push((val >> (i * 8)) & 0xFF); };
  const pushStr = (s: string) => { for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i)); };

  // Header
  pushStr('GIF89a');
  pushLE(width, 2); pushLE(height, 2);
  push(0xF7, 0x00, 0x00);              // Global CT flag (256 colours), BG=0, aspect=0
  for (let i = 0; i < 768; i++) bytes.push(PALETTE[i]);

  // Netscape Application Extension — loop forever
  push(0x21, 0xFF, 0x0B);
  pushStr('NETSCAPE2.0');
  push(0x03, 0x01, 0x00, 0x00, 0x00);

  for (const frame of frames) {
    // R3G3B2 colour quantisation
    const pixels  = width * height;
    const indices = new Uint8Array(pixels);
    for (let p = 0; p < pixels; p++) {
      indices[p] = quantizePixel(frame[p * 4], frame[p * 4 + 1], frame[p * 4 + 2]);
    }

    const compressed = lzwEncode(indices);

    // Graphic Control Extension
    push(0x21, 0xF9, 0x04);
    push(0x04);                         // Disposal: Do Not Dispose; no transparency
    pushLE(delayCs, 2);
    push(0x00, 0x00);

    // Image Descriptor
    push(0x2C, 0x00, 0x00, 0x00, 0x00);
    pushLE(width, 2); pushLE(height, 2);
    push(0x00);                         // Use global CT

    // LZW image data (max 255 bytes per sub-block)
    push(0x08);
    let ci = 0;
    while (ci < compressed.length) {
      const blockLen = Math.min(255, compressed.length - ci);
      bytes.push(blockLen);
      for (let j = 0; j < blockLen; j++) bytes.push(compressed[ci + j]);
      ci += blockLen;
    }
    push(0x00);                         // Block terminator
  }

  push(0x3B);                           // GIF Trailer
  return new Uint8Array(bytes);
}

// ── JPEG → RGBA helper ────────────────────────────────────────────────────────
/**
 * Decode a base64-encoded JPEG string to a flat RGBA Uint8ClampedArray.
 * Uses jpeg-js (pure JS), so no native canvas or Buffer polyfill required.
 */
export function decodeJpegBase64(base64: string): Uint8ClampedArray {
  // atob is available in React Native ≥ 0.72 (RN 0.81 used here)
  const binaryStr = atob(base64);
  const inputBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) inputBytes[i] = binaryStr.charCodeAt(i);

  const decoded = jpeg.decode(inputBytes, { useTArray: true });
  return new Uint8ClampedArray(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength);
}

// ── High-level entry point ────────────────────────────────────────────────────
/**
 * Convert an array of base64 JPEG strings (from react-native-view-shot) to a
 * looping animated GIF89a Uint8Array ready to be written to the file system.
 */
export function createHighlightGIF(
  base64Frames: string[],
  width  = 200,
  height = 200,
  fps    = 4,
): Uint8Array {
  const delayCs   = Math.round(100 / fps);
  const rgbaFrames = base64Frames.map(decodeJpegBase64);
  return encodeGIF(rgbaFrames, width, height, delayCs);
}
