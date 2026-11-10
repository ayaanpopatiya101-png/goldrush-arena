// Home direction, redesigned from the copied Current.tsx extraction.
// Catalog, rank gates, sample provider and owned cosmetic identities stay intact.
import './Home.css';
import React, { useEffect, useRef, useState } from 'react';
import { Award, ChevronDown, ChevronRight, CalendarDays, Archive, ShoppingBag, UserRound, Play, Settings, UsersRound, MoreHorizontal, X, SlidersHorizontal, Shield, LockKeyhole } from 'lucide-react';
import { SampleStateProvider } from './_deps/adapters';
import { useParty } from './_deps/state';
import { getRankIndex, SKINS, SUPERS, SEASON_TIERS, usePlayer, xpForNextRank, xpToLevel } from './_deps/player';
import { CURRENT_SEASON } from './_deps/season';

type Mode = {
  key: string; name: string; sub: string; desc: string;
  group: 'MATCH' | 'SOLO' | 'VARIANT' | 'ELITE';
  lockIdx?: number; lockLabel?: string;
};
// Existing modes and progression gates copied from Current. No new rules.
const MODES: Mode[] = [
  { key: 'ranked', name: 'Ranked', sub: '4 seats · 5 lives', desc: 'Last paddle standing. Earn XP and build your separate seasonal skill rating. Five placement games.', group: 'MATCH' },
  { key: 'casual', name: 'Casual', sub: '4 seats · level unchanged', desc: 'Earns account XP, which still counts toward your XP rank. Competitive level does not change.', group: 'MATCH' },
  { key: 'practice', name: 'Practice', sub: 'Safe controls · no rewards', desc: 'Test paddle sensitivity against easy local bots. No progression or bank lives.', group: 'SOLO' },
  { key: 'arcade', name: 'Survival Run', sub: 'Solo · arcade', desc: 'Deflect as long as you can. Speed ramps up.', group: 'SOLO' },
  { key: 'challenge', name: 'Daily Challenge', sub: 'Solo · seeded', desc: "Today's seed, same for every player.", group: 'SOLO' },
  { key: 'duos', name: 'Duos', sub: '2v2 teams', desc: 'Bottom and right versus top and left.', group: 'VARIANT' },
  { key: 'blitz', name: 'Blitz', sub: '1 life · fast', desc: 'One goal against and you are out.', group: 'VARIANT' },
  { key: 'chaos', name: 'Chaos', sub: '5 balls · no power-ups', desc: 'Five balls from the start.', group: 'VARIANT' },
  { key: 'survival', name: 'Survival', sub: '12 lives', desc: 'Long match, deep life pool.', group: 'VARIANT' },
  { key: 'sudden_death', name: 'Sudden Death', sub: '1 life · 3 balls', desc: 'No margin for error.', group: 'VARIANT' },
  { key: 'turbo', name: 'Turbo', sub: '1.8x speed', desc: 'Full speed from the first second.', group: 'VARIANT' },
  { key: 'pinball', name: 'Pinball', sub: 'Ball every 3s', desc: 'Up to 8 balls in play.', group: 'VARIANT' },
  { key: 'six_player', name: '6-Player', sub: '6 zones · split walls', desc: 'Split walls, six paddles.', group: 'VARIANT' },
  { key: 'gauntlet', name: "Champion's Gauntlet", sub: 'First to 5 round wins', desc: 'Rounds across variants. A lost round does not end the run; a bot reaching 5 wins does.', group: 'ELITE', lockIdx: 9, lockLabel: 'Diamond+' },
  { key: 'storm_surge', name: 'Storm Surge', sub: '3 balls · 1 life', desc: 'Max-skill opponents. 2x XP and coins.', group: 'ELITE', lockIdx: 12, lockLabel: 'Master 1+' },
  { key: 'ghost_protocol', name: 'Ghost Protocol', sub: 'Balls vanish', desc: 'Balls turn invisible mid-flight. 3x XP and coins.', group: 'ELITE', lockIdx: 15, lockLabel: 'Champion 1+' },
  { key: 'warlord', name: 'Warlord', sub: '1 vs 5', desc: 'Six players, 8 lives for you. 5x XP and coins.', group: 'ELITE', lockIdx: 17, lockLabel: 'Champion 3+' },
];
const DESTINATIONS = [
  ['Ranks', '/leaderboard'], ['Settings', '/settings'],
  ['Season pass & Trophy Road', '/trophyroad'],
  ['Full-screen warm-up', '/warmup'], ['Practice', '/practice'],
  ['Survival Run', '/arcade'], ['My clips', '/my-clips'],
] as const;

