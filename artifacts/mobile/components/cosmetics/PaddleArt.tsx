// Renders catalog paddle artwork with bounded native SVG primitives only.
// No user/remote SVG strings are ever parsed. Purely visual: the caller keeps
// the paddle's real width/height, so hitbox and simulation are unchanged.
import React, { useMemo } from 'react';
import Svg, { ClipPath, Defs, G, Line, Polygon, Rect, Circle, Path } from 'react-native-svg';
import { MOTIFS, TEXTURES, type Artwork } from '@workspace/goldrush-catalog/cosmetics';

const HEX = /^#[0-9a-fA-F]{6}$/;
const safeHex = (v: string, fb: string) => (HEX.test(v) ? v : fb);

/** Normalise any artwork into bounded, known values. */
export function sanitizeArtwork(a: Artwork): Artwork {
  return {
    motif: (MOTIFS as readonly string[]).includes(a.motif) ? a.motif : 'racing',
    texture: (TEXTURES as readonly string[]).includes(a.texture) ? a.texture : 'none',
    base: safeHex(a.base, '#F36B3F'),
    ink: safeHex(a.ink, '#252A2B'),
    accent: safeHex(a.accent, '#EEE9DE'),
    density: Math.max(2, Math.min(8, Math.round(Number(a.density) || 4))),
  };
}

export const MOTIF_LABEL: Record<Artwork['motif'], string> = {
  chevron: 'Chevron', circuit: 'Circuit trace', checker: 'Checker', sunburst: 'Sunburst',
  wave: 'Wave', facets: 'Facets', racing: 'Racing stripe', crosshatch: 'Crosshatch',
};
export const TEXTURE_LABEL: Record<Artwork['texture'], string> = { none: 'Flat print', etched: 'Etched lines', grain: 'Grain' };

let clipSeq = 0;

