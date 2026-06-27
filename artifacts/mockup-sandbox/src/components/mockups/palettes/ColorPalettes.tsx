export function ColorPalettes() {
  const palettes = [
    {
      name: "Gold Rush",
      tag: "CURRENT",
      bg: ["#02000C", "#0A0030"],
      accent: "#FFD700",
      accent2: "#FF8800",
      players: ["#FFD700", "#FF4757", "#00BFFF", "#00FF88"],
      desc: "Deep purple-black · Gold & orange neon",
    },
    {
      name: "Cyberpunk Chrome",
      tag: "OPTION 1",
      bg: ["#000A0F", "#001A2F"],
      accent: "#00F5FF",
      accent2: "#FF00AA",
      players: ["#00F5FF", "#FF00AA", "#AAFF00", "#FFFFFF"],
      desc: "Deep teal-black · Cyan & magenta",
    },
    {
      name: "Inferno",
      tag: "OPTION 2",
      bg: ["#0F0000", "#1A0500"],
      accent: "#FF3300",
      accent2: "#FF8C00",
      players: ["#FF3300", "#FF8C00", "#FFD700", "#FFFFFF"],
      desc: "Crimson-black · Fire red & deep orange",
    },
    {
      name: "Arctic Void",
      tag: "OPTION 3",
      bg: ["#000510", "#001030"],
      accent: "#00CFFF",
      accent2: "#FFFFFF",
      players: ["#00CFFF", "#FFFFFF", "#AACCFF", "#EEFFAA"],
      desc: "Midnight navy · Ice blue & white",
    },
    {
      name: "Toxic Wasteland",
      tag: "OPTION 4",
      bg: ["#020E00", "#051A00"],
      accent: "#00FF44",
      accent2: "#AAFF00",
      players: ["#00FF44", "#AAFF00", "#FF8800", "#CC44FF"],
      desc: "Near-black green · Toxic & acid yellow",
    },
    {
      name: "Cosmic Dream",
      tag: "OPTION 5",
      bg: ["#080018", "#1A0040"],
      accent: "#BF5FFF",
      accent2: "#FF88FF",
      players: ["#BF5FFF", "#FF88FF", "#00F5FF", "#FFD700"],
      desc: "Deep violet · Purple & pink nebula",
    },
    {
      name: "Midnight Steel",
      tag: "OPTION 6",
      bg: ["#06060A", "#101018"],
      accent: "#E0E0FF",
      accent2: "#5577FF",
      players: ["#5577FF", "#E0E0FF", "#AABBFF", "#FFD700"],
      desc: "Near-black neutral · Electric blue & white",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#08080F",
        padding: "28px 24px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <p style={{ color: "#FFFFFF99", fontSize: 11, letterSpacing: 3, margin: 0, marginBottom: 6 }}>
          GOLDRUSH ARENA
        </p>
        <h1 style={{ color: "#FFD700", fontSize: 22, fontWeight: 800, letterSpacing: 2, margin: 0 }}>
          COLOR PALETTE OPTIONS
        </h1>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {palettes.map((p) => (
          <div
            key={p.name}
            style={{
              borderRadius: 16,
              overflow: "hidden",
              border: `1.5px solid ${p.accent}33`,
              background: "#10101A",
              boxShadow: `0 0 24px ${p.accent}18`,
            }}
          >
            {/* Mini arena preview */}
            <div
              style={{
                background: `linear-gradient(135deg, ${p.bg[0]}, ${p.bg[1]})`,
                padding: "20px 16px",
                position: "relative",
                overflow: "hidden",
                height: 130,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Star dots */}
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    width: i % 3 === 0 ? 2 : 1.5,
                    height: i % 3 === 0 ? 2 : 1.5,
                    borderRadius: "50%",
                    background: "#FFFFFF",
                    opacity: 0.5,
                    left: `${(i * 137.5) % 100}%`,
                    top: `${(i * 83.3 + 10) % 100}%`,
                  }}
                />
              ))}

              {/* Arena circle */}
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${p.accent}22 0%, ${p.bg[1]} 70%)`,
                  border: `2px solid ${p.accent}55`,
                  boxShadow: `0 0 20px ${p.accent}44`,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Inner ring */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    border: `1px solid ${p.accent}30`,
                  }}
                />
                {/* Center ball */}
                <div
                  style={{
                    position: "absolute",
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: p.accent,
                    boxShadow: `0 0 10px ${p.accent}`,
                  }}
                />

                {/* Player paddles at edges */}
                {/* Bottom */}
                <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)" }}>
                  <div style={{ width: 24, height: 6, borderRadius: 3, background: p.players[0], boxShadow: `0 0 8px ${p.players[0]}` }} />
                </div>
                {/* Top */}
                <div style={{ position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)" }}>
                  <div style={{ width: 24, height: 6, borderRadius: 3, background: p.players[1], boxShadow: `0 0 8px ${p.players[1]}` }} />
                </div>
                {/* Left */}
                <div style={{ position: "absolute", left: -6, top: "50%", transform: "translateY(-50%)" }}>
                  <div style={{ width: 6, height: 20, borderRadius: 3, background: p.players[2], boxShadow: `0 0 8px ${p.players[2]}` }} />
                </div>
                {/* Right */}
                <div style={{ position: "absolute", right: -6, top: "50%", transform: "translateY(-50%)" }}>
                  <div style={{ width: 6, height: 20, borderRadius: 3, background: p.players[3], boxShadow: `0 0 8px ${p.players[3]}` }} />
                </div>
              </div>

              {/* Tag badge */}
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  background: p.tag === "CURRENT" ? p.accent : "#FFFFFF15",
                  color: p.tag === "CURRENT" ? "#000" : p.accent,
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: 1.5,
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: `1px solid ${p.accent}44`,
                }}
              >
                {p.tag}
              </div>
            </div>

            {/* Info section */}
            <div style={{ padding: "14px 16px 16px" }}>
              <div style={{ marginBottom: 10 }}>
                <p style={{ color: "#FFFFFF", fontSize: 13, fontWeight: 700, margin: 0, letterSpacing: 0.5 }}>
                  {p.name}
                </p>
                <p style={{ color: "#FFFFFF55", fontSize: 10, margin: "3px 0 0", letterSpacing: 0.3 }}>
                  {p.desc}
                </p>
              </div>

              {/* Swatch row */}
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {/* Background swatches */}
                <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", flex: 1, height: 22, border: "1px solid #FFFFFF18" }}>
                  <div style={{ flex: 1, background: p.bg[0] }} />
                  <div style={{ flex: 1, background: p.bg[1] }} />
                </div>
                {/* Accent swatches */}
                <div
                  style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: p.accent,
                    boxShadow: `0 0 8px ${p.accent}88`,
                    border: "1px solid #FFFFFF22",
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: p.accent2,
                    boxShadow: `0 0 8px ${p.accent2}88`,
                    border: "1px solid #FFFFFF22",
                    flexShrink: 0,
                  }}
                />
              </div>

              {/* Player colors */}
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <span style={{ color: "#FFFFFF44", fontSize: 9, letterSpacing: 1, marginRight: 2 }}>P1–P4</span>
                {p.players.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1, height: 10, borderRadius: 5,
                      background: c,
                      boxShadow: `0 0 6px ${c}99`,
                    }}
                  />
                ))}
              </div>

              {/* Hex codes */}
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <span style={{ color: p.accent, fontSize: 9, fontFamily: "monospace", fontWeight: 700 }}>{p.accent}</span>
                <span style={{ color: "#FFFFFF33", fontSize: 9 }}>·</span>
                <span style={{ color: p.accent2, fontSize: 9, fontFamily: "monospace", fontWeight: 700 }}>{p.accent2}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", color: "#FFFFFF33", fontSize: 10, letterSpacing: 1.5, marginTop: 24 }}>
        TELL ME WHICH ONE YOU WANT AND I'LL APPLY IT ACROSS THE WHOLE APP
      </p>
    </div>
  );
}