function PreviewDialog({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);
  return <dialog ref={ref} className="gr-dialog" aria-labelledby="gr-dialog-title"
    onCancel={event => { event.preventDefault(); closeRef.current(); }}
    onClick={event => { if (event.target === event.currentTarget) closeRef.current(); }}>
    <div className="gr-dialog-head"><h2 id="gr-dialog-title">{title}</h2><button className="gr-icon" aria-label="Close" onClick={close}><X size={20} /></button></div>
    <div className="gr-dialog-body">{children}</div>
  </dialog>;
}

function PaddleDisplay({ color }: { color: string }) {
  return <svg className="gr-paddle" viewBox="0 0 400 250" role="img" aria-label="Your equipped Classic paddle, shown as a dimensional display illustration">
    {/* Original illustration, not game footage or a new purchasable item. */}
    <g fill="none" stroke="#EEE9DE" opacity=".19" strokeWidth="1">
      <path d="M66 59 270 40 348 170 144 190Z" />
      <path d="m86 73 171-16 65 101-171 17Z" />
      <path d="m105 123 203-19M182 49l78 131" />
      <ellipse cx="207" cy="116" rx="29" ry="20" transform="rotate(-6 207 116)" />
    </g>
    <text x="53" y="162" fontSize="120" fontFamily="BarlowCondensed_700Bold" fill="#EEE9DE" opacity=".055">GR</text>
    <path d="m62 163 262-29 30 25-266 32Z" fill="#252A2B" opacity=".38" />
    <g transform="rotate(-12 200 130)">
      <path d="M57 106 333 106 345 119 345 153 69 153 57 140Z" fill="#252A2B" stroke="#252A2B" strokeWidth="2" />
      <path d="m57 133 276 0 12 12-276 0Z" fill="#E3DFD3" />
      <path d="m333 106 12 13v26l-12-12Z" fill="#575D5C" />
      <rect x="57" y="102" width="276" height="34" rx="3" fill={color} stroke="#252A2B" strokeWidth="2" />
      <path d="M66 108h258" stroke="#EEE9DE" strokeWidth="2" opacity=".5" />
      <path d="M66 130h258" stroke="#252A2B" opacity=".35" />
      <text x="196" y="124" fill="#252A2B" textAnchor="middle" fontSize="12" fontFamily="BarlowCondensed_700Bold" letterSpacing="4">GOLDRUSH</text>
    </g>
    <g stroke="#EDBA3C" strokeWidth="1" fill="none"><path d="m286 191 31-13h28M97 76l-23-9H49" /></g>
    <text x="347" y="181" fill="#EEE9DE" fontSize="8" textAnchor="end" fontFamily="SourceSans3_400Regular" letterSpacing="1">01</text>
  </svg>;
}

