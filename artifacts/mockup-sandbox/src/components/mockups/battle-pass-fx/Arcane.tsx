import { useEffect, useRef, useState } from "react";

const CSS = `
@keyframes mandala-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes mandala-counter { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
@keyframes prismatic { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes crystal-shimmer { 0%{background-position:-200% 0;opacity:.6} 50%{opacity:1} 100%{background-position:200% 0;opacity:.6} }
@keyframes card-flip { 0%{transform:perspective(600px) rotateY(0deg)} 50%{transform:perspective(600px) rotateY(90deg)} 100%{transform:perspective(600px) rotateY(0deg)} }
@keyframes gem-sparkle { 0%,100%{filter:brightness(1)} 25%{filter:brightness(1.5) drop-shadow(0 0 4px #E879F9)} 75%{filter:brightness(.8)} }
@keyframes rune-pulse { 0%,100%{opacity:.3;transform:scale(1)} 50%{opacity:.8;transform:scale(1.06)} }
@keyframes float-gem { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-5px) rotate(5deg)} }
@keyframes arcane-flow { 0%,100%{opacity:.15} 50%{opacity:.35} }
@keyframes holo-sweep { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
`;

function MandalaBg() {
  const rings = [260, 200, 140, 90];
  return (
    <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: 0 }}>
      {rings.map((r, i) => (
        <div key={i} style={{
          position: "absolute", width: r, height: r,
          top: -r / 2, left: -r / 2,
          borderRadius: "50%",
          border: `1px solid ${["#E879F933", "#A855F722", "#7C3AED18", "#6D28D914"][i]}`,
          animation: `${i % 2 === 0 ? "mandala-spin" : "mandala-counter"} ${12 + i * 5}s linear infinite`,
        }}>
          {/* Rune dots on ring */}
          {Array.from({ length: 6 }, (_, j) => {
            const angle = (j / 6) * 360;
            const rad = (angle * Math.PI) / 180;
            const cx = r / 2 + Math.cos(rad) * (r / 2 - 4);
            const cy = r / 2 + Math.sin(rad) * (r / 2 - 4);
            return (
              <div key={j} style={{ position: "absolute", width: 4, height: 4, borderRadius: "50%", background: i < 2 ? "#E879F966" : "#A855F744", left: cx - 2, top: cy - 2, boxShadow: `0 0 4px ${i < 2 ? "#E879F9" : "#A855F7"}` }} />
            );
          })}
        </div>
      ))}
      {/* Core crystal */}
      <div style={{ position: "absolute", width: 30, height: 30, top: -15, left: -15, background: "linear-gradient(135deg,#E879F9,#7C3AED,#06B6D4)", borderRadius: 6, transform: "rotate(45deg)", animation: "gem-sparkle 2.5s ease-in-out infinite, mandala-spin 8s linear infinite", boxShadow: "0 0 20px #E879F966" }} />
    </div>
  );
}

