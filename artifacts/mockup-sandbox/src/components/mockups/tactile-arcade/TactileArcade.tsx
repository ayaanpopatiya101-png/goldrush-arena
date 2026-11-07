import { useState } from "react";
import {
  Archive, Award, CalendarDays, ChevronRight, CircleDot, Disc, Film, Gamepad2, Gift,
  Home, LockKeyhole, LogIn, Play, Settings, Shield, ShoppingBag, Sparkles, UserRound,
  Users, Zap, X,
} from "lucide-react";
import "./_group.css";
import "./TactileArcade.css";

// Craft reference: https://github.com/heydamir/unslop (CC BY 4.0); adapted to the user's visual constraints.
type Mode = {
  key: string; kind: "ranked" | "casual" | "variant" | "elite" | "gauntlet" | "challenge" | "arcade";
  name: string; sub: string; desc: string; group: "MATCH" | "SOLO" | "VARIANT" | "ELITE";
  lockIdx?: number; lockLabel?: string; partyLaunch: boolean;
};

const MODES: Mode[] = [
  { key: "ranked", kind: "ranked", name: "Ranked", sub: "4 seats · 5 lives", desc: "Last paddle standing. Result moves your rank.", group: "MATCH", partyLaunch: true },
  { key: "casual", kind: "casual", name: "Casual", sub: "4 seats · no rank change", desc: "Same arena, no rank on the line.", group: "MATCH", partyLaunch: true },
  { key: "arcade", kind: "arcade", name: "Survival Run", sub: "Solo · arcade", desc: "Deflect as long as you can. Speed ramps up.", group: "SOLO", partyLaunch: false },
  { key: "challenge", kind: "challenge", name: "Daily Challenge", sub: "Solo · seeded", desc: "Today's seed, same for every player.", group: "SOLO", partyLaunch: false },
  { key: "duos", kind: "variant", name: "Duos", sub: "2v2 teams", desc: "Bottom and right versus top and left.", group: "VARIANT", partyLaunch: true },
  { key: "blitz", kind: "variant", name: "Blitz", sub: "1 life · fast", desc: "One goal against and you are out.", group: "VARIANT", partyLaunch: true },
  { key: "chaos", kind: "variant", name: "Chaos", sub: "5 balls · no power-ups", desc: "Five balls from the start.", group: "VARIANT", partyLaunch: true },
  { key: "survival", kind: "variant", name: "Survival", sub: "12 lives", desc: "Long match, deep life pool.", group: "VARIANT", partyLaunch: true },
  { key: "sudden_death", kind: "variant", name: "Sudden Death", sub: "1 life · 3 balls", desc: "No margin for error.", group: "VARIANT", partyLaunch: true },
  { key: "turbo", kind: "variant", name: "Turbo", sub: "1.8x speed", desc: "Full speed from the first second.", group: "VARIANT", partyLaunch: true },
  { key: "pinball", kind: "variant", name: "Pinball", sub: "Ball every 3s", desc: "Up to 8 balls in play.", group: "VARIANT", partyLaunch: true },
  { key: "six_player", kind: "variant", name: "6-Player", sub: "6 zones · split walls", desc: "Split walls, six paddles.", group: "VARIANT", partyLaunch: true },
  { key: "gauntlet", kind: "gauntlet", name: "Champion's Gauntlet", sub: "Multi-round run", desc: "Survive consecutive rounds across variants.", group: "ELITE", lockIdx: 9, lockLabel: "Diamond+", partyLaunch: false },
  { key: "storm_surge", kind: "elite", name: "Storm Surge", sub: "3 balls · 1 life", desc: "Max-skill opponents. 2x XP and coins.", group: "ELITE", lockIdx: 12, lockLabel: "Master 1+", partyLaunch: true },
  { key: "ghost_protocol", kind: "elite", name: "Ghost Protocol", sub: "Balls vanish", desc: "Balls turn invisible mid-flight. 3x XP and coins.", group: "ELITE", lockIdx: 15, lockLabel: "Champion 1+", partyLaunch: true },
  { key: "warlord", kind: "elite", name: "Warlord", sub: "1 vs 5", desc: "Six players, 8 lives for you. 5x XP and coins.", group: "ELITE", lockIdx: 17, lockLabel: "Champion 3+", partyLaunch: true },
];
const groups: Mode["group"][] = ["MATCH", "SOLO", "VARIANT", "ELITE"];
const groupLabels: Record<Mode["group"], string> = { MATCH: "Four-seat match", SOLO: "Solo", VARIANT: "Variants", ELITE: "Elite" };
const supers = [
  { name: "Rampart", Icon: Shield, desc: "Goal blocked 3 seconds" },
  { name: "Dead Zone", Icon: CircleDot, desc: "Incoming balls move at crawl speed" },
  { name: "Shatter", Icon: Sparkles, desc: "Ball that scores vanishes from play" },
];
const tiers = [
  ["Rookie", "50 coins", "01", "0"], ["Contender", "100 coins", "02", "5"],
  ["Fighter", "Rush Crate", "03", "10"], ["Warrior", "Plasma skin", "04", "20"],
  ["Champion", "Storm Vault", "05", "30"], ["Legend", "Frost skin", "06", "50"],
  ["Myth", "Shadow Coffer", "07", "75"], ["Immortal", "Cosmic skin", "08", "100"],
];
const tabs = [
  { label: "Home", Icon: Home }, { label: "Ranks", Icon: Award }, { label: "Profile", Icon: UserRound },
  { label: "Shop", Icon: ShoppingBag }, { label: "Gear", Icon: Archive },
  { label: "Pass", Icon: Gift }, { label: "Events", Icon: Zap },
];

