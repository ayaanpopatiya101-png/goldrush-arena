import type { CSSProperties } from 'react';

export type PaletteStudy = {
  number: string;
  name: string;
  subtitle: string;
  mood: string;
  tradeoff: string;
  main: string;
  secondary: string;
  accent: string;
  mainInk: string;
  secondaryInk: string;
  accentInk: string;
  mutedInk: string;
  courtAccent: string;
  centerLine: string;
};

export function PaletteCard({ palette }: { palette: PaletteStudy }) {
  const paletteStyle = {
    '--main': palette.main,
    '--secondary': palette.secondary,
    '--accent': palette.accent,
    '--main-ink': palette.mainInk,
    '--secondary-ink': palette.secondaryInk,
    '--accent-ink': palette.accentInk,
    '--muted-ink': palette.mutedInk,
    '--court-accent': palette.courtAccent,
    '--center-line': palette.centerLine,
  } as CSSProperties;

  return (
    <main className="palette-study" style={paletteStyle}>
      <article className="palette-study__sheet">
        <div className="palette-study__topline">
          <span>GoldRush Arena / Color lab</span>
          <span className="palette-study__index">{palette.number} — 10</span>
        </div>

        <h1 className="palette-study__title">{palette.name}</h1>
        <p className="palette-study__subtitle">{palette.subtitle}</p>

        <div className="palette-study__court" aria-label="Color study, illustrative arcade court">
          <svg viewBox="0 0 360 214" role="img" aria-label="Illustrative four-paddle court composition">
            <rect width="360" height="214" fill="var(--secondary)" />
            <path d="M18 22H342V192H18Z" fill="none" stroke="var(--secondary-ink)" strokeOpacity=".48" strokeWidth="1.2" />
            <path d="M180 22V192" stroke="var(--center-line)" strokeWidth="1.2" strokeDasharray="5 6" />
            <circle cx="180" cy="107" r="34" fill="none" stroke="var(--secondary-ink)" strokeOpacity=".42" strokeWidth="1.2" />
            <path d="M18 79H42V135H18M342 79H318V135H342" fill="none" stroke="var(--secondary-ink)" strokeOpacity=".48" strokeWidth="1.2" />
            <rect x="67" y="52" width="8" height="39" rx="1" fill="var(--court-accent)" />
            <rect x="285" y="123" width="8" height="39" rx="1" fill="var(--court-accent)" />
            <rect x="116" y="22" width="8" height="34" rx="1" fill="var(--secondary-ink)" />
            <rect x="236" y="158" width="8" height="34" rx="1" fill="var(--secondary-ink)" />
            <circle cx="205" cy="101" r="5.5" fill="var(--accent)" stroke="var(--accent-ink)" strokeWidth="1.5" />
            <path d="M78 105H147" stroke="var(--secondary-ink)" strokeOpacity=".2" strokeWidth="1" />
            <path d="M213 112H282" stroke="var(--secondary-ink)" strokeOpacity=".2" strokeWidth="1" />
            <path d="M180 0V22M180 192V214" stroke="var(--center-line)" strokeWidth="3" />
            <text x="25" y="43" fill="var(--secondary-ink)" opacity=".64" fontSize="8" fontFamily="sans-serif" letterSpacing="1.4">ARENA / 04</text>
            <text x="280" y="183" fill="var(--secondary-ink)" opacity=".64" fontSize="8" fontFamily="sans-serif" letterSpacing="1.1">COLOR STUDY</text>
          </svg>
          <span className="palette-study__court-label">Illustrative court / color study</span>
        </div>

        <div className="palette-study__ratio" aria-label="Palette hierarchy: 60 percent main, 30 percent secondary, 10 percent accent">
          <span className="palette-study__ratio-main" />
          <span className="palette-study__ratio-secondary" />
          <span className="palette-study__ratio-accent" />
        </div>
        <div className="palette-study__swatches">
          <div><span className="palette-study__swatch-name">60 / Main</span><span className="palette-study__hex">{palette.main}</span></div>
          <div><span className="palette-study__swatch-name">30 / Secondary</span><span className="palette-study__hex">{palette.secondary}</span></div>
          <div className="palette-study__accent-value"><span className="palette-study__swatch-name">10 / Accent</span><span className="palette-study__hex">{palette.accent}</span></div>
        </div>

        <div className="palette-study__notes">
          <div>
            <span className="palette-study__note-label">Mood</span>
            <p className="palette-study__note-copy">{palette.mood}</p>
          </div>
          <div>
            <span className="palette-study__note-label">Tradeoff</span>
            <p className="palette-study__note-copy">{palette.tradeoff}</p>
          </div>
        </div>
        <div className="palette-study__footer">
          <span>Surface hierarchy, not a gameplay screen</span>
          <span>GR / 2025</span>
        </div>
      </article>
    </main>
  );
}
