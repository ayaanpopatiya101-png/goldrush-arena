import { useState } from "react";
import {
  Archive, Award, CalendarDays, ChevronRight, CircleDollarSign, Coins, Disc, Film,
  Gamepad2, Gem, Gift, Home, LockKeyhole, LogIn, Package, Palette, Play, Settings,
  Shield, ShoppingBag, Snowflake, Star, UserRound, Users, Zap,
} from "lucide-react";
import "./_group.css";

type Mode = {
  key: string; kind: "ranked" | "casual" | "variant" | "elite" | "gauntlet" | "challenge" | "arcade";
  name: string; sub: string; desc: string; group: "MATCH" | "SOLO" | "VARIANT" | "ELITE";
  lockIdx?: number; lockLabel?: string; partyLaunch: boolean;
};

// Kept verbatim from the mobile home screen's catalog (including ordering and gates).
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
const groupLabels: Record<Mode["group"], string> = {
  MATCH: "Four-seat match", SOLO: "Solo", VARIANT: "Variants", ELITE: "Elite",
};
const supers = [
  { name: "Rampart", icon: "shield", desc: "Goal blocked 3 seconds" },
  { name: "Dead Zone", icon: "◉", desc: "Incoming balls move at crawl speed" },
  { name: "Shatter", icon: "✣", desc: "Ball that scores vanishes from play" },
];
const tiers = [
  { name: "Rookie", reward: "50 coins", icon: Coins, games: "0" },
  { name: "Contender", reward: "100 coins", icon: CircleDollarSign, games: "5" },
  { name: "Fighter", reward: "Rush Crate", icon: Package, games: "10" },
  { name: "Warrior", reward: "Plasma skin", icon: Palette, games: "20" },
  { name: "Champion", reward: "Storm Vault", icon: Zap, games: "30" },
  { name: "Legend", reward: "Frost skin", icon: Snowflake, games: "50" },
  { name: "Myth", reward: "Shadow Coffer", icon: Gem, games: "75" },
  { name: "Immortal", reward: "Cosmic skin", icon: Star, games: "100" },
];
const tabs = [
  { label: "Home", Icon: Home }, { label: "Ranks", Icon: Award }, { label: "Profile", Icon: UserRound },
  { label: "Shop", Icon: ShoppingBag }, { label: "Gear", Icon: Archive },
  { label: "Pass", Icon: Gift }, { label: "Events", Icon: Zap },
];

function Button({ children, primary = false, small = false, disabled = false, icon }: {
  children: React.ReactNode; primary?: boolean; small?: boolean; disabled?: boolean; icon?: React.ReactNode;
}) {
  return <button className={`gr-button${primary ? " primary" : ""}${small ? " small" : ""}`} disabled={disabled}>{icon}{children}</button>;
}

function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return <div className="gr-section-title"><span>{children}</span><i />{right}</div>;
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`gr-panel ${className}`}>{children}</div>;
}

