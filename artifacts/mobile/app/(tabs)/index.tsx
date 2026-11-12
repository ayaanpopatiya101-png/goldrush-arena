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
import { PLAYER_COLORS, palette } from '@/constants/colors';
import { CURRENT_SEASON } from '@/constants/season';
import { fonts } from '@/constants/typography';
import {
  RANKS, getRankIndex, SEASON_TIERS, SKINS, SUPERS, usePlayer, xpForNextRank, xpToLevel,
} from '@/context/PlayerContext';
import { useParty } from '@/context/PartyContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useArenaVisibility } from '@/hooks/useArenaVisibility';
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

const DEMO_NAMES = ['OrbitAce_7', 'CedarDash', 'FinchByte', 'NovaRowan'];
const PREVIEW_BOTS = DEMO_NAMES.slice(1);
const PREVIEW_RANKS = ['Gold', 'Gold', 'Gold'];
const SEAT_NAMES = ['South', 'North', 'West', 'East'];

// ─── Spectator demo: no session, queue, rewards or inventory writes ────────────
function ArenaPreview({ size, playerColor, skinName }: { size: number; playerColor: string; skinName: string }) {
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  const reduced = useReducedMotion();
  const visibility = useArenaVisibility();
  const [run, setRun] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const stopped = userPaused || (reduced && !motionAllowed);
  const active = focused && visibility.visible && !stopped;
  const courtSize = Math.floor(Math.min(size - 40, 200));

  const restart = useCallback(() => setRun(r => r + 1), []);

  return (
    <View style={a.frame}>
      <View style={a.arenaLabel}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[a.dot, stopped && { backgroundColor: palette.muted }]} />
          <Text style={a.arenaTitle}>{stopped ? 'DEMO PAUSED' : 'ARENA DEMO'}</Text>
        </View>
        <Text style={a.arenaMeta} accessibilityLabel="Demo seats: four computer-controlled bots, no live players">4 BOTS · WATCH ONLY</Text>
      </View>
      <Pressable
        testID="preview-pause"
        onPress={() => { if (stopped) { setMotionAllowed(true); setUserPaused(false); } else setUserPaused(true); }}
        accessibilityRole="button"
        accessibilityLabel={stopped ? 'Resume bot demo' : 'Pause bot demo'}
        accessibilityHint="Pauses or resumes the watch-only bot demonstration"
        style={{ alignSelf: 'center' }}
      >
        <View ref={visibility.ref} style={[a.court, { width: courtSize + 6, height: courtSize + 6 }]}>
          <GameArena
            key={run}
            arenaSize={courtSize}
            courtStyle="tactile"
            playerName={DEMO_NAMES[0]}
            playerColor={playerColor}
            playerGlowColor={playerColor}
            botNames={PREVIEW_BOTS}
            botRanks={PREVIEW_RANKS}
            onGameOver={restart}
            demo
            practice
            skipCountdown
            soundEnabled={false}
            colorBoard={false}
            botDifficulty="normal"
            noPowerups
            paused={!active}
          />
          {stopped ? (
            <View style={a.pausedVeil} pointerEvents="none">
              <Feather name="play" size={26} color={palette.foreground} />
            </View>
          ) : null}
        </View>
      </Pressable>
      <Text style={a.caption}>
        {reduced && !motionAllowed ? 'Paused for Reduce Motion. Tap the court to watch.' : 'Four bots, normal pace. Tap the court to pause. No rewards or lives spent.'}
      </Text>
      <View style={a.equipRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={a.equipKicker}>EQUIPPED PADDLE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[a.swatch, { backgroundColor: playerColor }]} />
            <Text style={a.equipName} numberOfLines={1}>{skinName}</Text>
          </View>
        </View>
        <Pressable testID="home-studio" onPress={() => router.push('/paddle-studio')} accessibilityRole="button" accessibilityLabel="Open paddle studio"
          style={({ pressed }) => [a.studioBtn, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 1.5 }]}>
          <Feather name="aperture" size={15} color={palette.rivalBlue} />
          <Text style={a.studioTxt}>STUDIO</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatPill({ icon, color, value, label, onPress, testID }: { icon: React.ComponentProps<typeof Feather>['name']; color: string; value: string; label: string; onPress?: () => void; testID?: string }) {
  const body = (<><Feather name={icon} size={14} color={color} /><Text style={s.pillTxt}>{value}</Text></>);
  if (!onPress) return <View style={s.pill} accessible accessibilityLabel={label}>{body}</View>;
  return <Pressable testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [s.pill, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 1.5 }]}>{body}</Pressable>;
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

  function handlePlay() { launch(selected); }

  function launch(m: ModeDef) {
    if (isLocked(m)) return;
    switch (m.kind) {
      case 'ranked': return launchMatch('ranked', 'classic');
      case 'casual': return launchMatch('casual', 'classic');
      case 'variant': return launchMatch('casual', m.variant!);
      case 'elite': return launchMatch('ranked', m.variant!);
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
        style={({ pressed }) => [s.modeCell, { width: modeCellW }, on && s.modeCellOn, pressed && { borderBottomWidth: 2, transform: [{ translateY: 2 }] }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {locked ? <Feather name="lock" size={12} color={palette.supporting} /> : null}
          <Text style={[s.modeName, on && { color: palette.foreground }]} numberOfLines={1}>{m.name}</Text>
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
        {/* Top stats: real device balances only */}
        <View style={s.statsBar}>
          <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel={`Profile, ${profile.name}, level ${xpToLevel(profile.xp)}`}
            style={[s.avatar, { borderColor: profile.avatarFrameColor }]}>
            <AvatarPhoto username={currentUsername} size={34}><Glyph value={profile.avatarEmoji} size={20} color={palette.onAccent} /></AvatarPhoto>
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center' }} style={{ flex: 1 }}>
            <StatPill icon="zap" color={palette.rivalRed} value={String(profile.loginStreak)} label={`${profile.loginStreak} day login streak`} />
            <StatPill icon="disc" color={palette.gold} value={profile.coins.toLocaleString()} label={`${profile.coins} coins`} />
            <StatPill icon="award" color={palette.rivalBlue} value={profile.xp.toLocaleString()} label={`${profile.xp} XP, ${profile.rank}. Opens rankings.`} onPress={() => router.push('/leaderboard')} testID="home-rank" />
            <StatPill icon="heart" color={palette.rivalRed} value={String(profile.extraLivesInventory ?? 0)} label={`${profile.extraLivesInventory ?? 0} bank lives`} />
          </ScrollView>
          <IconButton icon="settings" label="Settings" style={s.headerIcon} onPress={() => router.push('/settings')} />
        </View>

        {/* Season pass: real tiers by games played */}
        {(() => {
          const reached = SEASON_TIERS.filter(t => profile.totalGames >= t.games).length;
          const claimable = SEASON_TIERS.findIndex((t, i) => profile.totalGames >= t.games && !profile.seasonPassClaimed.includes(i));
          const next = SEASON_TIERS[reached];
          const prev = reached > 0 ? SEASON_TIERS[reached - 1]!.games : 0;
          const pct = next ? Math.min(1, (profile.totalGames - prev) / Math.max(1, next.games - prev)) : 1;
          return (
            <View style={[s.card, s.passCard]}>
              <Pressable onPress={() => router.push('/trophyroad')} accessibilityRole="button" accessibilityLabel={`Open ${CURRENT_SEASON.label} pass`} style={s.passBadge}>
                <Feather name="award" size={22} color={palette.onAccent} />
              </Pressable>
              <Pressable onPress={() => router.push('/trophyroad')} accessibilityRole="button" accessibilityLabel={`${CURRENT_SEASON.label} pass, tier ${reached} of ${SEASON_TIERS.length}`} style={{ flex: 1, minWidth: 0, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={s.passTitle}>{CURRENT_SEASON.label.toUpperCase()} PASS</Text>
                  <View style={s.tierTag}><Text style={s.tierTagTxt}>TIER {reached}</Text></View>
                </View>
                <View style={s.passTrack}><View style={[s.passFill, { width: `${Math.round(pct * 100)}%` as never }]} /></View>
                <Text style={s.passSub}>{next ? `${profile.totalGames} / ${next.games} games to ${next.name}` : 'Every tier reached'}</Text>
              </Pressable>
              {claimable >= 0
                ? <Button testID="home-pass-claim" label="Claim" size="sm" variant="gold" onPress={() => claimSeasonTier(claimable)} />
                : <Button testID="home-pass-view" label="View" size="sm" variant="secondary" onPress={() => router.push('/trophyroad')} />}
            </View>
          );
        })()}

        <Pressable testID="home-trophy-road" onPress={() => router.push('/trophyroad-map')} accessibilityRole="button"
          accessibilityLabel={`Trophy Road, ${profile.gamesRoadCompleted ?? 0} completed games`}
          style={({ pressed }) => [s.card, s.roadRow, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 2 }]}>
          <Feather name="map" size={18} color={palette.gold} />
          <Text style={s.roadTxt}>TROPHY ROAD</Text>
          <Text style={[s.passSub, { flex: 1 }]} numberOfLines={1}>{profile.gamesRoadCompleted ?? 0} completed games</Text>
          <Feather name="chevron-right" size={18} color={palette.supporting} />
        </Pressable>

        {/* Arena demo + mode cards; side by side on wide screens */}
        <View style={[s.playArea, wide && s.playAreaWide]}>
          <View style={wide ? { width: 420 } : undefined}>
            <ArenaPreview size={Math.min(contentW, 420)} playerColor={skin.color} skinName={skin.name} />
          </View>
          <View style={[s.playPanel, wide && { flex: 1 }]}>
            <View style={s.modeHead}>
              <Text style={s.modeHeadTitle} accessibilityRole="header">CHOOSE GAME MODE</Text>
              <Text style={s.modeHeadMeta}>4-PLAYER LOBBY</Text>
            </View>

            {/* Ranked: primary */}
            <View style={[s.card, s.rankedCard]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={s.rankedIcon}><Feather name="crosshair" size={22} color={palette.onAccent} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.cardTitle}>RANKED QUAD ARENA</Text>
                  <Text style={s.cardSub}>4 seats · 5 lives · season skill rating</Text>
                </View>
              </View>
              <View style={s.rankedFoot}>
                <Text style={s.rankedMeta}>{rankInfo.next ? `${rankInfo.remaining.toLocaleString()} XP to ${rankInfo.next}` : 'Top XP rank'}</Text>
                <Button testID="home-play-ranked" label={partyBlocks && MODES[0]!.partyLaunch ? 'Leader picks' : isInParty && isLeader ? 'Play with party' : 'Play'}
                  icon="play" disabled={waitingOnLeader} onPress={() => { setSelectedKey('ranked'); void launch(MODES[0]!); }} />
              </View>
            </View>

            <View style={[s.card, s.modeRow]}>
              <View style={s.modeIcon}><Feather name="cpu" size={18} color={palette.supporting} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.cardTitle}>PRACTICE COURT</Text>
                <Text style={s.cardSub}>Offline warm-up vs 3 local bots</Text>
              </View>
              <Button testID="home-warmup" label="Warm up" size="sm" variant="secondary" onPress={() => router.push('/practice')} />
            </View>

            <View style={[s.card, s.modeRow]}>
              <View style={s.modeIcon}><Feather name="share-2" size={18} color={palette.supporting} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.cardTitle}>PARTY ROOM</Text>
                <Text style={s.cardSub}>{isInParty ? `In party ${partyCode} · ${partyMembers.length}/4` : 'Private court with room codes'}</Text>
              </View>
              <Button testID="home-party-join" label={isInParty ? 'Share' : showJoinInput ? 'Cancel' : 'Join'} size="sm" variant="secondary"
                onPress={() => { if (isInParty) void handleShareParty(); else { setShowJoinInput(v => !v); setJoinError(null); } }} />
            </View>
            {showJoinInput && !isInParty ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TextInput
                  value={joinCode}
                  onChangeText={v => setJoinCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  placeholder="6-character code"
                  placeholderTextColor={palette.muted}
                  maxLength={6}
                  autoCapitalize="characters"
                  accessibilityLabel="Party code"
                  style={s.codeInput}
                />
                <Button label="Join" onPress={handleJoinParty} loading={joiningParty} disabled={joinCode.length < 6} />
              </View>
            ) : null}
            {joinError && !isInParty ? <Text style={[s.errorText, { marginTop: 6 }]}>{joinError}</Text> : null}

            <Pressable
              testID="toggle-all-modes"
              onPress={() => setShowAllModes(v => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showAllModes }}
              aria-expanded={showAllModes}
              style={({ pressed }) => [s.expandRow, pressed && { borderBottomWidth: 2, transform: [{ translateY: 2 }] }]}
            >
              <Text style={s.expandText}>{showAllModes ? 'Hide all modes' : `All modes (${MODES.length})`}</Text>
              <Feather name={showAllModes ? 'chevron-up' : 'chevron-down'} size={18} color={palette.supporting} />
            </Pressable>
            {showAllModes ? (
            <View style={{ marginTop: 10 }}>
            <Panel style={s.selectedPanel}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.kicker, { color: palette.gold }]}>Selected mode</Text>
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
              icon={selectedLocked ? 'lock' : 'play'}
              disabled={selectedLocked || partyBlocks}
              loading={selected.kind === 'challenge' && challengeLoading}
              onPress={handlePlay}
              style={s.playButton}
            />
            {partyBlocks ? <Text style={s.note}>You are in a party. The leader picks the mode and launches for everyone. Solo modes stay available.</Text> : null}
            {isInParty && (!selected.partyLaunch || localOnly) ? <Text style={s.note}>This mode starts for you only. Party members stay on their home screen.</Text> : null}
              <View style={{ gap: 12, marginTop: 8 }}>
                {(['MATCH', 'SOLO', 'VARIANT', 'ELITE'] as const).map(g => (
                  <View key={g}>
                    <SectionLabel title={g === 'MATCH' ? 'Match' : g === 'SOLO' ? 'Solo' : g === 'VARIANT' ? 'Variants' : 'Elite'} />
                    <View style={s.modeGrid} accessibilityRole="radiogroup">{MODES.filter(m => m.group === g).map(m => renderMode(m))}</View>
                  </View>
                ))}
              </View>
            </View>
            ) : null}
            {challengeError ? (
              <View style={s.errorRow}>
                <Text style={s.errorText}>{challengeError}</Text>
                <Button label="Retry" size="sm" variant="ghost" onPress={startChallenge} />
              </View>
            ) : null}
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
              {false ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={joinCode}
                    onChangeText={v => setJoinCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                    placeholder="6-character code"
                    placeholderTextColor={palette.muted}
                    maxLength={6}
                    autoCapitalize="characters"
                    accessibilityLabel="Party code"
                    style={s.codeInput}
                  />
                  <Button label="Join" onPress={handleJoinParty} loading={joiningParty} disabled={joinCode.length < 6} />
                </View>
              ) : null}
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
                <View key={m.playerId} style={[s.memberRow, i > 0 && { borderTopWidth: 1, borderTopColor: palette.border }]}>
                  <View style={s.memberAvatar}><Glyph value={m.avatarEmoji} size={16} color={palette.supporting} /></View>
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
            style={({ pressed }) => [s.expandRow, pressed && { borderBottomWidth: 2, transform: [{ translateY: 2 }] }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.expandText}>{showMore ? 'Hide loadout and progress' : 'Loadout and progress'}</Text>
              <Text style={s.modeSub}>Super ability, record, events, season track, clips</Text>
            </View>
            <Feather name={showMore ? 'chevron-up' : 'chevron-down'} size={18} color={palette.supporting} />
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
                  style={({ pressed }) => [s.superCell, active && unlocked && s.modeCellOn, pressed && { backgroundColor: palette.raised }, !unlocked && { opacity: 0.5 }]}
                >
                  <Glyph value={sup.icon} size={20} color={active && unlocked ? ui.ochre : ui.paperDim} />
                <Text style={[s.modeName, active && unlocked && { color: palette.foreground }]}>{sup.name}</Text>
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
          <Pressable onPress={() => router.push('/my-clips')} accessibilityRole="button" style={({ pressed }) => [s.linkRow, pressed && { borderBottomWidth: 2, transform: [{ translateY: 2 }] }]}>
            <Feather name="film" size={18} color={palette.supporting} />
            <View style={{ flex: 1 }}>
              <Text style={s.modeName}>My clips</Text>
              <Text style={s.modeSub}>Saved match moments on this device</Text>
            </View>
            <Feather name="chevron-right" size={18} color={palette.muted} />
          </Pressable>
          <Pressable onPress={() => dismissStreakModal()} accessibilityRole="summary" style={s.linkRow}>
            <Feather name="calendar" size={18} color={palette.supporting} />
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
  frame: { gap: 12, padding: 14, borderRadius: 20, backgroundColor: palette.surface, borderWidth: 1.5, borderBottomWidth: 5, borderColor: palette.border, borderBottomColor: palette.edge },
  arenaLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: palette.primary },
  arenaTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.primary, letterSpacing: 1 },
  arenaMeta: { fontFamily: fonts.bodyBold, fontSize: 12, color: palette.supporting, letterSpacing: 0.6 },
  court: { padding: 3, borderRadius: 16, borderWidth: 1.5, borderColor: palette.border, backgroundColor: palette.inset, overflow: 'hidden' },
  pausedVeil: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,22,26,0.55)' },
  caption: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, lineHeight: 17, textAlign: 'center' },
  equipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: 1.5, borderTopColor: palette.border },
  equipKicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, color: palette.supporting },
  equipName: { fontFamily: fonts.display, fontSize: 20, color: palette.foreground },
  swatch: { width: 22, height: 8, borderRadius: 4 },
  studioBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1.5, borderBottomWidth: 3.5, borderColor: palette.border, borderBottomColor: palette.edge, backgroundColor: palette.inset },
  studioTxt: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 1, color: palette.rivalBlue },
});