function Button({ children, primary = false, small = false, disabled = false, icon, onClick }: {
  children: React.ReactNode; primary?: boolean; small?: boolean; disabled?: boolean; icon?: React.ReactNode; onClick?: () => void;
}) {
  return <button className={`gr-button${primary ? " primary" : ""}${small ? " small" : ""}`} disabled={disabled} onClick={onClick}>{icon}{children}</button>;
}
function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return <h2 className="gr-section-title"><span>{children}</span><i />{right}</h2>;
}
function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`gr-panel ${className}`}>{children}</div>;
}

export function TactileArcade() {
  const [selectedKey, setSelectedKey] = useState("ranked");
  const [notice, setNotice] = useState("");
  const selected = MODES.find((mode) => mode.key === selectedKey)!;
  const playerRankIdx = 6;
  const locked = selected.lockIdx !== undefined && playerRankIdx < selected.lockIdx;
  const playLabel = locked ? `Locked · ${selected.lockLabel}` : `Play ${selected.name}`;
  const arenaSize = Math.min(window.innerWidth - 32, 340);
  const announce = (message: string) => setNotice(message);

  return (
    <main className="tactile-arcade">
      <div className="gr-scroll">
        <header className="gr-header">
          <button className="gr-identity" aria-label="Profile, Riley, level 18" onClick={() => announce("Profile preview · navigation is prototype-only")}>
            <span className="gr-avatar"><Gamepad2 size={23} /></span>
            <span className="gr-player"><b>Riley</b><small>LV 18 · Gold 1</small></span>
          </button>
          <div className="gr-header-right">
            <div className="gr-wallet"><Disc size={14} /><b>2,450</b></div>
            <div className="gr-rank" aria-label="Gold 1 rank badge"><Award size={15} /><i>1</i></div>
            <button className="gr-icon-button" aria-label="Settings" onClick={() => announce("Settings preview · navigation is prototype-only")}><Settings size={18} /></button>
          </div>
        </header>
        <div className="gr-xp"><div className="gr-xp-track"><i /></div><span>1,250 XP to Gold 2</span></div>

        <div className="gr-brand" aria-label="GoldRush Arena">
          <div className="gr-brand-mark" aria-hidden="true">
            <span className="mark-paddle mark-top" /><span className="mark-paddle mark-right" />
            <span className="mark-paddle mark-bottom" /><span className="mark-paddle mark-left" />
            <span className="mark-ball" />
          </div>
          <div className="gr-brand-word"><h1>GOLD<span>RUSH</span></h1><small>FOUR SIDES. ONE LEFT.</small></div>
          <span className="gr-season-stamp" aria-label="Season 7 artwork preview">S7<br /><b>ART</b></span>
        </div>

        <section className="gr-arena" style={{ width: `${arenaSize}px`, height: `${arenaSize}px` }} aria-label="Static four-sided arena concept art">
          <div className="gr-arena-art">
            <div className="arena-frame"><div className="arena-inner">
              <span className="arena-axis axis-n">NORTH</span><span className="arena-axis axis-s">SOUTH</span>
              <span className="arena-axis axis-w">WEST</span><span className="arena-axis axis-e">EAST</span>
              <i className="arena-paddle paddle-n" /><i className="arena-paddle paddle-s" />
              <i className="arena-paddle paddle-w" /><i className="arena-paddle paddle-e" />
              <i className="arena-ball" /><span className="arena-cross" />
            </div></div>
            <div className="arena-label"><b>ARENA STUDY</b><small>Static concept art</small></div>
          </div>
        </section>
        <div className="gr-seats" style={{ width: `${arenaSize}px` }}>
          {["South", "North", "West", "East"].map((seat, i) => (
            <div className={`gr-seat seat-${i}`} key={seat}>
              <i style={{ background: ["#efbd3c", "#e56846", "#70b8a8", "#d0a45a"][i] }} />
              <div><b>{seat}</b><small>{i === 0 ? "You" : "Local bot"}</small></div>
            </div>
          ))}
        </div>
        <p className="gr-caption" style={{ width: `${arenaSize}px` }}>Local bot labels are illustrative only; this arena is static and does not run a match.</p>

        <section className="gr-block">
          <Panel className="gr-selected"><div><small className="gr-kicker">Selected mode</small><h2>{selected.name}</h2><p>{selected.sub} · {selected.desc}</p></div>{locked && <span className="gr-chip clay">{selected.lockLabel}</span>}</Panel>
          <Button primary disabled={locked} icon={locked ? <LockKeyhole size={20} /> : <Play size={20} fill="currentColor" />} onClick={() => announce("Prototype only · no match was launched")}>{playLabel}</Button>
          <p className="gr-demo-note">Preview only: actions do not start matches, connect players, save results, or grant rewards.</p>
        </section>

        <section className="gr-block gr-mode-catalog">
          {groups.map((group) => (
            <div className="gr-mode-group" key={group}>
              <SectionTitle>{groupLabels[group]}</SectionTitle>
              <div className="gr-mode-grid">{MODES.filter((mode) => mode.group === group).map((mode) => {
                const isLocked = mode.lockIdx !== undefined && playerRankIdx < mode.lockIdx;
                const isSelected = selected.key === mode.key;
                return <button key={mode.key} className={`gr-mode-cell${isSelected ? " selected" : ""}`} onClick={() => { setSelectedKey(mode.key); setNotice(""); }} aria-pressed={isSelected}>
                  <span>{isLocked && <LockKeyhole size={12} />}{mode.name}</span><small>{isLocked ? mode.lockLabel : mode.sub}</small>
                </button>;
              })}</div>
            </div>
          ))}
        </section>

        <section className="gr-block">
          <SectionTitle>Party / prototype</SectionTitle><p className="gr-body">Group up with a code, then the leader launches the match for everyone in the party.</p>
          <div className="gr-button-row">
            <Button icon={<Users size={15} />} onClick={() => announce("Prototype only · party creation is unavailable")}>Create party</Button>
            <Button icon={<LogIn size={15} />} onClick={() => announce("Prototype only · joining a party is unavailable")}>Join with code</Button>
          </div>
        </section>

        <section className="gr-block">
          <SectionTitle right={<span className="gr-meta">Charges after 10 blocks</span>}>Super ability</SectionTitle>
          <div className="gr-mode-grid gr-super-grid">{supers.map(({ name, Icon, desc }) => <div className={`gr-super-cell${name === "Rampart" ? " active" : ""}`} key={name}>
            <Icon size={20} strokeWidth={2} /><b>{name}</b><small>{desc}</small>
          </div>)}</div>
        </section>

        <section className="gr-block"><SectionTitle>Record / sample profile</SectionTitle>
          <Panel className="gr-stats"><div><b>42</b><small>Wins</small></div><div><b>56.8%</b><small>Win rate</small></div><div><b>3</b><small>Streak</small></div></Panel>
        </section>

        <section className="gr-event">
          <div className="gr-ticker"><span>SEASON 07</span> Gold Rush season board · preview content</div>
          <Panel className="gr-event-card">
            <div className="gr-event-top"><span>FEATURED / SEASON BOARD</span><b>PREVIEW</b></div>
            <h3>Gold Rush Championship</h3><p>Season event artwork and schedule preview.</p>
            <div className="gr-countdown"><small>EVENT STATUS</small><b>CONTENT PREVIEW</b></div>
          </Panel>
        </section>

        <section className="gr-block">
          <SectionTitle right={<span className="gr-meta">42 games · sample</span>}>Season track / sample</SectionTitle>
          <div className="gr-tiers">{tiers.map(([name, reward, icon, games], i) => <Panel className="gr-tier" key={name}>
            <span className="gr-tier-icon">{icon}</span><b>{name}</b><small>{games}+ games</small><p>{reward}</p>
            {i === 0 ? <Button small onClick={() => announce("Preview only · no item was claimed")}>Claim preview</Button> : <span className="gr-chip">Locked</span>}
          </Panel>)}</div>
        </section>

        <section className="gr-block gr-shortcuts">
          <button className="gr-link" onClick={() => announce("My clips preview · no clips are stored here")}><Film size={18} /><div><b>My clips</b><small>Saved match moments on this device</small></div><ChevronRight size={18} /></button>
          <button className="gr-link" onClick={() => announce("Streak preview · no daily reward claimed")}><CalendarDays size={18} /><div><b>Login streak · Day 4</b><span className="gr-streak">■■■■□□□</span></div><ChevronRight size={18} /></button>
        </section>
        <div className="gr-bottom-space" />
      </div>
      {notice && <div className="gr-toast" role="status"><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice("")}><X size={16} /></button></div>}
      <nav className="gr-tabbar" aria-label="Main navigation">{tabs.map(({ label, Icon }, index) => <button className={`gr-tab${index === 0 ? " active" : ""}`} key={label} aria-current={index === 0 ? "page" : undefined} onClick={() => index !== 0 && announce(`${label} preview · navigation is prototype-only`)}><span><Icon size={21} strokeWidth={2} /></span><small>{label}</small>{index === 0 && <i />}</button>)}</nav>
    </main>
  );
}
