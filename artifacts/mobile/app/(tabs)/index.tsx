import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DailyStreakModal } from '@/components/DailyStreakModal';
import { AvatarPhoto } from '@/components/appearance/PhotoAvatarEditor';
import { GameArena } from '@/components/GameArena';
import { LiveEventBanner } from '@/components/LiveEventBanner';
import { Glyph } from '@/components/ui/Glyph';
import { Button, Chip, IconButton, Panel, SectionLabel, Shell, Stat, ui } from '@/components/ui/Primitives';
import { PLAYER_COLORS } from '@/constants/colors';
import { tactile } from '@/constants/colors';
import { CURRENT_SEASON } from '@/constants/season';
import { BrandMark } from '@/components/ui/BrandMark';
import { fonts } from '@/constants/typography';
import {
  RANKS, getRankIndex, SEASON_TIERS, SKINS, SUPERS, usePlayer, xpForNextRank, xpToLevel,
} from '@/context/PlayerContext';
import { useParty } from '@/context/PartyContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { setGameConfig } from '@/store/gameSession';
import type { GameVariant, MatchType } from '@/store/gameSession';
import { startGauntlet } from '@/store/gauntletSession';
import { fetchTodayChallenge } from '@/utils/dailyChallenge';
import { getDeviceId } from '@/utils/deviceId';

// ─── Mode catalog (all existing modes and rank gates preserved) ──────────────
type ModeKind = 'ranked' | 'casual' | 'practice' | 'variant' | 'elite' | 'gauntlet' | 'challenge' | 'arcade';
const PRIMARY_MODE_KINDS: readonly ModeKind[] = ['ranked', 'casual', 'practice'];
interface ModeDef {
  key: string;
  kind: ModeKind;
  variant?: GameVariant;
  name: string;
  sub: string;
  desc: string;
  group: 'MATCH' | 'SOLO' | 'VARIANT' | 'ELITE';
  lockIdx?: number;     // rank index required
  lockLabel?: string;
  partyLaunch: boolean; // leader can launch for party
}

const MODES: ModeDef[] = [
  { key: 'ranked', kind: 'ranked', name: 'Ranked', sub: '4 seats · 5 lives', desc: 'Last paddle standing. Earn XP and build your separate seasonal skill rating. Five placement games.', group: 'MATCH', partyLaunch: true },
  { key: 'casual', kind: 'casual', name: 'Casual', sub: '4 seats · level unchanged', desc: 'Earns account XP, which still counts toward your XP rank. Competitive level does not change.', group: 'MATCH', partyLaunch: true },
  { key: 'practice', kind: 'practice', name: 'Practice', sub: 'Safe controls · no rewards', desc: 'Test paddle sensitivity against easy local bots. No progression or bank lives.', group: 'SOLO', partyLaunch: false },
  { key: 'arcade', kind: 'arcade', name: 'Survival Run', sub: 'Solo · arcade', desc: 'Deflect as long as you can. Speed ramps up.', group: 'SOLO', partyLaunch: false },
  { key: 'challenge', kind: 'challenge', name: 'Daily Challenge', sub: 'Solo · seeded', desc: 'Today\'s seed, same for every player.', group: 'SOLO', partyLaunch: false },
  { key: 'duos', kind: 'variant', variant: 'duos', name: 'Duos', sub: '2v2 teams', desc: 'Bottom and right versus top and left.', group: 'VARIANT', partyLaunch: true },
  { key: 'blitz', kind: 'variant', variant: 'blitz', name: 'Blitz', sub: '1 life · fast', desc: 'One goal against and you are out.', group: 'VARIANT', partyLaunch: true },
  { key: 'chaos', kind: 'variant', variant: 'chaos', name: 'Chaos', sub: '5 balls · no power-ups', desc: 'Five balls from the start.', group: 'VARIANT', partyLaunch: true },
  { key: 'survival', kind: 'variant', variant: 'survival', name: 'Survival', sub: '12 lives', desc: 'Long match, deep life pool.', group: 'VARIANT', partyLaunch: true },
  { key: 'sudden_death', kind: 'variant', variant: 'sudden_death', name: 'Sudden Death', sub: '1 life · 3 balls', desc: 'No margin for error.', group: 'VARIANT', partyLaunch: true },
  { key: 'turbo', kind: 'variant', variant: 'turbo', name: 'Turbo', sub: '1.8x speed', desc: 'Full speed from the first second.', group: 'VARIANT', partyLaunch: true },
  { key: 'pinball', kind: 'variant', variant: 'pinball', name: 'Pinball', sub: 'Ball every 3s', desc: 'Up to 8 balls in play.', group: 'VARIANT', partyLaunch: true },
  { key: 'six_player', kind: 'variant', variant: 'six_player', name: '6-Player', sub: '6 zones · split walls', desc: 'Split walls, six paddles.', group: 'VARIANT', partyLaunch: true },
  { key: 'gauntlet', kind: 'gauntlet', name: 'Champion\'s Gauntlet', sub: 'First to 5 round wins', desc: 'Rounds across variants. A lost round does not end the run; a bot reaching 5 wins does.', group: 'ELITE', lockIdx: 9, lockLabel: 'Diamond+', partyLaunch: false },
  { key: 'storm_surge', kind: 'elite', variant: 'storm_surge', name: 'Storm Surge', sub: '3 balls · 1 life', desc: 'Max-skill opponents. 2x XP and coins.', group: 'ELITE', lockIdx: 12, lockLabel: 'Master 1+', partyLaunch: true },
  { key: 'ghost_protocol', kind: 'elite', variant: 'ghost_protocol', name: 'Ghost Protocol', sub: 'Balls vanish', desc: 'Balls turn invisible mid-flight. 3x XP and coins.', group: 'ELITE', lockIdx: 15, lockLabel: 'Champion 1+', partyLaunch: true },
  { key: 'warlord', kind: 'elite', variant: 'warlord', name: 'Warlord', sub: '1 vs 5', desc: 'Six players, 8 lives for you. 5x XP and coins.', group: 'ELITE', lockIdx: 17, lockLabel: 'Champion 3+', partyLaunch: true },
];