const s = StyleSheet.create({
  statsBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: palette.border },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: palette.surface, borderWidth: 1.5, borderBottomWidth: 3.5, borderColor: palette.border, borderBottomColor: palette.edge },
  pillTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: palette.foreground, fontVariant: ['tabular-nums'] },
  card: { marginHorizontal: 18, marginTop: 12, borderRadius: 18, backgroundColor: palette.surface, borderWidth: 1.5, borderBottomWidth: 5, borderColor: palette.border, borderBottomColor: palette.edge },
  passCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  passBadge: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold, borderBottomWidth: 4, borderBottomColor: palette.goldEdge },
  passTitle: { fontFamily: fonts.display, fontSize: 19, color: palette.foreground, letterSpacing: 0.6 },
  tierTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.goldEdge },
  tierTagTxt: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, color: palette.gold },
  passTrack: { height: 10, borderRadius: 5, backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' },
  passFill: { height: '100%', borderRadius: 5, backgroundColor: palette.primary },
  passSub: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: palette.supporting },
  roadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, borderBottomWidth: 4 },
  roadTxt: { fontFamily: fonts.display, fontSize: 17, letterSpacing: 0.8, color: palette.foreground },
  modeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  modeHeadTitle: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 1, color: palette.foreground },
  modeHeadMeta: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.6, color: palette.supporting },
  rankedCard: { marginHorizontal: 0, padding: 14, gap: 12, borderWidth: 2.5, borderColor: palette.primary, borderBottomColor: palette.primaryEdge },
  rankedIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primary },
  rankedFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 12, borderTopWidth: 1.5, borderTopColor: palette.border },
  rankedMeta: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 13, color: palette.gold },
  cardTitle: { fontFamily: fonts.display, fontSize: 19, letterSpacing: 0.6, color: palette.foreground },
  cardSub: { fontFamily: fonts.body, fontSize: 13, color: palette.supporting },
  modeRow: { marginHorizontal: 0, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  modeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.inset, borderWidth: 1.5, borderColor: palette.border },
  root: { flex: 1, backgroundColor: palette.background },
  skel: { backgroundColor: palette.surface, borderRadius: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, gap: 8 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  avatar: { width: 40, height: 40, borderWidth: 2, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primary },
  name: { fontFamily: fonts.display, fontSize: 22, color: palette.foreground, letterSpacing: 0.5 },
  meta: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: palette.muted },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 2, borderColor: palette.edge, borderRadius: 10, paddingHorizontal: 8, height: 40, backgroundColor: palette.surface },
  headerIcon: { borderRadius: 22 },
  walletText: { fontFamily: fonts.display, fontSize: 17, color: palette.foreground, fontVariant: ['tabular-nums'] },
  rankBtn: { marginHorizontal: 18, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: palette.surface, borderWidth: 1.5, borderColor: palette.border, borderBottomWidth: 5, borderBottomColor: palette.edge },
  rankBtnPressed: { borderBottomWidth: 2, transform: [{ translateY: 3 }], backgroundColor: palette.raised },
  rankName: { fontFamily: fonts.display, fontSize: 22, color: palette.gold, textTransform: 'uppercase', letterSpacing: 0.6 },
  rankKicker: { fontFamily: fonts.bodyBold, fontSize: 11, color: palette.supporting, textTransform: 'uppercase', letterSpacing: 1 },
  xpTrack: { height: 12, padding: 2, borderRadius: 6, borderWidth: 1, borderColor: palette.edge, backgroundColor: palette.inset },
  xpFill: { height: 6, borderRadius: 8, backgroundColor: palette.primary },
  xpText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: palette.supporting },
  block: { paddingHorizontal: 18, marginTop: 18 },
  playArea: { paddingHorizontal: 18, marginTop: 14, flexDirection: 'column', gap: 18 },
  playAreaWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  playPanel: {},
  ruleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  expandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 12, marginTop: 8, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.border, borderRadius: 10, backgroundColor: palette.surface },
  expandText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: palette.foreground },
  selectedPanel: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, backgroundColor: palette.inset, borderWidth: 2, borderBottomWidth: 5, borderColor: palette.edge, borderRadius: 10 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.2, color: palette.supporting, textTransform: 'uppercase' },
  selectedName: { fontFamily: fonts.display, fontSize: 32, color: palette.foreground, letterSpacing: 0.5, textTransform: 'uppercase' },
  selectedDesc: { fontFamily: fonts.body, fontSize: 15, lineHeight: 20, color: palette.foreground },
  paperRule: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: palette.foreground, borderRadius: 10, borderWidth: 1, borderColor: ui.gold, paddingHorizontal: 6, paddingVertical: 2 },
  playButton: { marginTop: 12, borderRadius: 10, minHeight: 64 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, marginTop: 26, marginBottom: 4 },
  brandMark: { transform: [{ rotate: '-4deg' }] },
  wordmark: { fontFamily: fonts.display, fontSize: 36, color: palette.foreground, letterSpacing: -1, lineHeight: 40 },
  brandCaption: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, letterSpacing: 1 },
  seasonStamp: { minWidth: 44, minHeight: 48, padding: 4, alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.edge, backgroundColor: palette.primary, transform: [{ rotate: '3deg' }] },
  stampText: { fontFamily: fonts.body, color: palette.onAccent, fontSize: 13 },
  stampLabel: { fontFamily: fonts.bodyBold, color: palette.onAccent, fontSize: 12, letterSpacing: 0.7 },
  note: { fontFamily: fonts.body, fontSize: 13, color: palette.muted, marginTop: 8, lineHeight: 18 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  errorText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 13, color: palette.supporting },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  modeCell: { borderWidth: 2, borderBottomWidth: 4, borderColor: palette.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: palette.background, minHeight: 56 },
  modeCellOn: { borderColor: palette.primary, backgroundColor: palette.background },
  modeName: { fontFamily: fonts.display, fontSize: 17, color: palette.foreground, letterSpacing: 0.5, textTransform: 'uppercase' },
  modeSub: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  superCell: { minHeight: 44, flexBasis: '31%', flexGrow: 1, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.border, borderRadius: 10, padding: 10, gap: 2, backgroundColor: palette.background },
  body: { fontFamily: fonts.body, fontSize: 14, color: palette.supporting, lineHeight: 19 },
  codeInput: { flex: 1, height: 48, borderWidth: 2, borderColor: palette.edge, borderRadius: 10, backgroundColor: palette.raised, color: palette.foreground, fontFamily: fonts.display, fontSize: 20, letterSpacing: 4, paddingHorizontal: 12 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: palette.border },
  partyCode: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 6, color: palette.foreground },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  memberAvatar: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center' },
  memberName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: palette.foreground },
  memberMeta: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  tier: { width: 132, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.border, borderRadius: 10, padding: 10, gap: 4, backgroundColor: palette.surface },
  tierReward: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: palette.supporting, minHeight: 32 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.border, borderRadius: 10, padding: 12, backgroundColor: palette.surface },
  streakCell: { width: 18, height: 6, borderRadius: 10, borderWidth: 1, borderColor: palette.border },
});
