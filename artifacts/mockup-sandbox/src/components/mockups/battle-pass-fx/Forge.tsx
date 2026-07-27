import { useEffect, useRef, useState } from "react";

const CSS = `
@keyframes ember-rise { 0%{transform:translateY(0) translateX(0) scale(1);opacity:.9} 40%{opacity:.7} 100%{transform:translateY(-80vh) translateX(var(--dx,10px)) scale(0.2);opacity:0} }
@keyframes heat-wave { 0%,100%{filter:blur(0px) brightness(1)} 50%{filter:blur(.6px) brightness(1.08)} }
@keyframes lava-flow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes forge-pulse { 0%,100%{box-shadow:0 0 10px #F59E0B44,0 0 3px #EF4444} 50%{box-shadow:0 0 30px #F59E0Bcc,0 0 60px #EF444466,inset 0 0 20px #F59E0B22} }
@keyframes anvil-strike { 0%{transform:scale(1)} 20%{transform:scale(.92) translateY(3px)} 50%{transform:scale(1.06)} 100%{transform:scale(1)} }
@keyframes shimmer-fire { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes molten-prog { 0%{background-position:0% 0} 100%{background-position:200% 0} }
@keyframes flicker { 0%,100%{opacity:.85} 25%{opacity:1} 75%{opacity:.7} }
@keyframes float-up { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
`;

