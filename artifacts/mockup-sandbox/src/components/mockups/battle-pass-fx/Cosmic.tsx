import { useEffect, useRef, useState } from "react";

/* ── Keyframes injected once ─────────────────────────────────── */
const CSS = `
@keyframes drift { 0%{transform:translateY(0) translateX(0) scale(1);opacity:.7} 50%{opacity:1} 100%{transform:translateY(-120vh) translateX(30px) scale(0.4);opacity:0} }
@keyframes nebula { 0%,100%{opacity:.18;transform:scale(1) rotate(0deg)} 50%{opacity:.32;transform:scale(1.08) rotate(6deg)} }
@keyframes orbit { from{transform:rotate(0deg) translateX(26px) rotate(0deg)} to{transform:rotate(360deg) translateX(26px) rotate(-360deg)} }
@keyframes supernova { 0%{transform:scale(.6);opacity:.9} 100%{transform:scale(2.4);opacity:0} }
@keyframes pulse-glow { 0%,100%{box-shadow:0 0 12px 2px #7C3AED88} 50%{box-shadow:0 0 28px 8px #7C3AEDcc,0 0 48px 16px #7C3AED44} }
@keyframes shimmer-x { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes float-badge { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-3px) scale(1.03)} }
@keyframes twinkling { 0%,100%{opacity:.2} 50%{opacity:1} }
@keyframes progress-flow { 0%{background-position:0% 0} 100%{background-position:200% 0} }
`;

