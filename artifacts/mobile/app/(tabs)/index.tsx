import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DailyStreakModal } from '@/components/DailyStreakModal';
import { GameArena } from '@/components/GameArena';
import { LiveEventBanner } from '@/components/LiveEventBanner';
import { RankBadge } from '@/components/RankBadge';
import { Glyph } from '@/components/ui/Glyph';
import { Button, Chip, IconButton, Panel, SectionLabel, Stat, ui } from '@/components/ui/Primitives';
import { PLAYER_COLORS } from '@/constants/colors';
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
type ModeKind = 'ranked' | 'casual' | 'variant' | 'elite' | 'gauntlet' | 'challenge' | 'arcade';
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
  { key: 'ranked', kind: 'ranked', name: 'Ranked', sub: '4 seats · 5 lives', desc: 'Last paddle standing. Result moves your rank.', group: 'MATCH', partyLaunch: true },
  { key: 'casual', kind: 'casual', name: 'Casual', sub: '4 seats · no rank change', desc: 'Same arena, no rank on the line.', group: 'MATCH', partyLaunch: true },
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
  { key: 'gauntlet', kind: 'gauntlet', name: 'Champion\'s Gauntlet', sub: 'Multi-round run', desc: 'Survive consecutive rounds across variants.', group: 'ELITE', lockIdx: 9, lockLabel: 'Diamond+', partyLaunch: false },
  { key: 'storm_surge', kind: 'elite', variant: 'storm_surge', name: 'Storm Surge', sub: '3 balls · 1 life', desc: 'Max-skill opponents. 2x XP and coins.', group: 'ELITE', lockIdx: 12, lockLabel: 'Master 1+', partyLaunch: true },
  { key: 'ghost_protocol', kind: 'elite', variant: 'ghost_protocol', name: 'Ghost Protocol', sub: 'Balls vanish', desc: 'Balls turn invisible mid-flight. 3x XP and coins.', group: 'ELITE', lockIdx: 15, lockLabel: 'Champion 1+', partyLaunch: true },
  { key: 'warlord', kind: 'elite', variant: 'warlord', name: 'Warlord', sub: '1 vs 5', desc: 'Six players, 8 lives for you. 5x XP and coins.', group: 'ELITE', lockIdx: 17, lockLabel: 'Champion 3+', partyLaunch: true },
];

const PREVIEW_BOTS = ['Bot North', 'Bot West', 'Bot East'];
const PREVIEW_RANKS = ['Gold', 'Gold', 'Gold'];
const SEAT_NAMES = ['South', 'North', 'West', 'East'];

// ─── Live arena preview: the actual game engine, practice rules, no progression ─
function ArenaPreview({ size, playerColor }: { size: number; playerColor: string }) {
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  const reduced = useReducedMotion();
  const [run, setRun] = useState(0);
  const [started, setStarted] = useState(false);
  const active = !reduced || started;

  const restart = useCallback(() => setRun(r => r + 1), []);

  return (
    <View style={{ width: size, alignSelf: 'center' }}>
      <View style={[a.frame, { width: size, height: size }]}>
        {active ? (
          <GameArena
            key={run}
            arenaSize={size - 2}
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
            paused={!focused}
          />
        ) : (
          <View style={a.reducedBox}>
            <Text style={a.reducedText}>Live preview paused while Reduce Motion is on.</Text>
            <Button label="Run preview" size="sm" variant="secondary" icon="play" onPress={() => setStarted(true)} />
          </View>
        )}
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
      <Text style={a.caption}>
        Practice preview running on the match engine. Drag along your edge to move. Nothing here counts toward rank or rewards.
      </Text>
    </View>
  );
}