function EmberParticles() {
  const embers = Array.from({ length: 40 }, (_, i) => ({
    id: i, x: 5 + Math.random() * 90,
    size: Math.random() * 4 + 1.5,
    delay: Math.random() * 6,
    dur: Math.random() * 4 + 3,
    dx: (Math.random() - 0.5) * 60,
    color: Math.random() > 0.5 ? "#F59E0B" : Math.random() > 0.5 ? "#EF4444" : "#FDE68A",
  }));
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {embers.map(e => (
        <div key={e.id} style={{
          position: "absolute", bottom: `${Math.random() * 20}%`, left: `${e.x}%`,
          width: e.size, height: e.size, borderRadius: "50%", background: e.color,
          boxShadow: `0 0 ${e.size * 2}px ${e.color}`,
          "--dx": `${e.dx}px`,
          animation: `ember-rise ${e.dur}s ease-in ${e.delay}s infinite`,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

function HeatHaze() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* Lava cracks at bottom */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 160, background: "radial-gradient(ellipse at 50% 120%, #EF444422 0%, #B4500F18 40%, transparent 70%)", filter: "blur(8px)" }} />
      <div style={{ position: "absolute", bottom: 0, left: "10%", width: "80%", height: 3, background: "linear-gradient(90deg,transparent,#F59E0B99,#EF4444cc,#F59E0B99,transparent)", animation: "flicker 1.5s ease-in-out infinite" }} />
    </div>
  );
}

function BPPBadge({ pts }: { pts: number }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", animation: "forge-pulse 2s ease-in-out infinite, float-up 3s ease-in-out infinite", position: "relative" }}>
      <div style={{ padding: "6px 12px", textAlign: "center", background: "linear-gradient(135deg,#B45309,#92400E,#7C2D12)", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg,transparent 40%,rgba(253,230,138,.2) 50%,transparent 60%)", backgroundSize: "200% 100%", animation: "shimmer-fire 1.8s linear infinite" }} />
        <div style={{ color: "#FDE68A", fontWeight: 900, fontSize: 18, textShadow: "0 0 8px #F59E0B" }}>{pts.toLocaleString()}</div>
        <div style={{ color: "#FCD34D99", fontWeight: 700, fontSize: 7, letterSpacing: 2 }}>BP PTS</div>
      </div>
    </div>
  );
}

function TierCard({ slot, free, prem, unlocked, milestone }: {
  slot: number; free: string; prem: string; unlocked: boolean; milestone?: boolean;
}) {
  const [struck, setStruck] = useState(false);
  function onClick() {
    if (!unlocked) return;
    setStruck(true);
    setTimeout(() => setStruck(false), 500);
  }
  const freeColor = free === "🪙" ? "#F59E0B" : free === "⚡" ? "#BF5FFF" : free === "🎁" ? "#10B981" : "#F59E0B";
  const premColor = prem === "🪙" ? "#F59E0B" : prem === "⚡" ? "#BF5FFF" : prem === "🎨" ? "#00E5FF" : "#F59E0B";
  return (
    <div onClick={onClick} style={{
      width: 100, flexShrink: 0, borderRadius: 14, overflow: "hidden",
      border: `1.5px solid ${milestone ? "#F59E0B88" : unlocked ? "#78350F55" : "#FFFFFF0A"}`,
      background: unlocked ? "linear-gradient(160deg,#1C0A00,#2D1000)" : "#0A0500",
      animation: struck ? "anvil-strike .5s ease-out" : (milestone && unlocked ? "forge-pulse 2.5s ease-in-out infinite" : "none"),
      cursor: unlocked ? "pointer" : "default",
      position: "relative",
    }}>
      {/* Heat wave overlay */}
      {unlocked && (
        <div style={{ position: "absolute", inset: 0, animation: "heat-wave 3s ease-in-out infinite", pointerEvents: "none", zIndex: 5, borderRadius: 14 }} />
      )}
      {/* Forge shimmer */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg,transparent 30%,rgba(245,158,11,.15) 50%,transparent 70%)", backgroundSize: "200% 100%", animation: unlocked ? "shimmer-fire 2s linear infinite" : "none", pointerEvents: "none", zIndex: 6 }} />
      {/* Slot number */}
      <div style={{ padding: "5px 4px", textAlign: "center", background: milestone && unlocked ? "#F59E0B22" : unlocked ? "#92400E22" : "#FFFFFF05", borderBottom: "1px solid #FFFFFF0A", position: "relative", zIndex: 7 }}>
        <span style={{ color: milestone ? "#FCD34D" : unlocked ? "#F59E0B" : "#FFFFFF22", fontWeight: 800, fontSize: 10, fontFamily: "system-ui", textShadow: unlocked ? "0 0 6px #F59E0B" : "none" }}>
          {milestone ? `★${slot}` : slot}
        </span>
      </div>
      {/* Free */}
      <div style={{ padding: "10px 8px", textAlign: "center", borderBottom: "1px solid #FFFFFF08", background: `linear-gradient(135deg,${freeColor}18,transparent)`, opacity: unlocked ? 1 : 0.2, position: "relative", zIndex: 7 }}>
        <div style={{ fontSize: 18, marginBottom: 3 }}>{free}</div>
        <div style={{ color: freeColor, fontSize: 8, fontWeight: 700, fontFamily: "system-ui", textShadow: `0 0 6px ${freeColor}` }}>FREE</div>
      </div>
      {/* Premium */}
      <div style={{ padding: "10px 8px", textAlign: "center", background: `linear-gradient(135deg,${premColor}14,transparent)`, opacity: unlocked ? 1 : 0.15, position: "relative", zIndex: 7 }}>
        <div style={{ fontSize: 18, marginBottom: 3 }}>{prem}</div>
        <div style={{ color: premColor, fontSize: 8, fontWeight: 700, fontFamily: "system-ui", textShadow: `0 0 6px ${premColor}` }}>PREMIUM</div>
      </div>
    </div>
  );
}

const TIERS = [
  { slot:1, free:"🪙", prem:"⚡", unlock:true }, { slot:2, free:"🎁", prem:"🪙", unlock:true },
  { slot:3, free:"⚡", prem:"🎁", unlock:true }, { slot:4, free:"🪙", prem:"⚡", unlock:false },
  { slot:5, free:"🎁", prem:"🪙", unlock:false }, { slot:10, free:"💎", prem:"🎨", unlock:false, ms:true },
  { slot:15, free:"🪙", prem:"💎", unlock:false, ms:true }, { slot:25, free:"🎁", prem:"🎨", unlock:false, ms:true },
  { slot:50, free:"💎", prem:"💎", unlock:false, ms:true },
];

export function Forge() {
  return (
    <div style={{ width: 402, minHeight: 874, background: "#080200", position: "relative", fontFamily: "system-ui", overflow: "hidden", color: "#FEF3C7" }}>
      <style>{CSS}</style>

      {/* Molten sky gradient */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 320, background: "linear-gradient(180deg,#1C0A0088 0%,transparent 100%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -40, left: "-20%", width: "140%", height: 200, background: "radial-gradient(ellipse,#92400E44 0%,transparent 70%)", pointerEvents: "none", animation: "lava-flow 8s ease-in-out infinite", backgroundSize: "200% 200%" }} />

      <EmberParticles />
      <HeatHaze />

      {/* Header */}
      <div style={{ padding: "52px 18px 14px", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 2.5, color: "#F59E0B99", fontWeight: 700, marginBottom: 4 }}>SEASON 1</div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2, color: "#FCD34D", textShadow: "0 0 24px #F59E0Bcc, 2px 2px 0 #7C2D12, 1px 1px 0 #92400E", animation: "flicker 2s ease-in-out infinite" }}>
              BATTLE PASS
            </div>
            <div style={{ fontSize: 9, color: "#FDE68A44", marginTop: 4, letterSpacing: .3 }}>Complete Quests → Earn Points → Unlock Rewards</div>
          </div>
          <BPPBadge pts={1340} />
        </div>

        {/* Progress — molten */}
        <div style={{ background: "#1C0A0088", borderRadius: 12, padding: 10, border: "1px solid #78350F44", marginTop: 12, backdropFilter: "blur(4px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: 10, color: "#FCD34D99", fontWeight: 600 }}>Tier 14 / 50</span>
            <span style={{ fontSize: 10, color: "#F59E0B88", fontWeight: 600 }}>40 / 100 pts to next</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "#FFFFFF0D", overflow: "hidden" }}>
            <div style={{ width: "40%", height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#F59E0B,#EF4444,#FDE68A,#F59E0B)", backgroundSize: "200% 100%", animation: "molten-prog 1.5s linear infinite", position: "relative" }}>
              <div style={{ position: "absolute", top: 1, left: "5%", width: "50%", height: 3, borderRadius: 2, background: "#FFFFFF44" }} />
            </div>
          </div>
        </div>

        {/* Premium banner — forge gold */}
        <div style={{ borderRadius: 14, overflow: "hidden", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", marginTop: 10, position: "relative", background: "linear-gradient(90deg,#92400E,#78350F,#B45309)", animation: "forge-pulse 3s ease-in-out infinite" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg,transparent 35%,rgba(253,230,138,.25) 50%,transparent 65%)", backgroundSize: "200% 100%", animation: "shimmer-fire 2s linear infinite" }} />
          <span style={{ fontSize: 18 }}>👑</span>
          <div style={{ flex: 1, position: "relative" }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#FDE68A", letterSpacing: .3 }}>Upgrade to Premium Pass</div>
            <div style={{ fontSize: 10, color: "#FCD34Dbb", marginTop: 2 }}>2× rewards · 2 exclusive skins · 5× Ultra Drop</div>
          </div>
          <div style={{ background: "#FDE68A22", padding: "5px 10px", borderRadius: 8, fontWeight: 800, fontSize: 15, color: "#FDE68A", border: "1px solid #F59E0B44" }}>$4.99</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "#FFFFFF06", borderRadius: 12, border: "1px solid #FFFFFF0D", overflow: "hidden", marginTop: 10 }}>
          {["🎫 PASS", "📋 QUESTS"].map((t, i) => (
            <div key={t} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, background: i === 0 ? "#F59E0B18" : "transparent", borderBottom: i === 0 ? "2px solid #F59E0B" : "none", color: i === 0 ? "#F59E0B" : "#FFFFFF44" }}>{t}</div>
          ))}
        </div>
      </div>

      {/* Track labels */}
      <div style={{ display: "flex", gap: 10, paddingLeft: 18, marginBottom: 6, position: "relative", zIndex: 2 }}>
        <div style={{ border: "1px solid #FFFFFF22", borderRadius: 6, padding: "3px 8px", fontSize: 9, fontWeight: 700, color: "#FFFFFF55", letterSpacing: 1.5 }}>FREE</div>
        <div style={{ border: "1px solid #F59E0B55", borderRadius: 6, padding: "3px 8px", fontSize: 9, fontWeight: 700, color: "#FCD34D", letterSpacing: 1.5, background: "#F59E0B18" }}>👑 PREMIUM</div>
      </div>

      {/* Pass scroll */}
      <div style={{ display: "flex", gap: 8, paddingLeft: 16, paddingRight: 16, overflowX: "auto", position: "relative", zIndex: 2, paddingBottom: 8 }}>
        {TIERS.map(t => <TierCard key={t.slot} slot={t.slot} free={t.free} prem={t.prem} unlocked={t.unlock} milestone={!!t.ms} />)}
      </div>

      {/* Molten progress line */}
      <div style={{ height: 2, marginLeft: 16, marginRight: 16, background: "linear-gradient(90deg,#F59E0B00,#F59E0Baa 30%,#EF4444cc 50%,#FFFFFF22 70%,transparent)", marginTop: 4, position: "relative", zIndex: 2 }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,#FCD34Dcc,transparent)", backgroundSize: "200% 100%", animation: "shimmer-fire 1.5s linear infinite" }} />
      </div>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 16, paddingTop: 10, paddingBottom: 8, position: "relative", zIndex: 2 }}>
        {[["🪙","Coins"],["⚡","Credits"],["🎁","Block"],["💎","Ultra"],["🎨","Skin"]].map(([e,l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 11 }}>{e}</span>
            <span style={{ fontSize: 9, color: "#FDE68A55", fontFamily: "system-ui" }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
