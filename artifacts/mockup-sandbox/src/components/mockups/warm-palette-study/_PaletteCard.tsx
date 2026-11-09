import { useState, type CSSProperties } from "react";
import "./_group.css";

export type PaletteStudy = {
  id: string;
  name: string;
  subtitle: string;
  mood: string;
  tradeoff: string;
  main: string;
  secondary: string;
  accent: string;
  ink: string;
  secondaryInk: string;
  accentInk: string;
};

export function PaletteCard({ palette }: { palette: PaletteStudy }) {
  const [ready, setReady] = useState(false);
  const style = {
    "--main": palette.main,
    "--secondary": palette.secondary,
    "--accent": palette.accent,
    "--ink": palette.ink,
    "--secondary-ink": palette.secondaryInk,
    "--accent-ink": palette.accentInk,
  } as CSSProperties;

  return (
    <main className="palette-stage" style={style}>
      <article className="palette-card" aria-label={`${palette.name} color study`}>
        <div>
          <header className="palette-header">
            <div className="palette-eyebrow"><span className="palette-mark" />GOLDRUSH ARENA / PALETTE STUDY</div>
            <div className="palette-id">{palette.id}</div>
          </header>

          <section className="palette-title-block">
            <h1 className="palette-title">{palette.name}</h1>
            <p className="palette-subtitle">{palette.subtitle}</p>
          </section>

          <div className="palette-ratio" aria-label="Surface hierarchy: 60 percent main, 30 percent secondary, 10 percent accent">
            <span className="palette-ratio-main" />
            <span className="palette-ratio-secondary" />
            <span className="palette-ratio-accent" />
          </div>
          <div className="palette-swatches">
            <div className="palette-swatch"><span className="palette-swatch-label">60 / Main</span><span className="palette-swatch-value">{palette.main}</span></div>
            <div className="palette-swatch"><span className="palette-swatch-label">30 / Court</span><span className="palette-swatch-value">{palette.secondary}</span></div>
            <div className="palette-swatch"><span className="palette-swatch-label">10 / Signal</span><span className="palette-swatch-value">{palette.accent}</span></div>
          </div>

          <section className="palette-study" aria-label="Illustrative color study, not live gameplay">
            <div className="palette-study-head">
              <span className="palette-study-label">Color study</span>
              <span className="palette-study-note">Not live gameplay</span>
            </div>
            <div className="palette-court" aria-hidden="true">
              <span className="palette-paddle palette-paddle-left" />
              <span className="palette-paddle palette-paddle-right" />
              <span className="palette-ball" />
              <span className="palette-court-caption">Four-paddle court / color roles</span>
            </div>
            <div className="palette-study-footer">
              <span>{ready ? "Preview ready · color only" : "Surface hierarchy in context"}</span>
              <button className="palette-preview-button" type="button" onClick={() => setReady((value) => !value)}>
                {ready ? "Reset study" : "Preview ready"}
              </button>
            </div>
          </section>
        </div>

        <footer className="palette-bottom">
          <div>
            <p className="palette-mood">{palette.mood}</p>
            <p className="palette-tradeoff">{palette.tradeoff}</p>
          </div>
          <span className="palette-ink-note">Text inks are separate from the 3 surface colors</span>
        </footer>
      </article>
    </main>
  );
}