function BPPBadge({ pts }: { pts: number }) {
  return (
    <div style={{ animation: "float-gem 3.5s ease-in-out infinite", position: "relative" }}>
      {/* Crystal facets */}
      <div style={{ padding: "6px 12px", textAlign: "center", borderRadius: 12, position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#4C1D95,#1E1B4B,#312E81)", border: "1px solid #E879F933" }}>
        {/* Prismatic sweep */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg,transparent 20%,#E879F922 35%,#A855F733 50%,#06B6D422 65%,transparent 80%)", backgroundSize: "200% 100%", animation: "holo-sweep 2s linear infinite" }} />
        {/* Facet lines */}
        <div style={{ position: "absolute", top: 0, left: "30%", width: 1, height: "100%", background: "linear-gradient(180deg,transparent,#E879F933,transparent)" }} />
        <div style={{ position: "absolute", top: 0, left: "60%", width: 1, height: "100%", background: "linear-gradient(180deg,transparent,#7C3AED22,transparent)" }} />
        <div style={{ color: "#F0ABFC", fontWeight: 900, fontSize: 18, textShadow: "0 0 10px #E879F9", position: "relative" }}>{pts.toLocaleString()}</div>
        <div style={{ color: "#C084FC99", fontWeight: 700, fontSize: 7, letterSpacing: 2, position: "relative" }}>BP PTS</div>
      </div>
    </div>
  );
}

function TierCard({ slot, free, prem, unlocked, milestone }: {
  slot: number; free: string; prem: string; unlocked: boolean; milestone?: boolean;
}) {
  const [flipping, setFlipping] = useState(false);
  function onClick() {
    if (!unlocked) return;
    setFlipping(true);
    setTimeout(() => setFlipping(false), 700);
  }

  const freeColor = free === "🪙" ? "#FCD34D" : free === "⚡" ? "#E879F9" : free === "🎁" ? "#34D399" : free === "🎨" ? "#22D3EE" : "#C4B5FD";
  const premColor = prem === "🪙" ? "#FCD34D" : prem === "⚡" ? "#E879F9" : prem === "🎨" ? "#22D3EE" : prem === "💎" ? "#F0ABFC" : "#C4B5FD";

  return (
    <div onClick={onClick} style={{ width: 100, flexShrink: 0, cursor: unlocked ? "pointer" : "default" }}>
      <div style={{
        borderRadius: 14, overflow: "hidden",
        border: `1.5px solid ${milestone ? "#E879F966" : unlocked ? "#7C3AED44" : "#FFFFFF0D"}`,
        background: unlocked ? "linear-gradient(160deg,#1E1040,#0F0A2A)" : "#06040F",
        animation: flipping ? "card-flip .7s ease" : "none",
        position: "relative",
      }}>
        {/* Holographic shimmer */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg,transparent 25%,#E879F918 40%,#A855F722 50%,#06B6D418 60%,transparent 75%)", backgroundSize: "200% 100%", animation: unlocked ? "holo-sweep 3s linear infinite" : "none", pointerEvents: "none", zIndex: 8 }} />
        {/* Crystal facets */}
        <div style={{ position: "absolute", top: 0, left: "33%", width: 1, height: "100%", background: "linear-gradient(180deg,transparent,#E879F918,transparent)", pointerEvents: "none", zIndex: 7 }} />
        <div style={{ position: "absolute", top: 0, left: "66%", width: 1, height: "100%", background: "linear-gradient(180deg,transparent,#7C3AED14,transparent)", pointerEvents: "none", zIndex: 7 }} />

        {/* Milestone outer ring */}
        {milestone && unlocked && (
          <div style={{ position: "absolute", inset: -2, borderRadius: 16, border: "1.5px solid #E879F9", animation: "rune-pulse 2s ease-in-out infinite", pointerEvents: "none", zIndex: 9 }} />
        )}

        {/* Slot number */}
        <div style={{ padding: "5px 4px", textAlign: "center", background: milestone && unlocked ? "#E879F922" : unlocked ? "#7C3AED22" : "#FFFFFF05", borderBottom: "1px solid #FFFFFF0A", position: "relative", zIndex: 10 }}>
          <span style={{ color: milestone ? "#F0ABFC" : unlocked ? "#C4B5FD" : "#FFFFFF22", fontWeight: 800, fontSize: 10, fontFamily: "system-ui", textShadow: unlocked ? "0 0 8px #E879F9" : "none" }}>
            {milestone ? `★${slot}` : slot}
          </span>
        </div>
        {/* Free */}
        <div style={{ padding: "10px 8px", textAlign: "center", borderBottom: "1px solid #FFFFFF08", background: `linear-gradient(135deg,${freeColor}18,transparent)`, opacity: unlocked ? 1 : 0.2, position: "relative", zIndex: 10 }}>
          <div style={{ fontSize: 18, marginBottom: 3, filter: unlocked ? `drop-shadow(0 0 4px ${freeColor})` : "none" }}>{free}</div>
          <div style={{ color: freeColor, fontSize: 8, fontWeight: 700, fontFamily: "system-ui", textShadow: `0 0 6px ${freeColor}` }}>FREE</div>
        </div>
        {/* Premium */}
        <div style={{ padding: "10px 8px", textAlign: "center", background: `linear-gradient(135deg,${premColor}14,transparent)`, opacity: unlocked ? 1 : 0.15, position: "relative", zIndex: 10 }}>
          <div style={{ fontSize: 18, marginBottom: 3, filter: unlocked ? `drop-shadow(0 0 4px ${premColor})` : "none" }}>{prem}</div>
          <div style={{ color: premColor, fontSize: 8, fontWeight: 700, fontFamily: "system-ui" }}>PREMIUM</div>
        </div>
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

export function Arcane() {
  return (
    <div style={{ width: 402, minHeight: 874, background: "#050310", position: "relative", fontFamily: "system-ui", overflow: "hidden", color: "#F0ABFC" }}>
      <style>{CSS}</style>

      {/* Background aura */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(ellipse at 30% 20%, #4C1D9522 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, #1E1B4B44 0%, transparent 60%)", pointerEvents: "none" }} />
      <MandalaBg />

      {/* Header */}
      <div style={{ padding: "52px 18px 14px", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 2.5, color: "#E879F999", fontWeight: 700, marginBottom: 4 }}>SEASON 1</div>
            {/* Prismatic title */}
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2, background: "linear-gradient(90deg,#E879F9,#A855F7,#7C3AED,#06B6D4,#E879F9)", backgroundSize: "200% 100%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "prismatic 4s ease-in-out infinite", filter: "drop-shadow(0 0 8px #E879F966)" }}>
              BATTLE PASS
            </div>
            <div style={{ fontSize: 9, color: "#E879F933", marginTop: 4, letterSpacing: .3 }}>Complete Quests → Earn Points → Unlock Rewards</div>
          </div>
          <BPPBadge pts={1340} />
        </div>

        {/* Progress — prismatic */}
        <div style={{ background: "#FFFFFF06", borderRadius: 12, padding: 10, border: "1px solid #E879F922", marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: 10, color: "#F0ABFC88", fontWeight: 600 }}>Tier 14 / 50</span>
            <span style={{ fontSize: 10, color: "#C084FC88", fontWeight: 600 }}>40 / 100 pts to next</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "#FFFFFF0D", overflow: "hidden" }}>
            <div style={{ width: "40%", height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#E879F9,#A855F7,#06B6D4,#E879F9)", backgroundSize: "200% 100%", animation: "prismatic 2s linear infinite", position: "relative" }}>
              <div style={{ position: "absolute", top: 1, left: "5%", width: "50%", height: 3, borderRadius: 2, background: "#FFFFFF66" }} />
            </div>
          </div>
        </div>

        {/* Premium banner — arcane crystal */}
        <div style={{ borderRadius: 14, overflow: "hidden", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", marginTop: 10, position: "relative", background: "linear-gradient(90deg,#4C1D95,#312E81,#1E1B4B)", border: "1px solid #E879F933" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg,transparent 25%,#E879F922 40%,#06B6D422 55%,transparent 70%)", backgroundSize: "200% 100%", animation: "holo-sweep 2s linear infinite" }} />
          <span style={{ fontSize: 18, filter: "drop-shadow(0 0 6px #E879F9)" }}>👑</span>
          <div style={{ flex: 1, position: "relative" }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#F0ABFC", letterSpacing: .3 }}>Upgrade to Premium Pass</div>
            <div style={{ fontSize: 10, color: "#C084FCbb", marginTop: 2 }}>2× rewards · 2 exclusive skins · 5× Ultra Drop</div>
          </div>
          <div style={{ background: "#E879F922", padding: "5px 10px", borderRadius: 8, fontWeight: 800, fontSize: 15, color: "#F0ABFC", border: "1px solid #E879F944" }}>$4.99</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "#FFFFFF06", borderRadius: 12, border: "1px solid #FFFFFF0D", overflow: "hidden", marginTop: 10 }}>
          {["🎫 PASS", "📋 QUESTS"].map((t, i) => (
            <div key={t} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, background: i === 0 ? "#E879F918" : "transparent", borderBottom: i === 0 ? "2px solid #E879F9" : "none", color: i === 0 ? "#F0ABFC" : "#FFFFFF44" }}>{t}</div>
          ))}
        </div>
      </div>

      {/* Track labels */}
      <div style={{ display: "flex", gap: 10, paddingLeft: 18, marginBottom: 6, position: "relative", zIndex: 2 }}>
        <div style={{ border: "1px solid #FFFFFF22", borderRadius: 6, padding: "3px 8px", fontSize: 9, fontWeight: 700, color: "#FFFFFF55", letterSpacing: 1.5 }}>FREE</div>
        <div style={{ border: "1px solid #E879F955", borderRadius: 6, padding: "3px 8px", fontSize: 9, fontWeight: 700, color: "#F0ABFC", letterSpacing: 1.5, background: "#E879F918" }}>👑 PREMIUM</div>
      </div>

      {/* Pass scroll */}
      <div style={{ display: "flex", gap: 8, paddingLeft: 16, paddingRight: 16, overflowX: "auto", position: "relative", zIndex: 2, paddingBottom: 8 }}>
        {TIERS.map(t => <TierCard key={t.slot} slot={t.slot} free={t.free} prem={t.prem} unlocked={t.unlock} milestone={!!t.ms} />)}
      </div>

      {/* Arcane ley line */}
      <div style={{ height: 2, marginLeft: 16, marginRight: 16, background: "linear-gradient(90deg,#E879F900,#E879F988 30%,#06B6D4cc 55%,#FFFFFF22 70%,transparent)", marginTop: 4, position: "relative", zIndex: 2 }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,#F0ABFCcc,transparent)", backgroundSize: "200% 100%", animation: "holo-sweep 1.8s linear infinite" }} />
      </div>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 16, paddingTop: 10, paddingBottom: 8, position: "relative", zIndex: 2 }}>
        {[["🪙","Coins"],["⚡","Credits"],["🎁","Block"],["💎","Ultra"],["🎨","Skin"]].map(([e,l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 11, filter: "drop-shadow(0 0 3px #E879F966)" }}>{e}</span>
            <span style={{ fontSize: 9, color: "#E879F944", fontFamily: "system-ui" }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