function HomeDesign() {
  const { profile, setSelectedSuper, claimSeasonTier } = usePlayer();
  const { partyCode, createParty, joinParty, leaveParty } = useParty();
  const [selectedKey, setSelectedKey] = useState('ranked');
  const [sheet, setSheet] = useState<'modes' | 'lobby' | 'party' | 'progress' | 'more' | 'destination' | null>(null);
  const [destination, setDestination] = useState({ title: '', path: '' });
  const [partyInput, setPartyInput] = useState('');
  const [partyMessage, setPartyMessage] = useState('');
  const [loadoutMessage, setLoadoutMessage] = useState('');
  const selected = MODES.find(mode => mode.key === selectedKey) ?? MODES[0];
  const skin = SKINS.find(item => item.id === profile.currentSkin) ?? SKINS[0];
  const rank = xpForNextRank(profile.xp);
  const locked = (mode: Mode) => mode.lockIdx != null && getRankIndex(profile.rank) < mode.lockIdx;
  const openDestination = (title: string, path: string) => { setDestination({ title, path }); setSheet('destination'); };
  const close = () => setSheet(null);
  const ability = SUPERS.find(item => item.id === profile.selectedSuper);
  const isSolo = ['practice', 'arcade', 'challenge'].includes(selected.key);
  return <div className="gr-home" data-sample-state="Isolated sample data; no purchases, game engine, matchmaking or real navigation">
    <div className="gr-preview">Home design preview · Sample data</div>
    <main className="gr-shell">
      <header className="gr-header">
        <button className="gr-identity" onClick={() => openDestination('Profile', '/profile')} aria-label="Open sample player profile">
          <span className="gr-avatar" aria-hidden="true">P</span>
          <span><strong>{profile.name}</strong><span className="gr-small">LV {xpToLevel(profile.xp)} · {profile.rank}</span></span>
        </button>
        <div className="gr-tools">
          <span className="gr-wallet" aria-label={`${profile.coins} sample coins`}><i className="gr-coin" aria-hidden="true">G</i>{profile.coins.toLocaleString()}</span>
          <button className="gr-icon" aria-label="Ranks" onClick={() => openDestination('Ranks', '/leaderboard')}><Award size={20} /></button>
          <button className="gr-icon" aria-label="Settings" onClick={() => openDestination('Settings', '/settings')}><Settings size={20} /></button>
        </div>
      </header>
      <div className="gr-brand">
        <div><h1>GOLD<span>RUSH</span> ARENA</h1><p>FOUR SIDES. ONE LEFT.</p></div>
        <div className="gr-edition">PADDLE<br />SPORT / 01</div>
      </div>
      <div className="gr-layout">
        <section className="gr-stage" aria-label="Equipped paddle showcase">
          <div className="gr-stage-heading"><div className="gr-kicker">Your paddle</div><h2>{skin.name}</h2></div>
          <span className="gr-owned">EQUIPPED</span>
          <PaddleDisplay color={skin.color} />
          <div className="gr-stage-bottom">
            <small>01 / OWNED COLLECTION<br />Display illustration</small>
            <button onClick={() => openDestination('Collection', '/inventory')}><SlidersHorizontal size={15} /> CUSTOMIZE</button>
          </div>
        </section>
        <section aria-label="Match selection">
          <div className="gr-progress">
            <span className="gr-rank"><Award size={22} /></span>
            <div className="gr-progress-copy">
              <div className="gr-progress-label"><b>{rank.current.toUpperCase()}</b><span>{rank.remaining.toLocaleString()} XP to {rank.next ?? 'top rank'}</span></div>
              <div className="gr-track" role="progressbar" aria-label="XP rank progress" aria-valuenow={Math.round(rank.progress * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${rank.progress * 100}%` }} /></div>
            </div>
          </div>
          <button className="gr-mode" onClick={() => setSheet('modes')} aria-label={`Change mode. Selected ${selected.name}`} aria-haspopup="dialog">
            <span className="gr-mode-mark">{locked(selected) ? <LockKeyhole size={26} /> : <Shield size={27} strokeWidth={1.7} />}</span>
            <span className="gr-mode-copy"><span>SELECTED MODE</span><strong>{selected.name}</strong><small>{selected.sub}</small></span>
            <span className="gr-change"><ChevronDown size={19} />CHANGE</span>
          </button>
          <button className="gr-play" disabled={locked(selected)} onClick={() => setSheet('lobby')} aria-label={locked(selected) ? `Locked. Requires ${selected.lockLabel}` : `Play ${selected.name}. Open local lobby preview`}>
            {locked(selected) ? <LockKeyhole size={25} /> : <Play size={26} fill="currentColor" />}
            {locked(selected) ? selected.lockLabel : 'PLAY'}
          </button>
          <p className="gr-honesty">Preview only. Play opens a local {isSolo ? 'mode' : 'lobby'} preview.</p>
          <div className="gr-secondary">
            <button onClick={() => setSheet('party')}><UsersRound size={18} />{partyCode ? 'Sample party' : 'Party up'}</button>
            <button onClick={() => setSheet('progress')}><Award size={18} />Loadout & progress</button>
            <button aria-label="More destinations" onClick={() => setSheet('more')}><MoreHorizontal size={22} /></button>
          </div>
        </section>
      </div>
    </main>
    <nav className="gr-nav" aria-label="Main navigation">
      {[
        { title: 'Play', path: '/', Icon: Play },
        { title: 'Events', path: '/events', Icon: CalendarDays },
        { title: 'Collection', path: '/inventory', Icon: Archive },
        { title: 'Shop', path: '/shop', Icon: ShoppingBag },
        { title: 'Profile', path: '/profile', Icon: UserRound },
      ].map(({ title, path, Icon }) => <button key={title} aria-current={title === 'Play' ? 'page' : undefined} onClick={() => title === 'Play' ? window.scrollTo({ top: 0 }) : openDestination(title, path)}><Icon size={22} strokeWidth={1.8} /><span>{title}</span></button>)}
    </nav>

    {sheet === 'modes' && <PreviewDialog title="Choose your mode" close={close}>
      <p>Quick match or a different kind of rally. Select a mode to return Home.</p>
      {(['MATCH', 'SOLO', 'VARIANT', 'ELITE'] as const).map(group => <section key={group}>
        <h3>{({ MATCH: 'Play', SOLO: 'Solo', VARIANT: 'Mix it up', ELITE: 'Elite · rank gated' })[group]}</h3>
        <div className="gr-mode-list" role="radiogroup" aria-label={`${group} modes`}>
          {MODES.filter(mode => mode.group === group).map(mode => <button key={mode.key} className="gr-choice" role="radio" aria-checked={selectedKey === mode.key} onClick={() => { setSelectedKey(mode.key); close(); }}>
            <strong>{locked(mode) && <LockKeyhole size={12} aria-label="Locked" />} {mode.name}</strong><small>{locked(mode) ? `Requires ${mode.lockLabel}` : mode.sub}</small>
          </button>)}
        </div>
      </section>)}
    </PreviewDialog>}
    {sheet === 'lobby' && <PreviewDialog title={`${selected.name} preview`} close={close}>
      <p className="gr-status">Local design preview. No connection, countdown or match is running.</p>
      <div className="gr-lobby"><span className="gr-kicker">{isSolo ? 'Solo mode' : 'Lobby layout'}</span><br /><strong>{selected.name.toUpperCase()}</strong>
        <div className="gr-seat"><span>{profile.name} · {skin.name}</span><b>SAMPLE / YOU</b></div>
        {!isSolo && ['North', 'West', 'East', ...(selected.key === 'six_player' || selected.key === 'warlord' ? ['Seat 5', 'Seat 6'] : [])].map(seat => <div className="gr-seat" key={seat}><span>{seat}</span><span>Unoccupied</span></div>)}
      </div>
      <p>{selected.desc}</p>
      <p className="gr-small">{selected.sub}. {selected.key === 'ranked' ? 'Production Ranked requires real players. No skill rating changes in this preview.' : 'No progression, coins or rewards change in this preview.'}</p>
      {selected.key === 'challenge' && <p className="gr-status">A server-issued daily seed is required in the app. This preview does not generate one.</p>}
      <button className="gr-dialog-action" onClick={close}>Back to Home</button>
    </PreviewDialog>}
    {sheet === 'destination' && <PreviewDialog title={destination.title} close={close}>
      <p className="gr-kicker" style={{ marginTop: 20 }}>Existing app destination</p>
      <h3>{destination.path}</h3>
      <p>This preview establishes the Home direction only. {destination.title} remains a separate screen in the app.</p>
      {destination.path === '/shop' && <p className="gr-status">Store unavailable here. No purchases or balances are connected.</p>}
      {destination.path === '/inventory' && <div className="gr-detail"><b>Equipped: {skin.name}</b><br />Your owned cosmetic stays unchanged. Customization is available in the app Collection.</div>}
      <button className="gr-dialog-action" onClick={close}>Back to Home</button>
    </PreviewDialog>}
    {sheet === 'more' && <PreviewDialog title="Around the arena" close={close}>
      <p>Existing destinations, kept within reach.</p>
      {DESTINATIONS.map(([title, path]) => <button key={path} className="gr-destination" onClick={() => openDestination(title, path)}>{title}<ChevronRight size={18} /></button>)}
    </PreviewDialog>}
    {sheet === 'party' && <PreviewDialog title="Party up" close={close}>
      <p>Try the local party layout. No other players or party server are connected.</p>
      {partyCode ? <>
        <div className="gr-detail"><span className="gr-kicker">Sample code, not an online invitation</span><h2>{partyCode}</h2><p>{profile.name} · Leader · 1 of 4 seats</p></div>
        <button className="gr-dialog-action" onClick={() => { leaveParty(); setPartyMessage('Left the local sample party.'); }}>Leave sample party</button>
      </> : <>
        <div className="gr-party-actions"><button className="gr-dialog-action" onClick={async () => { await createParty(); setPartyMessage('Local sample party created. Nobody is connected.'); }}>Create sample party</button></div>
        <label htmlFor="gr-party-code"><p>Or use the fixture code <b>SAMPLE</b></p></label>
        <input id="gr-party-code" value={partyInput} maxLength={6} autoComplete="off" placeholder="6-character code" onChange={event => setPartyInput(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
        <button className="gr-dialog-action" disabled={partyInput.length !== 6} onClick={async () => { const result = await joinParty(partyInput); setPartyMessage(result === 'joined' ? 'Joined the local sample fixture only.' : 'Sample party not found. Try SAMPLE.'); }}>Join sample</button>
      </>}
      {partyMessage && <p role="status" className="gr-status">{partyMessage}</p>}
    </PreviewDialog>}
    {sheet === 'progress' && <PreviewDialog title="Loadout & progress" close={close}>
      <p>Device-local sample profile. Changes reset when this preview reloads.</p>
      <h3>Super ability</h3><p>Charges after 10 blocks. Equipped: {ability?.name}.</p>
      <div className="gr-mode-list" role="radiogroup" aria-label="Super ability">
        {SUPERS.map(superAbility => <button className="gr-choice" role="radio" key={superAbility.id} aria-checked={profile.selectedSuper === superAbility.id} disabled={profile.level < superAbility.unlockLevel} onClick={() => { setSelectedSuper(superAbility.id); setLoadoutMessage(`${superAbility.name} equipped in sample profile.`); }}>
          <strong>{superAbility.name}</strong><small>{profile.level < superAbility.unlockLevel ? `Unlocks at LV ${superAbility.unlockLevel}` : superAbility.desc.replace('\n', ' ')}</small>
        </button>)}
      </div>
      <h3>Your record</h3><p>{profile.wins} wins · {profile.totalGames} games · {profile.winStreak} win streak</p>
      <h3>{CURRENT_SEASON.label} · Free season track</h3>
      {SEASON_TIERS.map((tier, index) => <div className="gr-destination" key={tier.name}>
        <span><b>{tier.name}</b><br /><span className="gr-small">{tier.games}+ games · {tier.reward}</span></span>
        <button className="gr-dialog-action" disabled={profile.totalGames < tier.games || profile.seasonPassClaimed.includes(index)} onClick={() => { claimSeasonTier(index); setLoadoutMessage(`${tier.name} reward claimed in sample data only.`); }}>
          {profile.seasonPassClaimed.includes(index) ? 'Claimed' : profile.totalGames >= tier.games ? 'Claim sample' : 'Locked'}
        </button>
      </div>)}
      {loadoutMessage && <p role="status" className="gr-status">{loadoutMessage}</p>}
      <button className="gr-destination" onClick={() => openDestination('Events', '/events')}><span>Events</span><CalendarDays size={18} /></button>
      <button className="gr-destination" onClick={() => openDestination('My clips', '/my-clips')}><span>My clips</span><ChevronRight size={18} /></button>
      <h3>Login streak</h3><p>Day {profile.loginStreak} · No streak reward is active in this fixture.</p>
    </PreviewDialog>}
  </div>;
}

export function Home() {
  return <SampleStateProvider><HomeDesign /></SampleStateProvider>;
}
export default Home;