/* ── Stars ───────────────────────────────────────────────────── */
function Starfield() {
  const stars = Array.from({ length: 90 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    delay: Math.random() * 8, dur: Math.random() * 6 + 8,
    twinkle: Math.random() * 3 + 1,
  }));
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {stars.map(s => (
        <div key={s.id} style={{
          position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: "50%",
          background: s.size > 2 ? "#C4B5FD" : "#E0D7FF",
          animation: `twinkling ${s.twinkle}s ease-in-out ${s.delay}s infinite, drift ${s.dur}s linear ${s.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

/* ── Nebula blobs ─────────────────────────────────────────────── */
function NebulaBlobs() {
  const blobs = [
    { x: -10, y: 5, w: 280, h: 200, color: "#6D28D9", delay: 0 },
    { x: 60, y: 30, w: 200, h: 160, color: "#1D4ED8", delay: 2 },
    { x: 20, y: 60, w: 250, h: 180, color: "#7C3AED", delay: 4 },
    { x: 50, y: 75, w: 180, h: 140, color: "#4F46E5", delay: 1 },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {blobs.map((b, i) => (
        <div key={i} style={{
          position: "absolute", left: `${b.x}%`, top: `${b.y}%`,
          width: b.w, height: b.h, borderRadius: "50%",
          background: `radial-gradient(ellipse, ${b.color}55 0%, transparent 70%)`,
          filter: "blur(30px)",
          animation: `nebula ${6 + i * 2}s ease-in-out ${b.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

/* ── BPP Badge with orbit ring ─────────────────────────────────── */
function BPPBadge({ pts }: { pts: number }) {
  return (
    <div style={{ position: "relative", width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center", animation: "float-badge 3s ease-in-out infinite" }}>
      {/* Orbit ring */}
      <div style={{ position: "absolute", width: 60, height: 60, borderRadius: "50%", border: "1px solid #A78BFA55" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 6, height: 6, marginTop: -3, marginLeft: -3, borderRadius: "50%", background: "#C4B5FD", animation: "orbit 2.5s linear infinite", boxShadow: "0 0 6px #C4B5FD" }} />
      </div>
      <div style={{ background: "linear-gradient(135deg,#7C3AED,#4F46E5)", borderRadius: 12, padding: "6px 12px", textAlign: "center", animation: "pulse-glow 2s ease-in-out infinite", position: "relative", zIndex: 1 }}>
        <div style={{ color: "#F5F3FF", fontWeight: 800, fontSize: 16, fontFamily: "system-ui" }}>{pts.toLocaleString()}</div>
        <div style={{ color: "#A78BFA", fontWeight: 700, fontSize: 7, letterSpacing: 2 }}>BP PTS</div>
      </div>
    </div>
  );
}

/* ── Tier card with 3D tilt ──────────────────────────────────── */
function TierCard({ slot, free, prem, unlocked, milestone, claimed }: {
  slot: number; free: string; prem: string; unlocked: boolean; milestone: boolean; claimed?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, glow: false });

  function onMove(e: React.MouseEvent) {
    if (!ref.current || !unlocked) return;
    const r = ref.current.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width - 0.5;
    const cy = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: cy * -18, y: cx * 18, glow: true });
  }
  function onLeave() { setTilt({ x: 0, y: 0, glow: false }); }

  const freeColor = free === "🪙" ? "#FFD700" : free === "⚡" ? "#BF5FFF" : free === "🎁" ? "#10B981" : free === "🎨" ? "#00E5FF" : "#C4B5FD";
  const premColor = prem === "🪙" ? "#FFD700" : prem === "⚡" ? "#BF5FFF" : prem === "🎁" ? "#10B981" : prem === "🎨" ? "#00E5FF" : "#C4B5FD";

  return (
    <div style={{ perspective: 600, width: 100, flexShrink: 0 }}>
      <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
        style={{
          borderRadius: 14, overflow: "hidden", border: `1.5px solid ${milestone ? "#FFD70066" : unlocked ? "#7C3AED55" : "#FFFFFF0D"}`,
          background: unlocked ? "linear-gradient(160deg,#1E1040,#0D0A1E)" : "#08080F",
          transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: tilt.glow ? "none" : "transform .6s ease",
          boxShadow: tilt.glow && unlocked ? `0 12px 40px #7C3AED44, 0 0 0 1px #7C3AED33` : milestone && unlocked ? `0 0 20px #FFD70033` : "none",
        }}>
        {/* Shimmer on hover */}
        {unlocked && (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg,transparent 35%,rgba(167,139,250,.15) 50%,transparent 65%)", backgroundSize: "200% 100%", animation: tilt.glow ? "none" : "shimmer-x 3s linear infinite", pointerEvents: "none", zIndex: 10 }} />
        )}
        {/* Supernova ring for milestone */}
        {milestone && unlocked && (
          <div style={{ position: "absolute", inset: -2, borderRadius: 16, border: "1.5px solid #FFD700AA", animation: "supernova 2s ease-out infinite", pointerEvents: "none" }} />
        )}
        {/* Slot number */}
        <div style={{ padding: "5px 4px", textAlign: "center", background: milestone && unlocked ? "#FFD70022" : unlocked ? "#7C3AED22" : "#FFFFFF08", borderBottom: "1px solid #FFFFFF0A" }}>
          <span style={{ color: milestone ? "#FFD700" : unlocked ? "#C4B5FD" : "#FFFFFF33", fontWeight: 800, fontSize: 10, fontFamily: "system-ui" }}>{milestone ? `★${slot}` : slot}</span>
        </div>
        {/* Free row */}
        <div style={{ padding: "10px 8px", textAlign: "center", borderBottom: "1px solid #FFFFFF0A", background: `linear-gradient(135deg,${freeColor}18,transparent)`, opacity: unlocked ? 1 : 0.25 }}>
          <div style={{ fontSize: 18, marginBottom: 3 }}>{claimed ? "✅" : free}</div>
          <div style={{ color: freeColor, fontSize: 8, fontWeight: 700, fontFamily: "system-ui", letterSpacing: .3 }}>FREE</div>
        </div>
        {/* Prem row */}
        <div style={{ padding: "10px 8px", textAlign: "center", background: `linear-gradient(135deg,${premColor}14,transparent)`, opacity: unlocked ? 1 : 0.2 }}>
          <div style={{ fontSize: 18, marginBottom: 3 }}>{prem}</div>
          <div style={{ color: premColor, fontSize: 8, fontWeight: 700, fontFamily: "system-ui", letterSpacing: .3 }}>PREMIUM</div>
        </div>
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────── */
const TIERS = [
  { slot:1, free:"🪙", prem:"⚡", unlock:true }, { slot:2, free:"🎁", prem:"🪙", unlock:true },
  { slot:3, free:"⚡", prem:"🎁", unlock:true }, { slot:4, free:"🪙", prem:"⚡", unlock:false },
  { slot:5, free:"🎁", prem:"🪙", unlock:false }, { slot:10, free:"💎", prem:"🎨", unlock:false, ms:true },
  { slot:15, free:"🪙", prem:"💎", unlock:false, ms:true }, { slot:25, free:"🎁", prem:"🎨", unlock:false, ms:true },
  { slot:50, free:"💎", prem:"💎", unlock:false, ms:true },
];

export function Cosmic() {
  return (
    <div style={{ width: 402, minHeight: 874, background: "#04020E", position: "relative", fontFamily: "system-ui", overflow: "hidden", color: "#F5F3FF" }}>
      <style>{CSS}</style>
      <Starfield />
      <NebulaBlobs />

      {/* Header */}
      <div style={{ padding: "52px 18px 14px", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 2.5, color: "#A78BFA99", fontWeight: 700, marginBottom: 4 }}>SEASON 1</div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2, textShadow: "0 0 20px #7C3AED, 2px 2px 0 #2E1065, 1px 1px 0 #4C1D95" }}>
              BATTLE PASS
            </div>
            <div style={{ fontSize: 9, color: "#FFFFFF44", marginTop: 4, letterSpacing: .3 }}>Complete Quests → Earn Points → Unlock Rewards</div>
          </div>
          <BPPBadge pts={1340} />
        </div>

        {/* Progress */}
        <div style={{ background: "#FFFFFF06", borderRadius: 12, padding: 10, border: "1px solid #7C3AED22", marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: 10, color: "#FFFFFF55", fontWeight: 600 }}>Tier 14 / 50</span>
            <span style={{ fontSize: 10, color: "#A78BFA99", fontWeight: 600 }}>40 / 100 pts to next</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "#FFFFFF0D", overflow: "hidden" }}>
            <div style={{ width: "40%", height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#7C3AED,#A855F7,#C4B5FD,#7C3AED)", backgroundSize: "200% 100%", animation: "progress-flow 2s linear infinite", position: "relative" }}>
              <div style={{ position: "absolute", top: 1, left: "5%", width: "60%", height: 3, borderRadius: 2, background: "#FFFFFF55" }} />
            </div>
          </div>
        </div>

        {/* Premium banner */}
        <div style={{ borderRadius: 14, overflow: "hidden", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", marginTop: 10, position: "relative", background: "linear-gradient(90deg,#7C3AED,#4F46E5)", animation: "pulse-glow 3s ease-in-out infinite" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg,transparent 35%,rgba(255,255,255,.12) 50%,transparent 65%)", backgroundSize: "200% 100%", animation: "shimmer-x 2.5s linear infinite" }} />
          <span style={{ fontSize: 18 }}>👑</span>
          <div style={{ flex: 1, position: "relative" }}>
            <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: .3 }}>Upgrade to Premium Pass</div>
            <div style={{ fontSize: 10, color: "#C4B5FDbb", marginTop: 2 }}>2× rewards · 2 exclusive skins · 5× Ultra Drop</div>
          </div>
          <div style={{ background: "#FFFFFF22", padding: "5px 10px", borderRadius: 8, fontWeight: 800, fontSize: 15 }}>$4.99</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "#FFFFFF08", borderRadius: 12, border: "1px solid #FFFFFF0D", overflow: "hidden", marginTop: 10 }}>
          {["🎫 PASS", "📋 QUESTS"].map((t, i) => (
            <div key={t} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, background: i === 0 ? "#7C3AED22" : "transparent", borderBottom: i === 0 ? "2px solid #A855F7" : "none", color: i === 0 ? "#A855F7" : "#FFFFFF55" }}>{t}</div>
          ))}
        </div>
      </div>

      {/* Track labels */}
      <div style={{ display: "flex", gap: 10, paddingLeft: 18, marginBottom: 6, position: "relative", zIndex: 2 }}>
        <div style={{ border: "1px solid #FFFFFF22", borderRadius: 6, padding: "3px 8px", fontSize: 9, fontWeight: 700, color: "#FFFFFF66", letterSpacing: 1.5 }}>FREE</div>
        <div style={{ border: "1px solid #7C3AED66", borderRadius: 6, padding: "3px 8px", fontSize: 9, fontWeight: 700, color: "#A78BFA", letterSpacing: 1.5, background: "#7C3AED22" }}>👑 PREMIUM</div>
      </div>

      {/* Pass scroll */}
      <div style={{ display: "flex", gap: 8, paddingLeft: 16, paddingRight: 16, overflowX: "auto", position: "relative", zIndex: 2, paddingBottom: 8 }}>
        {TIERS.map(t => (
          <TierCard key={t.slot} slot={t.slot} free={t.free} prem={t.prem} unlocked={t.unlock} milestone={!!t.ms} />
        ))}
      </div>

      {/* Constellation connecting line */}
      <div style={{ height: 2, marginHorizontal: 16, background: "linear-gradient(90deg,#7C3AED00,#7C3AED88 20%,#A855F7 50%,#FFFFFF22 65%,transparent)", marginLeft: 16, marginRight: 16, position: "relative", zIndex: 2, marginTop: 4 }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,#A855F788,transparent)", backgroundSize: "200% 100%", animation: "shimmer-x 2s linear infinite" }} />
      </div>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 16, paddingTop: 10, paddingBottom: 8, position: "relative", zIndex: 2 }}>
        {[["🪙","Coins"],["⚡","Credits"],["🎁","Block"],["💎","Ultra"],["🎨","Skin"]].map(([e,l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 11 }}>{e}</span>
            <span style={{ fontSize: 9, color: "#FFFFFF44", fontFamily: "system-ui" }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