function motifShapes(a: Artwork, w: number, h: number): React.ReactNode[] {
  const n = a.density;
  const out: React.ReactNode[] = [];
  const sw = Math.max(1, h * 0.12);
  switch (a.motif) {
    case 'chevron': {
      const step = w / n;
      for (let i = -1; i <= n; i++) {
        const x = i * step;
        out.push(<Polygon key={`c${i}`} points={`${x},0 ${x + step * 0.45},${h / 2} ${x},${h} ${x + step * 0.3},${h} ${x + step * 0.75},${h / 2} ${x + step * 0.3},0`} fill={i % 2 ? a.accent : a.ink} />);
      }
      break;
    }
    case 'circuit': {
      const step = w / n;
      for (let i = 0; i < n; i++) {
        const x = i * step + step * 0.2;
        const up = i % 2 === 0;
        const y1 = up ? h * 0.28 : h * 0.72;
        out.push(<Path key={`p${i}`} d={`M${x},${y1} H${x + step * 0.45} V${up ? h * 0.72 : h * 0.28} H${x + step * 0.9}`} stroke={a.ink} strokeWidth={sw} fill="none" />);
        out.push(<Rect key={`n${i}`} x={x - sw * 1.2} y={y1 - sw * 1.2} width={sw * 2.4} height={sw * 2.4} fill={a.accent} stroke={a.ink} strokeWidth={sw * 0.5} />);
      }
      break;
    }
    case 'checker': {
      const rows = Math.max(2, Math.round(n / 3));
      const cell = h / rows;
      const cols = Math.ceil(w / cell);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if ((r + c) % 2 === 0) out.push(<Rect key={`k${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill={a.ink} />);
      }
      out.push(<Rect key="kb" x={0} y={h * 0.44} width={w} height={h * 0.12} fill={a.accent} />);
      break;
    }
    case 'sunburst': {
      const cx = w / 2, cy = h, R = w;
      const rays = n * 2;
      for (let i = 0; i < rays; i++) {
        if (i % 2) continue;
        const a0 = Math.PI + (i / rays) * Math.PI, a1 = Math.PI + ((i + 1) / rays) * Math.PI;
        out.push(<Polygon key={`s${i}`} points={`${cx},${cy} ${cx + Math.cos(a0) * R},${cy + Math.sin(a0) * R} ${cx + Math.cos(a1) * R},${cy + Math.sin(a1) * R}`} fill={a.ink} opacity={0.85} />);
      }
      out.push(<Circle key="sc" cx={cx} cy={cy} r={h * 0.55} fill={a.accent} stroke={a.ink} strokeWidth={sw * 0.6} />);
      break;
    }
    case 'wave': {
      const lines = Math.max(2, Math.round(n / 2));
      const per = w / n;
      for (let l = 0; l < lines; l++) {
        const y = ((l + 1) / (lines + 1)) * h;
        const amp = h / (lines + 1) * 0.45;
        let d = `M0,${y}`;
        for (let i = 0; i < n; i++) d += ` Q${i * per + per / 2},${y + (i % 2 ? amp : -amp)} ${(i + 1) * per},${y}`;
        out.push(<Path key={`w${l}`} d={d} stroke={l % 2 ? a.accent : a.ink} strokeWidth={sw} fill="none" />);
      }
      break;
    }
    case 'facets': {
      const step = w / n;
      for (let i = 0; i < n; i++) {
        const x = i * step;
        out.push(<Polygon key={`f${i}a`} points={`${x},0 ${x + step},0 ${x + step * 0.5},${h}`} fill={i % 2 ? a.accent : a.ink} opacity={0.55} />);
        out.push(<Polygon key={`f${i}b`} points={`${x},${h} ${x + step * 0.5},${h} ${x},0`} fill={a.ink} opacity={0.3} />);
      }
      break;
    }
    case 'racing': {
      const bands = Math.max(1, Math.round(n / 2));
      const band = h * 0.5 / (bands * 2 - 1);
      for (let i = 0; i < bands; i++) {
        out.push(<Rect key={`r${i}`} x={0} y={h * 0.25 + i * band * 2} width={w} height={band} fill={i % 2 ? a.accent : a.ink} />);
      }
      out.push(<Rect key="rn" x={w * 0.42} y={0} width={w * 0.16} height={h} fill={a.accent} stroke={a.ink} strokeWidth={sw * 0.6} />);
      break;
    }
    case 'crosshatch': {
      const step = w / (n * 2);
      for (let i = -Math.ceil(h / step); i <= n * 2 + 1; i++) {
        const x = i * step;
        out.push(<Line key={`h${i}a`} x1={x} y1={0} x2={x + h} y2={h} stroke={a.ink} strokeWidth={sw * 0.7} />);
        out.push(<Line key={`h${i}b`} x1={x + h} y1={0} x2={x} y2={h} stroke={a.accent} strokeWidth={sw * 0.5} opacity={0.8} />);
      }
      break;
    }
  }
  return out;
}

function textureShapes(a: Artwork, w: number, h: number): React.ReactNode[] {
  if (a.texture === 'etched') {
    const step = Math.max(2.5, h / 5);
    const out: React.ReactNode[] = [];
    for (let y = step / 2; y < h; y += step) out.push(<Line key={`e${y}`} x1={0} y1={y} x2={w} y2={y} stroke={a.ink} strokeWidth={0.5} opacity={0.22} />);
    return out;
  }
  if (a.texture === 'grain') {
    // Deterministic LCG so the grain is stable between renders.
    let s = 1103 + a.density * 97;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const count = Math.min(140, Math.round((w * h) / 18));
    return Array.from({ length: count }, (_, i) => (
      <Rect key={`g${i}`} x={rnd() * w} y={rnd() * h} width={1} height={1} fill={i % 3 ? a.ink : a.accent} opacity={0.35} />
    ));
  }
  return [];
}

export function PaddleArt({ design, width, height }: { design: Artwork; width: number; height: number }) {
  const w = Math.max(1, width), h = Math.max(1, height);
  const a = useMemo(() => sanitizeArtwork(design), [design]);
  const id = useMemo(() => `pa${++clipSeq}`, []);
  const motif = useMemo(() => motifShapes(a, w, h), [a, w, h]);
  const tex = useMemo(() => textureShapes(a, w, h), [a, w, h]);
  return (
    <Svg width={w} height={h} pointerEvents="none">
      <Defs>
        <ClipPath id={id}><Rect x={0} y={0} width={w} height={h} /></ClipPath>
      </Defs>
      <G clipPath={`url(#${id})`}>
        <Rect x={0} y={0} width={w} height={h} fill={a.base} />
        {motif}
        {tex}
      </G>
      <Rect x={0.75} y={0.75} width={w - 1.5} height={h - 1.5} fill="none" stroke={a.ink} strokeWidth={1.5} />
    </Svg>
  );
}

export default PaddleArt;