// ─── Home ────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const {
    profile, isLoaded, showStreakModal, dismissStreakModal,
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
  const arenaSize = Math.min(width - 32, width > 700 ? 340 : Math.max(220, height * 0.28));

  const selected = useMemo(() => MODES.find(m => m.key === selectedKey) ?? MODES[0]!, [selectedKey]);
  const isLocked = (m: ModeDef) => m.lockIdx != null && playerRankIdx < m.lockIdx;
  const waitingOnLeader = isInParty && !isLeader;
  const selectedLocked = isLocked(selected);
  const partyBlocks = waitingOnLeader && (selected.kind === 'ranked' || selected.kind === 'casual' || selected.kind === 'variant' || selected.kind === 'elite');

  function baseConfig() {
    return {
      playerName: profile.name, playerSkinId: skin.id,
      playerColor: skin.color, playerGlowColor: skin.glowColor,
      playerRelicId: 'none' as const,
    };
  }

  function launchMatch(matchType: MatchType, variant: GameVariant) {
    if (waitingOnLeader) return;
    setGameConfig({ ...baseConfig(), matchType, variant });
    if (isInParty && isLeader) launchParty({ matchType, variant });
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
    : isInParty && isLeader && selected.partyLaunch ? `Play ${selected.name} with party`
    : `Play ${selected.name}`;

  const groups: ModeDef['group'][] = ['MATCH', 'SOLO', 'VARIANT', 'ELITE'];

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
        {/* Header: player identity and wallet */}
        <View style={s.header}>
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel={`Profile, ${profile.name}, level ${xpToLevel(profile.xp)}`}
            style={s.identity}
          >
            <View style={[s.avatar, { borderColor: profile.avatarFrameColor }]}>
              <Glyph value={profile.avatarEmoji} size={22} color={ui.paper} />
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
            <RankBadge rank={profile.rank} size="sm" showLabel={false} />
            <IconButton icon="settings" label="Settings" onPress={() => router.push('/settings')} />
          </View>
        </View>

        {/* XP line */}
        <View style={s.xpWrap}>
          <View style={s.xpTrack}>
            <View style={[s.xpFill, { width: `${Math.round(rankInfo.progress * 100)}%` as never, backgroundColor: rankData?.color ?? ui.ochre }]} />
          </View>
          <Text style={s.xpText}>{rankInfo.next ? `${rankInfo.remaining.toLocaleString()} XP to ${rankInfo.next}` : 'Top rank reached'}</Text>
        </View>

        {/* The arena itself */}
        <View style={{ marginTop: 14 }}>
          <ArenaPreview size={arenaSize} playerColor={skin.color} />
        </View>

        {/* Selected mode + single Play */}
        <View style={s.block}>
          <Panel style={s.selectedPanel}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.kicker}>Selected mode</Text>
              <Text style={s.selectedName}>{selected.name}</Text>
              <Text style={s.selectedDesc}>{selected.sub} · {selected.desc}</Text>
            </View>
            {selectedLocked ? <Chip label={selected.lockLabel ?? 'Locked'} tone="clay" /> : null}
          </Panel>
          <Button
            testID="home-play"
            label={playLabel}
            size="lg"
            icon={selectedLocked ? 'lock' : 'play'}
            disabled={selectedLocked || partyBlocks}
            loading={selected.kind === 'challenge' && challengeLoading}
            onPress={handlePlay}
            style={{ marginTop: 8 }}
          />
          {challengeError && selected.kind === 'challenge' ? (
            <View style={s.errorRow}>
              <Text style={s.errorText}>{challengeError}</Text>
              <Button label="Retry" size="sm" variant="ghost" onPress={startChallenge} />
            </View>
          ) : null}
          {partyBlocks ? <Text style={s.note}>You are in a party. The leader picks the mode and launches for everyone. Solo modes stay available.</Text> : null}
          {isInParty && isLeader && !selected.partyLaunch ? <Text style={s.note}>This mode starts for you only. Party members stay on their home screen.</Text> : null}
        </View>

        {/* Mode selection */}
        <View style={s.block}>
          {groups.map(g => (
            <View key={g} style={{ marginBottom: 12 }}>
              <SectionLabel title={g === 'MATCH' ? 'Four-seat match' : g === 'SOLO' ? 'Solo' : g === 'VARIANT' ? 'Variants' : 'Elite'} />
              <View style={s.modeGrid}>
                {MODES.filter(m => m.group === g).map(m => {
                  const locked = isLocked(m);
                  const on = m.key === selected.key;
                  return (
                    <Pressable
                      key={m.key}
                      onPress={() => setSelectedKey(m.key)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on, disabled: locked }}
                      accessibilityLabel={`${m.name}, ${m.sub}${locked ? `, locked until ${m.lockLabel}` : ''}`}
                      style={({ pressed }) => [s.modeCell, on && s.modeCellOn, pressed && { backgroundColor: ui.graphite2 }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {locked ? <Feather name="lock" size={12} color={ui.muted} /> : null}
                        <Text style={[s.modeName, on && { color: ui.ochre }, locked && { color: ui.muted }]} numberOfLines={1}>{m.name}</Text>
                      </View>
                      <Text style={s.modeSub} numberOfLines={1}>{locked ? m.lockLabel : m.sub}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
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
                  ? 'You lead. Pick a four-seat mode and press Play to send the party to the lobby. In the arena, seats not filled by you are played by local bots.'
                  : 'Waiting for the leader to launch. In the arena, seats not filled by you are played by local bots.'}
              </Text>
            </Panel>
          )}
        </View>

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
                  accessibilityLabel={`${sup.name}${unlocked ? '' : `, unlocks at level ${sup.unlockLevel}`}`}
                  style={({ pressed }) => [s.superCell, active && unlocked && s.modeCellOn, pressed && { backgroundColor: ui.graphite2 }, !unlocked && { opacity: 0.5 }]}
                >
                  <Glyph value={sup.icon} size={20} color={active && unlocked ? ui.ochre : ui.paperDim} />
                  <Text style={[s.modeName, active && unlocked && { color: ui.ochre }]}>{sup.name}</Text>
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
      </ScrollView>
    </View>
  );
}

const a = StyleSheet.create({
  frame: { borderWidth: 1, borderColor: ui.lineStrong, backgroundColor: ui.ink, overflow: 'hidden', borderRadius: 2 },
  reducedBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  reducedText: { fontFamily: fonts.body, fontSize: 14, color: ui.paperDim, textAlign: 'center' },
  seats: { flexDirection: 'row', borderWidth: 1, borderTopWidth: 0, borderColor: ui.lineStrong, backgroundColor: ui.graphite },
  seat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 8 },
  seatDivider: { borderRightWidth: 1, borderRightColor: ui.line },
  seatSwatch: { width: 4, height: 24 },
  seatPos: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 1, color: ui.paper, textTransform: 'uppercase' },
  seatWho: { fontFamily: fonts.body, fontSize: 11, color: ui.muted },
  caption: { fontFamily: fonts.body, fontSize: 12, color: ui.muted, marginTop: 6, lineHeight: 16 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: ui.ink },
  skel: { backgroundColor: ui.graphite, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, gap: 12 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  avatar: { width: 44, height: 44, borderWidth: 2, borderRadius: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: ui.graphite },
  name: { fontFamily: fonts.display, fontSize: 22, color: ui.paper, letterSpacing: 0.5 },
  meta: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: ui.muted },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: ui.line, borderRadius: 3, paddingHorizontal: 8, height: 32 },
  walletText: { fontFamily: fonts.display, fontSize: 17, color: ui.paper, fontVariant: ['tabular-nums'] },
  xpWrap: { paddingHorizontal: 16, marginTop: 12, gap: 4 },
  xpTrack: { height: 4, backgroundColor: ui.graphite2 },
  xpFill: { height: 4 },
  xpText: { fontFamily: fonts.body, fontSize: 12, color: ui.muted },
  block: { paddingHorizontal: 16, marginTop: 18 },
  selectedPanel: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, color: ui.muted, textTransform: 'uppercase' },
  selectedName: { fontFamily: fonts.display, fontSize: 28, color: ui.paper, letterSpacing: 0.5, textTransform: 'uppercase' },
  selectedDesc: { fontFamily: fonts.body, fontSize: 14, color: ui.paperDim },
  note: { fontFamily: fonts.body, fontSize: 13, color: ui.muted, marginTop: 8, lineHeight: 18 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  errorText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 13, color: ui.clay },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  modeCell: { flexBasis: '48%', flexGrow: 1, borderWidth: 1, borderColor: ui.line, borderRadius: 3, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: ui.graphite, minHeight: 52 },
  modeCellOn: { borderColor: ui.ochre, borderWidth: 2, paddingHorizontal: 9, paddingVertical: 8 },
  modeName: { fontFamily: fonts.display, fontSize: 17, color: ui.paper, letterSpacing: 0.5, textTransform: 'uppercase' },
  modeSub: { fontFamily: fonts.body, fontSize: 12, color: ui.muted },
  superCell: { flexBasis: '31%', flexGrow: 1, borderWidth: 1, borderColor: ui.line, borderRadius: 3, padding: 10, gap: 2, backgroundColor: ui.graphite },
  body: { fontFamily: fonts.body, fontSize: 14, color: ui.paperDim, lineHeight: 19 },
  codeInput: { flex: 1, height: 44, borderWidth: 1, borderColor: ui.line, borderRadius: 3, backgroundColor: ui.graphite2, color: ui.paper, fontFamily: fonts.display, fontSize: 20, letterSpacing: 4, paddingHorizontal: 12 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: ui.line },
  partyCode: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 6, color: ui.ochre },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  memberAvatar: { width: 32, height: 32, borderRadius: 3, borderWidth: 1, borderColor: ui.line, alignItems: 'center', justifyContent: 'center' },
  memberName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: ui.paper },
  memberMeta: { fontFamily: fonts.body, fontSize: 12, color: ui.muted },
  tier: { width: 132, borderWidth: 1, borderColor: ui.line, borderRadius: 3, padding: 10, gap: 4, backgroundColor: ui.graphite },
  tierReward: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: ui.paperDim, minHeight: 32 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: ui.line, borderRadius: 3, padding: 12, backgroundColor: ui.graphite },
  streakCell: { width: 18, height: 6, borderWidth: 1, borderColor: ui.line },
});