export function Current() {
  const [selectedKey, setSelectedKey] = useState("ranked");
  const selected = MODES.find((mode) => mode.key === selectedKey)!;
  // Static demo profile matches the source's rank-gated catalog behavior; all actions remain local.
  const playerRankIdx = 6; // Gold 1
  const locked = selected.lockIdx !== undefined && playerRankIdx < selected.lockIdx;
  const playLabel = locked ? `Locked · ${selected.lockLabel}` : `Play ${selected.name}`;
  const arenaSize = Math.min(window.innerWidth - 32, window.innerWidth > 700 ? 340 : Math.max(220, window.innerHeight * 0.28));

  return (
    <main className="tactile-arcade">
      <div className="gr-scroll">
        <header className="gr-header">
          <button className="gr-identity" aria-label="Profile, Riley, level 18">
            <span className="gr-avatar"><Gamepad2 size={23} /></span>
            <span className="gr-player"><b>Riley</b><small>LV 18 · Gold 1</small></span>
          </button>
          <div className="gr-header-right">
            <div className="gr-wallet"><Disc size={14} color="var(--gr-ochre)" /><b>2,450</b></div>
            <div className="gr-rank" aria-label="Gold 1 rank badge"><Award size={15} /><i>1</i></div>
            <button className="gr-icon-button" aria-label="Settings"><Settings size={18} /></button>
          </div>
        </header>
        <div className="gr-xp">
          <div className="gr-xp-track"><i /></div>
          <span>1,250 XP to Gold 2</span>
        </div>

        <section className="gr-arena" style={{ width: `${arenaSize}px`, height: `${arenaSize}px` }}>
          <div className="gr-arena-empty">
            <span>ARENA PREVIEW PAUSED</span>
            <small>Original GameArena engine isn't running in this static extraction.</small>
          </div>
        </section>
        <div className="gr-seats" style={{ width: `${arenaSize}px` }}>
          {["South", "North", "West", "East"].map((seat, i) => (
            <div className={`gr-seat seat-${i}`} key={seat}>
              <i style={{ background: ["#F0B429", "#E04A2F", "#EDE3CC", "#9CC93E"][i] }} />
              <div><b>{seat}</b><small>{i === 0 ? "You" : "Local bot"}</small></div>
            </div>
          ))}
        </div>
        <p className="gr-caption" style={{ width: `${arenaSize}px` }}>Practice preview is paused. Nothing here counts toward rank or rewards.</p>

        <section className="gr-block">
          <Panel className="gr-selected">
            <div><small className="gr-kicker">Selected mode</small><h1>{selected.name}</h1>
              <p>{selected.sub} · {selected.desc}</p></div>
            {locked && <span className="gr-chip clay">{selected.lockLabel}</span>}
          </Panel>
          <Button primary disabled={locked} icon={locked ? <LockKeyhole size={20} /> : <Play size={20} fill="currentColor" />}>{playLabel}</Button>
          <p className="gr-demo-note">Preview only · Play and navigation do not launch a match.</p>
        </section>

        <section className="gr-block gr-mode-catalog">
          {groups.map((group) => (
            <div className="gr-mode-group" key={group}>
              <SectionTitle>{groupLabels[group]}</SectionTitle>
              <div className="gr-mode-grid">
                {MODES.filter((mode) => mode.group === group).map((mode) => {
                  const isLocked = mode.lockIdx !== undefined && playerRankIdx < mode.lockIdx;
                  const isSelected = selected.key === mode.key;
                  return (
                    <button key={mode.key} className={`gr-mode-cell${isSelected ? " selected" : ""}`} onClick={() => setSelectedKey(mode.key)} aria-pressed={isSelected}>
                      <span>{isLocked && <LockKeyhole size={12} />}{mode.name}</span>
                      <small>{isLocked ? mode.lockLabel : mode.sub}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <section className="gr-block">
          <SectionTitle>Party</SectionTitle>
          <p className="gr-body">Group up with a code, then the leader launches the match for everyone in the party.</p>
          <div className="gr-button-row">
            <Button icon={<Users size={15} />}>Create party</Button>
            <Button icon={<LogIn size={15} />}>Join with code</Button>
          </div>
          <p className="gr-demo-note">Demo preview · party actions are disabled</p>
        </section>

        <section className="gr-block">
          <SectionTitle right={<span className="gr-meta">Charges after 10 blocks</span>}>Super ability</SectionTitle>
          <div className="gr-mode-grid gr-super-grid">
            {supers.map(({ name, icon, desc }) => (
              <div className={`gr-super-cell${name === "Rampart" ? " active" : ""}`} key={name}>
                {icon === "shield" ? <Shield size={20} /> : <span className="gr-super-symbol">{icon}</span>}
                <b>{name}</b><small>{desc}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="gr-block">
          <SectionTitle>Record</SectionTitle>
          <Panel className="gr-stats">
            <div><b>42</b><small>Wins</small></div><div><b>56.8%</b><small>Win rate</small></div><div><b>3</b><small>Streak</small></div>
          </Panel>
        </section>

        <section className="gr-event">
          <div className="gr-ticker"><span>● LIVE</span> Season 7 now live, earn exclusive Gold Rush skins!</div>
          <Panel className="gr-event-card">
            <div className="gr-event-top"><span>⚡ &nbsp; FEATURED MODE</span><b>● ACTIVE NOW</b></div>
            <h2>Gold Rush Championship</h2>
            <p>Exclusive summer event, earn bonus rewards</p>
            <div className="gr-countdown"><small>ENDS IN</small><b>02 : 12 : 45 : 18</b></div>
          </Panel>
        </section>

        <section className="gr-block">
          <SectionTitle right={<span className="gr-meta">42 games played</span>}>Season track</SectionTitle>
          <div className="gr-tiers">
            {tiers.map(({ name, reward, icon: TierIcon, games }, i) => (
              <Panel className="gr-tier" key={name}>
                <TierIcon className="gr-tier-icon" size={18} strokeWidth={2} /><b>{name}</b><small>{games}+ games</small><p>{reward}</p>
                {i === 0 ? <Button small>Claim</Button> : <span className="gr-chip">Locked</span>}
              </Panel>
            ))}
          </div>
        </section>

        <section className="gr-block gr-shortcuts">
          <Panel className="gr-link"><Film size={18} /><div><b>My clips</b><small>Saved match moments on this device</small></div><ChevronRight size={18} /></Panel>
          <Panel className="gr-link"><CalendarDays size={18} /><div><b>Login streak · Day 4</b><span className="gr-streak">■■■■□□□</span></div></Panel>
        </section>
        <div className="gr-bottom-space" />
      </div>

      <nav className="gr-tabbar" aria-label="Main navigation">
        {tabs.map(({ label, Icon }, index) => (
          <button className={`gr-tab${index === 0 ? " active" : ""}`} key={label} aria-current={index === 0 ? "page" : undefined}>
            <span><Icon size={21} strokeWidth={2} /></span><small>{label}</small>{index === 0 && <i />}
          </button>
        ))}
      </nav>
      <style>{`
        .tactile-arcade .gr-scroll { padding-top: 75px; padding-bottom: 110px; overflow-x: hidden; }
        .tactile-arcade .gr-header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:0 16px; }
        .tactile-arcade .gr-identity { border:0; background:none; color:inherit; display:flex; align-items:center; gap:10px; min-width:0; padding:0; text-align:left; }
        .tactile-arcade .gr-avatar { width:44px; height:44px; border:2px solid #c99a2e; border-radius:3px; display:grid; place-items:center; background:var(--gr-graphite); color:var(--gr-paper); font-size:23px; }
        .tactile-arcade .gr-player { display:flex; flex-direction:column; min-width:0; }
        .tactile-arcade .gr-player b { font:700 22px/1.05 "Barlow Condensed",sans-serif; letter-spacing:.5px; }
        .tactile-arcade .gr-player small,.tactile-arcade .gr-meta { color:var(--gr-muted); font-size:12px; font-weight:600; }
        .tactile-arcade .gr-header-right { display:flex; align-items:center; gap:8px; }
        .tactile-arcade .gr-wallet { height:32px; border:1px solid var(--gr-line); border-radius:3px; padding:0 8px; display:flex; align-items:center; gap:5px; }
        .tactile-arcade .gr-wallet b { font:700 17px "Barlow Condensed",sans-serif; font-variant-numeric:tabular-nums; }
        .tactile-arcade .gr-rank { position:relative; width:28px; height:28px; border:2px solid #c99a2e; border-radius:50%; background:#c99a2e22; display:grid; place-items:center; font-size:13px; }
        .tactile-arcade .gr-rank i { position:absolute; right:-2px; bottom:-2px; width:13px; height:13px; border-radius:3px; background:#c99a2e; color:#0e2621; font:700 8px "Source Sans 3",sans-serif; text-align:center; line-height:11px; }
        .tactile-arcade .gr-icon-button { height:40px; width:40px; display:grid; place-items:center; background:transparent; border:1px solid var(--gr-line); border-radius:3px; color:var(--gr-paper-dim); }
        .tactile-arcade .gr-xp { margin:12px 16px 0; display:flex; flex-direction:column; gap:4px; color:var(--gr-muted); font-size:12px; }
        .tactile-arcade .gr-xp-track { height:4px; background:var(--gr-graphite2); }
        .tactile-arcade .gr-xp-track i { display:block; height:100%; width:62%; background:var(--gr-ochre); }
        .tactile-arcade .gr-arena { margin:14px auto 0; border:1px solid var(--gr-line-strong); border-radius:2px; background:var(--gr-ink); overflow:hidden; display:grid; place-items:center; }
        .tactile-arcade .gr-arena-empty { width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:8px; padding:24px; text-align:center; background:#0d211d; }
        .tactile-arcade .gr-arena-empty span { font:700 16px "Barlow Condensed",sans-serif; letter-spacing:1.5px; color:var(--gr-muted); }
        .tactile-arcade .gr-arena-empty small { color:var(--gr-muted); font-size:12px; max-width:240px; }
        .tactile-arcade .gr-seats { display:flex; width:min(calc(100vw - 32px),340px); margin:0 auto; border:1px solid var(--gr-line-strong); border-top:0; background:var(--gr-graphite); }
        .tactile-arcade .gr-seat { min-width:0; flex:1; display:flex; align-items:center; gap:6px; padding:8px; border-right:1px solid var(--gr-line); }
        .tactile-arcade .gr-seat:last-child { border-right:0; }
        .tactile-arcade .gr-seat>i { width:4px; height:24px; flex:none; }
        .tactile-arcade .gr-seat div { display:flex; flex-direction:column; min-width:0; }
        .tactile-arcade .gr-seat b { font:700 13px "Barlow Condensed",sans-serif; letter-spacing:1px; text-transform:uppercase; }
        .tactile-arcade .gr-seat small { color:var(--gr-muted); font-size:11px; }
        .tactile-arcade .gr-caption { width:min(calc(100vw - 32px),340px); margin:6px auto 0; color:var(--gr-muted); font-size:12px; line-height:16px; }
        .tactile-arcade .gr-block { margin:18px 0 0; padding:0 16px; }
        .tactile-arcade .gr-panel { background:var(--gr-graphite); border:1px solid var(--gr-line); border-radius:3px; }
        .tactile-arcade .gr-selected { display:flex; align-items:center; gap:10px; padding:12px; }
        .tactile-arcade .gr-selected>div { flex:1; min-width:0; }
        .tactile-arcade .gr-kicker { color:var(--gr-muted); font-size:11px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; }
        .tactile-arcade .gr-selected h1 { margin:0; font:700 28px/1.08 "Barlow Condensed",sans-serif; letter-spacing:.5px; text-transform:uppercase; }
        .tactile-arcade .gr-selected p { margin:2px 0 0; color:var(--gr-paper-dim); font-size:14px; }
        .tactile-arcade .gr-button { margin-top:8px; min-height:44px; display:inline-flex; gap:8px; align-items:center; justify-content:center; padding:0 16px; border:1px solid var(--gr-line); border-radius:3px; background:var(--gr-graphite2); color:var(--gr-paper); font:700 17px "Barlow Condensed",sans-serif; letter-spacing:1.2px; text-transform:uppercase; cursor:default; }
        .tactile-arcade .gr-block>.gr-button { width:100%; }
        .tactile-arcade .gr-button.primary { min-height:60px; border-color:var(--gr-ochre); background:var(--gr-ochre); color:var(--gr-ochre-ink); font-size:26px; letter-spacing:2px; }
        .tactile-arcade .gr-button:disabled { opacity:.4; }
        .tactile-arcade .gr-button.small { min-height:34px; padding:0 10px; font-size:14px; }
        .tactile-arcade .gr-chip { align-self:center; border:1px solid var(--gr-paper-dim); padding:2px 6px; color:var(--gr-paper-dim); font-size:11px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; }
        .tactile-arcade .gr-chip.clay { color:var(--gr-clay); border-color:var(--gr-clay); }
        .tactile-arcade .gr-section-title { display:flex; align-items:center; gap:10px; color:var(--gr-paper-dim); font:700 15px "Barlow Condensed",sans-serif; letter-spacing:1.6px; text-transform:uppercase; }
        .tactile-arcade .gr-section-title>i { height:1px; flex:1; background:var(--gr-line); }
        .tactile-arcade .gr-mode-group { margin-bottom:12px; }
        .tactile-arcade .gr-mode-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; margin-top:8px; }
        .tactile-arcade .gr-mode-cell { min-width:0; min-height:52px; padding:8px 10px; display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:1px; border:1px solid var(--gr-line); border-radius:3px; background:var(--gr-graphite); color:var(--gr-paper); text-align:left; cursor:pointer; }
        .tactile-arcade .gr-mode-cell.selected { padding:7px 9px; border:2px solid var(--gr-ochre); }
        .tactile-arcade .gr-mode-cell>span { display:flex; align-items:center; gap:6px; max-width:100%; overflow:hidden; white-space:nowrap; font:700 17px "Barlow Condensed",sans-serif; letter-spacing:.5px; text-transform:uppercase; }
        .tactile-arcade .gr-mode-cell.selected>span { color:var(--gr-ochre); }
        .tactile-arcade .gr-mode-cell>small { color:var(--gr-muted); max-width:100%; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-size:12px; }
        .tactile-arcade .gr-body { margin:10px 0 8px; color:var(--gr-paper-dim); font-size:14px; line-height:19px; }
        .tactile-arcade .gr-button-row { display:flex; gap:8px; }
        .tactile-arcade .gr-button-row .gr-button { flex:1; }
        .tactile-arcade .gr-demo-note { margin:5px 0 0; color:var(--gr-muted); font-size:11px; }
        .tactile-arcade .gr-super-grid { grid-template-columns:repeat(3,minmax(0,1fr)); margin-top:10px; }
        .tactile-arcade .gr-super-cell { min-width:0; padding:10px; display:flex; flex-direction:column; gap:2px; border:1px solid var(--gr-line); border-radius:3px; background:var(--gr-graphite); color:var(--gr-paper-dim); }
        .tactile-arcade .gr-super-cell.active { border-color:var(--gr-ochre); }
        .tactile-arcade .gr-super-cell.disabled { opacity:.5; }
        .tactile-arcade .gr-super-cell>svg,.tactile-arcade .gr-super-symbol { height:20px; color:var(--gr-ochre); }
        .tactile-arcade .gr-super-cell b { font:700 17px "Barlow Condensed",sans-serif; text-transform:uppercase; }
        .tactile-arcade .gr-super-cell small { color:var(--gr-muted); font-size:12px; line-height:1.2; }
        .tactile-arcade .gr-stats { margin-top:10px; display:flex; }
        .tactile-arcade .gr-stats>div { flex:1; padding:10px 12px; border-right:1px solid var(--gr-line); display:flex; flex-direction:column; }
        .tactile-arcade .gr-stats>div:last-child { border:0; }
        .tactile-arcade .gr-stats b { font:700 26px "Barlow Condensed",sans-serif; font-variant-numeric:tabular-nums; }
        .tactile-arcade .gr-stats small { color:var(--gr-muted); font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; }
        .tactile-arcade .gr-event { margin:18px 0 0; padding:0 16px; }
        .tactile-arcade .gr-ticker { margin-bottom:10px; padding:8px 12px; display:flex; align-items:center; gap:8px; border-radius:3px; background:#f3ead308; color:#f3ead3cc; font-size:11px; }
        .tactile-arcade .gr-ticker span { padding:2px 6px; border-radius:3px; background:#e04a2f22; color:var(--gr-clay); font-size:9px; font-weight:700; letter-spacing:1px; white-space:nowrap; }
        .tactile-arcade .gr-event-card { padding:16px; display:flex; flex-direction:column; gap:10px; border-color:#f0b42955; background:linear-gradient(130deg,#1e4a3f,#173a31 55%,#1e4a3f); }
        .tactile-arcade .gr-event-top,.tactile-arcade .gr-countdown { display:flex; justify-content:space-between; align-items:center; gap:8px; }
        .tactile-arcade .gr-event-top span { color:var(--gr-ochre); font-size:9px; font-weight:700; letter-spacing:1px; }
        .tactile-arcade .gr-event-top b { color:var(--gr-moss); font-size:8px; letter-spacing:.8px; }
        .tactile-arcade .gr-event-card h2 { margin:0; color:var(--gr-ochre); font-size:16px; line-height:1.2; }
        .tactile-arcade .gr-event-card p { margin:0; color:#f3ead388; font-size:11px; }
        .tactile-arcade .gr-countdown small { color:#f3ead355; font-size:9px; letter-spacing:1.5px; }
        .tactile-arcade .gr-countdown b { color:var(--gr-ochre); font-size:15px; font-variant-numeric:tabular-nums; letter-spacing:1px; }
        .tactile-arcade .gr-tiers { display:flex; gap:8px; overflow-x:auto; padding-top:10px; scrollbar-width:none; }
        .tactile-arcade .gr-tiers::-webkit-scrollbar { display:none; }
        .tactile-arcade .gr-tier { flex:0 0 132px; min-height:164px; padding:10px; display:flex; flex-direction:column; align-items:flex-start; gap:4px; }
        .tactile-arcade .gr-tier-icon { height:20px; color:var(--gr-ochre); }
        .tactile-arcade .gr-tier b { font:700 17px "Barlow Condensed",sans-serif; text-transform:uppercase; }
        .tactile-arcade .gr-tier small { color:var(--gr-muted); font-size:12px; }
        .tactile-arcade .gr-tier p { min-height:32px; margin:0; color:var(--gr-paper-dim); font-size:12px; font-weight:600; }
        .tactile-arcade .gr-tier .gr-chip { margin-top:3px; }
        .tactile-arcade .gr-shortcuts { display:flex; flex-direction:column; gap:8px; }
        .tactile-arcade .gr-link { min-height:60px; padding:12px; display:flex; align-items:center; gap:12px; color:var(--gr-paper-dim); }
        .tactile-arcade .gr-link>div { flex:1; display:flex; flex-direction:column; }
        .tactile-arcade .gr-link b { color:var(--gr-paper); font:700 17px "Barlow Condensed",sans-serif; text-transform:uppercase; }
        .tactile-arcade .gr-link small { color:var(--gr-muted); font-size:12px; }
        .tactile-arcade .gr-streak { margin-top:6px; color:var(--gr-ochre); letter-spacing:2px; font-size:12px; }
        .tactile-arcade .gr-bottom-space { height:10px; }
        .tactile-arcade .gr-tabbar { position:fixed; z-index:10; left:0; right:0; bottom:0; height:84px; padding:0 6px; display:flex; justify-content:space-around; background:rgba(14,38,33,.97); border-top:1px solid #f3ead314; }
        .tactile-arcade .gr-tab { position:relative; flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; padding:6px 0 0; border:0; background:none; color:#b8b5aa; }
        .tactile-arcade .gr-tab>span { width:44px; height:30px; display:grid; place-items:center; border-radius:3px; }
        .tactile-arcade .gr-tab.active { color:var(--gr-ochre); }
        .tactile-arcade .gr-tab.active>span { background:#f0b42922; }
        .tactile-arcade .gr-tab small { font-size:11px; letter-spacing:.5px; }
        .tactile-arcade .gr-tab>i { width:18px; height:2.5px; margin-top:1px; border-radius:2px; background:var(--gr-ochre); }
        @media (max-width:350px) {
          .tactile-arcade .gr-seat { padding:7px 5px; gap:4px; }
          .tactile-arcade .gr-tabbar { padding:0 1px; }
        }
      `}</style>
    </main>
  );
}