function opponentLabel(m: ModeDef): string {
  if (m.kind === 'arcade' || m.kind === 'challenge') return 'Solo, no opponents';
  if (m.kind === 'gauntlet') return 'Local bots, multi-round';
  if (m.kind === 'ranked') return 'Four real players';
  if (m.kind === 'casual' || (m.kind === 'variant' && m.variant !== 'six_player')) return 'Online, labeled AI fallback';
  return 'Local bots';
}

const PREVIEW_BOTS = ['Bot North', 'Bot West', 'Bot East'];
const PREVIEW_RANKS = ['Gold', 'Gold', 'Gold'];
const SEAT_NAMES = ['South', 'North', 'West', 'East'];

// ─── Live arena preview: the actual game engine, practice rules, no progression ─
function ArenaPreview({ size, playerColor }: { size: number; playerColor: string }) {
  const [focused, setFocused] = useState(true);
  // Practice is opt-in: it never mounts until the player asks, and stops when Home loses focus.
  const [started, setStarted] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => { setFocused(false); setStarted(false); }; }, []));
  const reduced = useReducedMotion();
  const [run, setRun] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const active = started && focused;
  const courtSize = Math.floor(size * 0.78);

  const restart = useCallback(() => setRun(r => r + 1), []);

  return (
    <View style={{ width: size, alignSelf: 'center' }}>
      <View style={[a.frame, { width: size, padding: Math.floor(size * 0.085) }]}>
        <View style={[a.brassFrame, { width: courtSize + 10, height: courtSize + 10 }]}>
        {active ? (
          <GameArena
            key={run}
            arenaSize={courtSize}
            courtStyle="tactile"
            playerName="You"
            playerColor={playerColor}
            playerGlowColor={playerColor}
            botNames={PREVIEW_BOTS}
            botRanks={PREVIEW_RANKS}
            onGameOver={restart}
            practice
            soundEnabled={false}
            colorBoard={false}
            botDifficulty="easy"
            paused={!focused || userPaused}
          />
        ) : (
          <View style={a.reducedBox}>
            <Text style={a.reducedText}>Try a rally on the real court: you on the south wall, three easy local bots. No rank or rewards.</Text>
            <Button testID="preview-start" label="Try a rally" size="sm" variant="secondary" icon="play"
              accessibilityHint={reduced ? 'Starts a moving practice court. Reduce Motion is on.' : 'Starts a practice court'}
              onPress={() => { setUserPaused(false); setStarted(true); }} />
          </View>
        )}
        </View>
        <View style={a.arenaLabel}>
          <Text style={a.arenaTitle}>ARENA PRACTICE</Text>
          <Text style={a.arenaMeta}>Live engine</Text>
        </View>
      </View>
      {/* Seat scoreboard: truthful identity for each paddle */}
      <View style={a.seats} accessibilityLabel="Preview seats: you at south, three local bots">
        {SEAT_NAMES.map((seat, i) => (
          <View key={seat} style={[a.seat, i < 3 && a.seatDivider]}>
            <View style={[a.seatSwatch, { backgroundColor: i === 0 ? playerColor : PLAYER_COLORS[i] }]} />
            <View style={{ flex: 1 }}>
              <Text style={a.seatPos}>{seat}</Text>
              <Text style={a.seatWho} numberOfLines={1}>{i === 0 ? 'You' : 'Local bot'}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={a.captionRow}>
        <Text style={[a.caption, { flex: 1 }]}>
          {active ? 'Drag along the bottom edge. On desktop, click and drag.' : 'Practice starts only when you press Try a rally.'}
        </Text>
        {active ? (
          <Button
            testID="preview-pause"
            label={userPaused ? 'Resume' : 'Pause'}
            size="sm"
            variant="ghost"
            icon={userPaused ? 'play' : 'pause'}
            accessibilityHint="Pauses or resumes the practice preview"
            onPress={() => setUserPaused(p => !p)}
          />
        ) : null}
        {active ? (
          <Button label="Stop" size="sm" variant="ghost" icon="square" onPress={() => setStarted(false)} />
        ) : null}
      </View>
      <Button label="Full-screen warm-up" variant="secondary" onPress={() => router.push('/warmup')} />
    </View>
  );
}

// ─── Home ────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const {
    profile, currentUsername, isLoaded, showStreakModal, dismissStreakModal,
    claimDailyStreak, claimSeasonTier, setSelectedSuper,
  } = usePlayer();
  const { partyCode, members: partyMembers, isInParty, isLeader, createParty, joinParty, leaveParty, launchParty } = useParty();

  const [selectedKey, setSelectedKey] = useState<string>(() => 'ranked');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joiningParty, setJoiningParty] = useState(false);
  const [creatingParty, setCreatingParty] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  const playerRankIdx = getRankIndex(profile.rank);
  const rankInfo = xpForNextRank(profile.xp);
  const rankData = RANKS.find(r => r.name === profile.rank) ?? RANKS[0];
  const skin = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0]!;
  const winRate = profile.totalGames > 0 ? ((profile.wins / profile.totalGames) * 100).toFixed(1) : null;
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const wide = width >= 900;
  const contentW = Math.min(width, 1160) - 36;
  // Approved composition: framed arena first on phones, alongside the play panel on desktop.
  const arenaSize = wide
    ? Math.max(240, Math.min(contentW - 460 - 24, height - topPad - 220, 520))
    : Math.min(contentW, 390);
  const panelW = wide ? 460 - 2 : contentW;
  const modeCellW = Math.floor((panelW - 6) / 2);
  const [showAllModes, setShowAllModes] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const selected = useMemo(() => MODES.find(m => m.key === selectedKey) ?? MODES[0]!, [selectedKey]);
  const isLocked = (m: ModeDef) => m.lockIdx != null && playerRankIdx < m.lockIdx;
  const waitingOnLeader = isInParty && !isLeader;
  const selectedLocked = isLocked(selected);
  const localOnly = selected.kind === 'elite' || selected.variant === 'six_player';
  const partyBlocks = waitingOnLeader && selected.partyLaunch && !localOnly;

  function baseConfig() {
    return {
      playerName: profile.name, playerSkinId: skin.id,
      playerColor: skin.color, playerGlowColor: skin.glowColor,
      playerRelicId: 'none' as const,
    };
  }

  async function launchMatch(matchType: MatchType, variant: GameVariant) {
    if (waitingOnLeader && !localOnly) return;
    setGameConfig({ ...baseConfig(), matchType, variant });
    if (isInParty && isLeader && !localOnly && !await launchParty({ matchType, variant })) {
      setChallengeError('The party could not launch. Check your connection and choose an online four-seat mode.');
      return;
    }
    router.push('/lobby');
  }

  function startGauntletRun() {
    const firstVariant = startGauntlet();
    setGameConfig({ ...baseConfig(), matchType: 'gauntlet', variant: firstVariant });
    router.push('/lobby');
  }

  async function startChallenge() {
    if (challengeLoading) return;
    setChallengeLoading(true);
    setChallengeError(null);
    try {
      const deviceId = await getDeviceId();
      const challenge = await fetchTodayChallenge(deviceId);
      // A server-issued nonce is required; an unseeded run would be ineligible.
      if (!challenge?.matchNonce || !challenge?.seedHash) {
        setChallengeError('Today\'s challenge could not be loaded. Check your connection and try again.');
        return;
      }
      setGameConfig({
        ...baseConfig(),
        matchType: 'casual',
        variant: 'survival',
        challengeSeed: challenge.seed ?? '',
        matchNonce: challenge.matchNonce ?? '',
        challengeSeedHash: challenge.seedHash ?? '',
        challengeStartSpeedMult: challenge.startSpeedMult,
        challengeRampRate: challenge.rampRate,
        bankLivesUsed: 0,
      });
      router.push('/game');
    } catch {
      setChallengeError('Today\'s challenge could not be loaded. Check your connection and try again.');
    } finally {
      setChallengeLoading(false);
    }
  }

  function handlePlay() {
    if (selectedLocked) return;
    switch (selected.kind) {
      case 'ranked': return launchMatch('ranked', 'classic');
      case 'casual': return launchMatch('casual', 'classic');
      case 'variant': return launchMatch('casual', selected.variant!);
      case 'elite': return launchMatch('ranked', selected.variant!);
      case 'gauntlet': return startGauntletRun();
      case 'challenge': return void startChallenge();
      case 'arcade': return router.push('/arcade');
      case 'practice': return router.push('/practice');
    }
  }

  async function handleClaimStreak() {
    await claimDailyStreak();
    dismissStreakModal();
  }

  async function handleCreateParty() {
    setCreatingParty(true);
    const code = await createParty();
    setCreatingParty(false);
    if (!code) { setJoinError('Could not create a party. Check your connection and try again.'); return; }
    try { await Share.share({ message: `Join my GoldRush Arena party. Party code: ${code}` }); }
    catch { /* share sheet dismissed */ }
  }

  async function handleJoinParty() {
    if (joinCode.length < 6) return;
    setJoiningParty(true);
    setJoinError(null);
    const result = await joinParty(joinCode);
    setJoiningParty(false);
    if (result === 'not_found') { setJoinError('Party not found. Check the code and try again.'); return; }
    if (result === 'full') { setJoinError('That party is full (4 players max).'); return; }
    if (result === 'error') { setJoinError('Could not connect. Try again.'); return; }
    setShowJoinInput(false);
    setJoinCode('');
  }

  async function handleShareParty() {
    if (!partyCode) return;
    try { await Share.share({ message: `Join my GoldRush Arena party. Party code: ${partyCode}` }); }
    catch { /* dismissed */ }
  }

  function confirmLeave() {
    if (Platform.OS === 'web') { leaveParty(); return; }
    Alert.alert('Leave party?', 'You will need the code to rejoin.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: leaveParty },
    ]);
  }

  if (!isLoaded) {
    return (
      <View style={[s.root, { paddingTop: topPad + 16, paddingHorizontal: 16, gap: 12 }]}>
        <View style={[s.skel, { height: 48 }]} />
        <View style={[s.skel, { height: arenaSize, width: arenaSize, alignSelf: 'center' }]} />
        <View style={[s.skel, { height: 60 }]} />
      </View>
    );
  }

  const playLabel = selectedLocked
    ? `Locked · ${selected.lockLabel}`
    : partyBlocks ? 'Leader picks the mode'
    : selected.kind === 'challenge' && challengeLoading ? 'Loading challenge'
    : isInParty && isLeader && selected.partyLaunch && !localOnly ? `Play ${selected.name} with party`
    : `Play ${selected.name}`;

  function renderMode(m: ModeDef) {
    const locked = isLocked(m);
    const on = m.key === selected.key;
    return (
      <Pressable
        key={m.key}
        onPress={() => setSelectedKey(m.key)}
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        aria-checked={on}
        accessibilityLabel={`${m.name}, ${m.sub}${locked ? `, requires ${m.lockLabel}` : ''}`}
        style={({ pressed }) => [s.modeCell, { width: modeCellW }, on && s.modeCellOn, pressed && { backgroundColor: ui.graphite2 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {locked ? <Feather name="lock" size={12} color={ui.paperDim} /> : null}
          <Text style={[s.modeName, on && { color: ui.charcoal }]} numberOfLines={1}>{m.name}</Text>
        </View>
        <Text style={s.modeSub} numberOfLines={1}>{locked ? `Requires ${m.lockLabel}` : m.sub}</Text>
      </Pressable>
    );
  }

  return (
    <View style={s.root}>
      <DailyStreakModal
        visible={showStreakModal}
        streak={profile.loginStreak}
        onClaim={handleClaimStreak}
        onDismiss={dismissStreakModal}
      />

      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        <Shell style={{ paddingHorizontal: 0 }}>
        {/* Header: player identity and wallet */}
        <View style={s.header}>
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel={`Profile, ${profile.name}, level ${xpToLevel(profile.xp)}`}
            style={s.identity}
          >
            <View style={[s.avatar, { borderColor: profile.avatarFrameColor }]}>
              <AvatarPhoto username={currentUsername} size={32}><Glyph value={profile.avatarEmoji} size={22} color={ui.ochreInk} /></AvatarPhoto>
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={s.name} numberOfLines={1}>{profile.name}</Text>
              <Text style={s.meta}>LV {xpToLevel(profile.xp)} · {profile.rank}</Text>
            </View>
          </Pressable>
          <View style={s.headerRight}>
            <View style={s.wallet} accessibilityLabel={`${profile.coins} coins`}>
              <Feather name="disc" size={13} color={ui.ochre} />
              <Text style={s.walletText}>{profile.coins.toLocaleString()}</Text>
            </View>
            <IconButton icon="award" label="Ranks" style={s.headerIcon} onPress={() => router.push('/leaderboard')} />
            <IconButton icon="settings" label="Settings" style={s.headerIcon} onPress={() => router.push('/settings')} />
          </View>
        </View>

        {/* XP line */}
        <View style={s.xpWrap}>
          <View style={s.xpTrack}>
            <View style={[s.xpFill, { width: `${Math.round(rankInfo.progress * 100)}%` as never }]} />
          </View>
          <Text style={s.xpText}>{rankInfo.next ? `${rankInfo.remaining.toLocaleString()} XP to ${rankInfo.next}` : 'Top rank reached'}</Text>
        </View>

        <View style={s.brandRow}>
          <View style={s.brandMark}><BrandMark size={52} /></View>
          <View style={{ flex: 1 }}>
             <Text accessibilityRole="header" style={s.wordmark}>GOLD<Text style={{ color: ui.charcoal }}>RUSH</Text></Text>
            <Text style={s.brandCaption}>FOUR SIDES. ONE LEFT.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Open ${CURRENT_SEASON.label} pass`} onPress={() => router.push('/trophyroad')} style={s.seasonStamp}>
            <Text style={s.stampText}>S{CURRENT_SEASON.number}</Text>
            <Text style={s.stampLabel}>PASS</Text>
          </Pressable>
        </View>

        {/* Primary play task: mode, rules, opponents and Play together; preview beside on wide screens */}
        <View style={[s.playArea, wide && s.playAreaWide]}>
          <View style={[s.playPanel, wide && { flex: 1, maxWidth: 460 }]}>
            <Panel style={s.selectedPanel}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.kicker}>Selected mode</Text>
                <Text style={s.selectedName}>{selected.name}</Text>
                <Text style={s.selectedDesc}>{selected.desc}</Text>
                <View style={s.ruleRow}>
                  <Text style={s.paperRule}>{selected.sub} · {opponentLabel(selected)}</Text>
                  <Text style={s.paperRule}>{selected.kind === 'ranked' ? 'Season skill rating changes' : 'Season skill rating unchanged'}</Text>
                </View>
              </View>
              {selectedLocked ? <Chip label={`Requires ${selected.lockLabel ?? 'higher rank'}`} tone="clay" /> : null}
            </Panel>
            <Button
              testID="home-play"
              label={playLabel}
              size="lg"
              icon={selectedLocked ? 'lock' : undefined}
              disabled={selectedLocked || partyBlocks}
              loading={selected.kind === 'challenge' && challengeLoading}
              onPress={handlePlay}
              style={s.playButton}
            />
            {challengeError ? (
              <View style={s.errorRow}>
                <Text style={s.errorText}>{challengeError}</Text>
                <Button label="Retry" size="sm" variant="ghost" onPress={startChallenge} />
              </View>
            ) : null}
            {partyBlocks ? <Text style={s.note}>You are in a party. The leader picks the mode and launches for everyone. Solo modes stay available.</Text> : null}
            {isInParty && (!selected.partyLaunch || localOnly) ? <Text style={s.note}>This mode starts for you only. Party members stay on their home screen.</Text> : null}

            {/* Compact initial choices */}
            <View style={s.modeGrid} accessibilityRole="radiogroup">
              {MODES.filter(m => PRIMARY_MODE_KINDS.includes(m.kind)).map(m => renderMode(m))}
            </View>
            <Pressable
              testID="toggle-all-modes"
              onPress={() => setShowAllModes(v => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showAllModes }}
              aria-expanded={showAllModes}
              style={({ pressed }) => [s.expandRow, pressed && { backgroundColor: ui.graphite2 }]}
            >
              <Text style={s.expandText}>{showAllModes ? 'Hide more modes' : `More modes (${MODES.filter(m => !PRIMARY_MODE_KINDS.includes(m.kind)).length})`}</Text>
              <Feather name={showAllModes ? 'chevron-up' : 'chevron-down'} size={18} color={ui.paperDim} />
            </Pressable>
            {showAllModes ? (
              <View style={{ gap: 12, marginTop: 4 }}>
                {(['SOLO', 'VARIANT', 'ELITE'] as const).map(g => (
                  <View key={g}>
                    <SectionLabel title={g === 'SOLO' ? 'Solo' : g === 'VARIANT' ? 'Variants' : 'Elite'} />
                    <View style={s.modeGrid}>{MODES.filter(m => m.group === g && !PRIMARY_MODE_KINDS.includes(m.kind)).map(m => renderMode(m))}</View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          <View style={{ width: arenaSize, alignSelf: 'center' }}>
            <ArenaPreview size={arenaSize} playerColor={skin.color} />
          </View>
        </View>

        {/* Party */}
        <View style={s.block}>
          <SectionLabel title="Party" right={isInParty ? <Chip label={`${partyMembers.length}/4`} /> : undefined} />
          {!isInParty ? (
            <View style={{ marginTop: 10, gap: 8 }}>
              <Text style={s.body}>Group up with a code, then the leader launches the match for everyone in the party.</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button label="Create party" variant="secondary" icon="users" style={{ flex: 1 }} loading={creatingParty} onPress={handleCreateParty} />
                <Button label={showJoinInput ? 'Cancel' : 'Join with code'} variant="ghost" icon="log-in" style={{ flex: 1 }} onPress={() => { setShowJoinInput(v => !v); setJoinError(null); }} />
              </View>
              {showJoinInput ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={joinCode}
                    onChangeText={v => setJoinCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                    placeholder="6-character code"
                    placeholderTextColor={ui.muted}
                    maxLength={6}
                    autoCapitalize="characters"
                    accessibilityLabel="Party code"
                    style={s.codeInput}
                  />
                  <Button label="Join" onPress={handleJoinParty} loading={joiningParty} disabled={joinCode.length < 6} />
                </View>
              ) : null}
              {joinError ? <Text style={s.errorText}>{joinError}</Text> : null}
            </View>
          ) : (
            <Panel style={{ marginTop: 10 }}>
              <View style={s.codeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.kicker}>Party code</Text>
                  <Text style={s.partyCode} selectable>{partyCode}</Text>
                </View>
                <IconButton icon="share-2" label="Share party code" onPress={handleShareParty} />
                <Button label="Leave" size="sm" variant="danger" onPress={confirmLeave} />
              </View>
              {partyMembers.map((m, i) => (
                <View key={m.playerId} style={[s.memberRow, i > 0 && { borderTopWidth: 1, borderTopColor: ui.line }]}>
                  <View style={s.memberAvatar}><Glyph value={m.avatarEmoji} size={16} color={ui.paperDim} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.memberName}>{m.name}</Text>
                    <Text style={s.memberMeta}>{m.rank}{m.winStreak > 0 ? ` · ${m.winStreak} win streak` : ''}</Text>
                  </View>
                  {m.isLeader ? <Chip label="Leader" tone="ochre" /> : null}
                </View>
              ))}
              <Text style={[s.note, { paddingHorizontal: 12, paddingBottom: 12 }]}>
                {isLeader
                  ? 'You lead. Choose an online four-seat mode and press Play. Ranked waits for humans; Casual may fill empty seats with labeled AI.'
                  : 'Waiting for the leader to launch a shared online match.'}
              </Text>
            </Panel>
          )}
        </View>

        <View style={s.block}>
          <Pressable
            testID="toggle-more"
            onPress={() => setShowMore(v => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showMore }}
            aria-expanded={showMore}
            accessibilityLabel={showMore ? 'Hide ability, record, season pass and shortcuts' : 'Show ability, record, season pass and shortcuts'}
            style={({ pressed }) => [s.expandRow, pressed && { backgroundColor: ui.graphite2 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.expandText}>{showMore ? 'Hide loadout and progress' : 'Loadout and progress'}</Text>
              <Text style={s.modeSub}>Super ability, record, events, season track, clips</Text>
            </View>
            <Feather name={showMore ? 'chevron-up' : 'chevron-down'} size={18} color={ui.paperDim} />
          </Pressable>
        </View>
        {showMore ? (<>
        {/* Super ability loadout */}
        <View style={s.block}>
          <SectionLabel title="Super ability" right={<Text style={s.meta}>Charges after 10 blocks</Text>} />
          <View style={[s.modeGrid, { marginTop: 10 }]}>
            {SUPERS.map(sup => {
              const active = (profile.selectedSuper ?? 1) === sup.id;
              const unlocked = profile.level >= sup.unlockLevel;
              return (
                <Pressable
                  key={sup.id}
                  onPress={() => unlocked && setSelectedSuper(sup.id)}
                  disabled={!unlocked}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active, disabled: !unlocked }}
                  aria-pressed={active}
                  aria-disabled={!unlocked}
                  accessibilityLabel={`${sup.name}${unlocked ? '' : `, unlocks at level ${sup.unlockLevel}`}`}
                  style={({ pressed }) => [s.superCell, active && unlocked && s.modeCellOn, pressed && { backgroundColor: ui.graphite2 }, !unlocked && { opacity: 0.5 }]}
                >
                  <Glyph value={sup.icon} size={20} color={active && unlocked ? ui.ochre : ui.paperDim} />
                <Text style={[s.modeName, active && unlocked && { color: ui.charcoal }]}>{sup.name}</Text>
                  <Text style={s.modeSub}>{unlocked ? sup.desc.replace('\n', ' ') : `Unlocks at LV ${sup.unlockLevel}`}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Record */}
        <View style={s.block}>
          <SectionLabel title="Record" />
          <Panel style={{ flexDirection: 'row', marginTop: 10 }}>
            <Stat label="Wins" value={String(profile.wins)} />
            <Stat label="Win rate" value={winRate ? `${winRate}%` : '-'} />
            <Stat label="Streak" value={String(profile.winStreak)} style={{ borderRightWidth: 0 }} />
          </Panel>
        </View>

        <LiveEventBanner />

        {/* Season pass track (free, earned by games played) */}
        <View style={s.block}>
          <SectionLabel title="Season track" right={<Text style={s.meta}>{profile.totalGames} games played</Text>} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
            {SEASON_TIERS.map((tier, i) => {
              const unlocked = profile.totalGames >= tier.games;
              const claimed = profile.seasonPassClaimed.includes(i);
              return (
                <View key={i} style={[s.tier, !unlocked && { opacity: 0.55 }]}>
                  <Glyph value={tier.icon} size={18} color={unlocked ? ui.ochre : ui.muted} />
                  <Text style={s.modeName}>{tier.name}</Text>
                  <Text style={s.modeSub}>{tier.games}+ games</Text>
                  <Text style={s.tierReward}>{tier.reward}</Text>
                  {claimed ? <Chip label="Claimed" tone="moss" />
                    : unlocked ? <Button label="Claim" size="sm" onPress={() => claimSeasonTier(i)} />
                    : <Chip label="Locked" />}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Shortcuts */}
        <View style={[s.block, { gap: 8 }]}>
          <Pressable onPress={() => router.push('/my-clips')} accessibilityRole="button" style={({ pressed }) => [s.linkRow, pressed && { backgroundColor: ui.graphite2 }]}>
            <Feather name="film" size={18} color={ui.paperDim} />
            <View style={{ flex: 1 }}>
              <Text style={s.modeName}>My clips</Text>
              <Text style={s.modeSub}>Saved match moments on this device</Text>
            </View>
            <Feather name="chevron-right" size={18} color={ui.muted} />
          </Pressable>
          <Pressable onPress={() => dismissStreakModal()} accessibilityRole="summary" style={s.linkRow}>
            <Feather name="calendar" size={18} color={ui.paperDim} />
            <View style={{ flex: 1 }}>
              <Text style={s.modeName}>Login streak · Day {profile.loginStreak || 1}</Text>
              <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <View key={i} style={[s.streakCell, i < Math.min(profile.loginStreak, 7) && { backgroundColor: ui.ochre, borderColor: ui.ochre }]} />
                ))}
              </View>
            </View>
          </Pressable>
        </View>
        </>) : null}
        </Shell>
      </ScrollView>
    </View>
  );
}

const a = StyleSheet.create({
  frame: { borderWidth: 3, borderColor: ui.paper, backgroundColor: tactile.frame, alignItems: 'center', borderRadius: 0 },
  brassFrame: { borderWidth: 2, borderColor: tactile.brassEdge, padding: 3, backgroundColor: tactile.brass },
  arenaLabel: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingTop: 10 },
  arenaTitle: { fontFamily: fonts.display, fontSize: 15, color: ui.charcoal, letterSpacing: 1 },
  arenaMeta: { fontFamily: fonts.body, fontSize: 12, color: ui.paperDim },
  reducedBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  reducedText: { fontFamily: fonts.body, fontSize: 14, color: ui.paperDim, textAlign: 'center' },
  seats: { flexDirection: 'row', borderWidth: 2, borderTopWidth: 0, borderColor: tactile.brassEdge, backgroundColor: tactile.brass },
  seat: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 5 },
  seatsWrap: { flexWrap: 'wrap' },
  seatCompact: { flexBasis: '50%', flexGrow: 0, flexShrink: 0 },
  seatRowDivider: { borderBottomWidth: 1, borderBottomColor: ui.line },
  seatDivider: { borderRightWidth: 1, borderRightColor: tactile.courtLine },
  seatSwatch: { width: 4, height: 24 },
  seatPos: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.5, color: tactile.paperInk, textTransform: 'uppercase' },
  seatWho: { fontFamily: fonts.body, fontSize: 12, color: tactile.paperInk },
  caption: { fontFamily: fonts.body, fontSize: 13, color: ui.muted, lineHeight: 18 },
  captionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: ui.ink },
  skel: { backgroundColor: ui.graphite, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, gap: 8 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  avatar: { width: 44, height: 44, borderWidth: 2, borderRadius: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: tactile.coral },
  name: { fontFamily: fonts.display, fontSize: 22, color: ui.paper, letterSpacing: 0.5 },
  meta: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: ui.muted },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: ui.line, borderRadius: 2, paddingHorizontal: 8, height: 38, backgroundColor: ui.graphite2 },
  headerIcon: { borderWidth: 1, borderColor: ui.lineStrong, borderRadius: 2 },
  walletText: { fontFamily: fonts.display, fontSize: 17, color: ui.paper, fontVariant: ['tabular-nums'] },
  xpWrap: { paddingHorizontal: 18, marginTop: 12, gap: 4 },
  xpTrack: { height: 8, padding: 1, borderWidth: 1, borderColor: ui.lineStrong, backgroundColor: ui.ink },
  xpFill: { height: 4, backgroundColor: ui.ochre },
  xpText: { fontFamily: fonts.body, fontSize: 12, color: ui.muted },
  block: { paddingHorizontal: 18, marginTop: 18 },
  playArea: { paddingHorizontal: 18, marginTop: 14, flexDirection: 'column', gap: 24 },
  playAreaWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  playPanel: {},
  ruleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  expandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: 12, marginTop: 6, borderWidth: 1, borderColor: ui.line, borderRadius: 3 },
  expandText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: ui.paper },
  selectedPanel: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, backgroundColor: tactile.paperPanel, borderWidth: 2, borderColor: ui.lineStrong, borderRadius: 0 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.2, color: tactile.paperMuted, textTransform: 'uppercase' },
  selectedName: { fontFamily: fonts.display, fontSize: 30, color: tactile.paperInk, letterSpacing: 0.5, textTransform: 'uppercase' },
  selectedDesc: { fontFamily: fonts.body, fontSize: 14, color: tactile.paperMuted },
  paperRule: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: tactile.paperMuted },
  playButton: { marginTop: 10, borderRadius: 0, borderWidth: 2, borderColor: ui.paperDim, minHeight: 60 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, marginTop: 26, marginBottom: 4 },
  brandMark: { transform: [{ rotate: '-4deg' }] },
  wordmark: { fontFamily: fonts.display, fontSize: 36, color: ui.paper, letterSpacing: -1, lineHeight: 40 },
  brandCaption: { fontFamily: fonts.body, fontSize: 12, color: ui.muted, letterSpacing: 1 },
  seasonStamp: { minWidth: 44, minHeight: 48, padding: 4, alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 2, borderColor: ui.paperDim, backgroundColor: tactile.coral, transform: [{ rotate: '3deg' }] },
  stampText: { fontFamily: fonts.body, color: ui.ochreInk, fontSize: 13 },
  stampLabel: { fontFamily: fonts.bodyBold, color: ui.ochreInk, fontSize: 12, letterSpacing: 0.7 },
  note: { fontFamily: fonts.body, fontSize: 13, color: ui.muted, marginTop: 8, lineHeight: 18 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  errorText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 13, color: ui.clay },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  modeCell: { borderWidth: 1, borderColor: ui.line, borderRadius: 3, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: ui.graphite, minHeight: 52 },
  modeCellOn: { borderColor: ui.orange, borderWidth: 2, paddingHorizontal: 9, paddingVertical: 8 },
  modeName: { fontFamily: fonts.display, fontSize: 17, color: ui.paper, letterSpacing: 0.5, textTransform: 'uppercase' },
  modeSub: { fontFamily: fonts.body, fontSize: 12, color: ui.muted },
  superCell: { minHeight: 44, flexBasis: '31%', flexGrow: 1, borderWidth: 1, borderColor: ui.line, borderRadius: 3, padding: 10, gap: 2, backgroundColor: ui.graphite },
  body: { fontFamily: fonts.body, fontSize: 14, color: ui.paperDim, lineHeight: 19 },
  codeInput: { flex: 1, height: 44, borderWidth: 1, borderColor: ui.line, borderRadius: 3, backgroundColor: ui.graphite2, color: ui.paper, fontFamily: fonts.display, fontSize: 20, letterSpacing: 4, paddingHorizontal: 12 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: ui.line },
  partyCode: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 6, color: ui.charcoal },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  memberAvatar: { width: 32, height: 32, borderRadius: 3, borderWidth: 1, borderColor: ui.line, alignItems: 'center', justifyContent: 'center' },
  memberName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: ui.paper },
  memberMeta: { fontFamily: fonts.body, fontSize: 12, color: ui.muted },
  tier: { width: 132, borderWidth: 1, borderColor: ui.line, borderRadius: 3, padding: 10, gap: 4, backgroundColor: ui.graphite },
  tierReward: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: ui.paperDim, minHeight: 32 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: ui.line, borderRadius: 3, padding: 12, backgroundColor: ui.graphite },
  streakCell: { width: 18, height: 6, borderWidth: 1, borderColor: ui.line },
});
