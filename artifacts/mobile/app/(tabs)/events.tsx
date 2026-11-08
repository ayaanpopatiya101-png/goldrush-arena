import { Text } from '@/components/ui/Text';
import { Feather } from '@expo/vector-icons';
import { Panel, ScreenTitle, Shell, paperText } from '@/components/ui/Primitives';
import { tactile } from '@/constants/colors';
import * as Haptics from '@/utils/haptics';
import { LinearGradient } from '@/components/ui/Flat';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View,  } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useFocusAnimation } from '@/hooks/useFocusAnimation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  EVENT_MIN_RANK_INDEX,
  getCurrentEvents, getEventQualifierState, getRankIndex, RANKS, SKINS, usePlayer,
  type EventDefinition, type QualifierRoundDef,
} from '@/context/PlayerContext';
import { useColors } from '@/hooks/useColors';
import {
  setActiveEvent, setGameConfig, setQualifierContext,
  type ActiveEventBonus, type GameVariant,
} from '@/store/gameSession';
import { getActiveFeaturedMode, useFeaturedModeCountdown, type FeaturedMode } from '@/utils/featuredModes';
import { FloatingOrbs, GlowText, PulseRing, ShimmerCard, GlowBorder } from '@/components/effects';
import { Glyph } from '@/components/ui/Glyph';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 1)   return `${d}d ${h}h`;
  if (d === 1) return `1d ${h}h`;
  if (h > 0)   return `${h}h ${m}m`;
  return `${m}m`;
}

const PLACEMENT_ICONS = ['🥇', '🥈', '🥉', '4️⃣'];
const GENERAL1 = RANKS[EVENT_MIN_RANK_INDEX] ?? RANKS.find(r => r.name === 'General 1');

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function EventsScreen() {
  const colors    = useColors();
  const insets    = useSafeAreaInsets();
  const { profile, spendEventPlay, spendQualifierPlay } = usePlayer();

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const events  = getCurrentEvents();
  const rankIdx = getRankIndex(profile.rank);
  const hasRank = rankIdx >= EVENT_MIN_RANK_INDEX;
  const topPad  = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const focusStyle = useFocusAnimation();
  const nextRank = RANKS.find(r => r.minXP > profile.xp) ?? null;

  function handlePlayFeaturedMode(mode: FeaturedMode) {
    const skin = SKINS.find(sk => sk.id === profile.currentSkin) ?? SKINS[0];
    setGameConfig({
      playerName:      profile.name,
      playerSkinId:    skin.id,
      playerColor:     skin.color,
      playerGlowColor: skin.glowColor,
      playerRelicId:   'none',
      matchType:       'casual',
      variant:         'classic',
      featuredModeId:          mode.id,
      featuredCoinMult:        mode.overrides.coinMultiplier,
      featuredXpMult:          mode.overrides.xpMultiplier,
      featuredBallSpeedFactor: mode.overrides.ballSpeedFactor,
    });
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/lobby');
  }

  function mainDrawPlaysLeft(ev: EventDefinition): number {
    const used = (profile.eventPlaysUsed ?? {})[ev.periodKey] ?? 0;
    return Math.max(0, ev.maxPlays - used);
  }

  async function handlePlayQualifier(ev: EventDefinition, roundIdx: number, roundDef: QualifierRoundDef) {
    if (!hasRank || ev.isLocked) return;
    const ok = await spendQualifierPlay(ev.periodKey, roundIdx);
    if (!ok) return;
    setQualifierContext({
      periodKey:   ev.periodKey,
      roundIdx,
      roundName:   roundDef.name,
      totalRounds: ev.rounds!.length,
      threshold:   roundDef.threshold,
      qpPerPlace:  roundDef.qpPerPlace,
      eventName:   ev.name,
      eventEmoji:  ev.emoji,
      eventColor:  ev.color,
    });
    setGameConfig({
      playerName:      profile.name,
      playerSkinId:    profile.currentSkin ?? 'default',
      playerColor:     profile.avatarFrameColor ?? '#F36B3F',
      playerGlowColor: (profile.avatarFrameColor ?? '#F36B3F') + '55',
      matchType:       'ranked',
      variant:         ev.mode as GameVariant,
      playerRelicId:   'none',
    });
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/game');
  }

  async function handlePlayMainDraw(ev: EventDefinition) {
    if (!hasRank || ev.isLocked) return;
    const ok = await spendEventPlay(ev.periodKey);
    if (!ok) return;
    const bonus: ActiveEventBonus = {
      eventId:     ev.id,
      eventName:   ev.name,
      eventEmoji:  ev.emoji,
      eventColor:  ev.color,
      winXP:       ev.winRewards.xp,
      winCoins:    ev.winRewards.coins,
      loseXP:      ev.loseRewards.xp,
      loseCoins:   ev.loseRewards.coins,
      winCredits:  ev.creditsOnWin,
      loseCredits: ev.creditsOnLose,
    };
    setActiveEvent(bonus);
    setGameConfig({
      playerName:      profile.name,
      playerSkinId:    profile.currentSkin ?? 'default',
      playerColor:     profile.avatarFrameColor ?? '#F36B3F',
      playerGlowColor: (profile.avatarFrameColor ?? '#F36B3F') + '55',
      matchType:       'ranked',
      variant:         ev.mode as GameVariant,
      playerRelicId:   'none',
    });
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/game');
  }

  return (
    <Reanimated.View style={[s.root, { backgroundColor: colors.background }, focusStyle]}>
      <FloatingOrbs opacity={0.8} />
      <LinearGradient colors={['#EEE9DE', '#EEE9DE', '#EEE9DE']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['#EDBA3C22', '#EDBA3C0E', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', '#EEE9DE88']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 280 }}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 6 }]}>
        <View style={{ flex: 1 }}>
          <ScreenTitle kicker="GoldRush Arena" title="Events" />
          <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
            Featured mode open to all · competitions from {GENERAL1?.name ?? 'the required rank'}
          </Text>
        </View>
        <View style={[s.datePill, { borderColor: colors.border }]}>
          <Feather name="calendar" size={11} color={colors.mutedForeground} />
          <Text style={[s.dateText, { color: colors.mutedForeground }]}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 144 }}
      >
        <Shell style={{ gap: 14 }}>
        {/* ── Featured Mode ── */}
        <FeaturedModeSection onPlay={handlePlayFeaturedMode} />

        {/* Advanced competitions: clearly separated, gates unchanged */}
        <View style={s.advHeader} accessibilityRole="header">
          <Text style={s.advTitle}>ADVANCED COMPETITIONS</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#575D5C' }} />
          <Text style={s.advMeta}>{hasRank ? 'UNLOCKED' : `REQUIRES ${GENERAL1?.name.toUpperCase() ?? 'GENERAL 1'}`}</Text>
        </View>
        {!hasRank && (
          <Panel tone="paper" style={[s.rankGate, { borderLeftWidth: 6, borderLeftColor: tactile.coral }]}>
            <Feather name="flag" size={22} color={paperText.ink} />
            <View style={{ flex: 1 }}>
              <Text style={[s.rankGateTitle, { color: paperText.ink }]}>YOUR NEXT STEP: {nextRank ? nextRank.name.toUpperCase() : profile.rank.toUpperCase()}</Text>
              <Text style={[s.rankGateBody, { color: paperText.ink }]}>
                {nextRank
                  ? `${(nextRank.minXP - profile.xp).toLocaleString()} XP to ${nextRank.name}. Ranked, Casual and the featured mode above all earn XP.`
                  : 'You are at the top XP rank.'}
              </Text>
              <Text style={[s.rankGateReq, { color: paperText.muted }]}>
                The Weekly, Monthly Cup and Grand Prix below open at {GENERAL1?.name ?? 'General 1'} ({(GENERAL1?.minXP ?? 0).toLocaleString()} XP). You are {profile.rank}. You can read the formats now; entry stays locked until then.
              </Text>
            </View>
          </Panel>
        )}

        {/* Weekly, direct entry, no qualifier */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <GlowText intensity="medium" color='#252A2B' style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2 }}>WEEKLY EVENT</GlowText>
          <View style={{ flex: 1, height: 1, backgroundColor: '#575D5C44' }} />
          <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: '#575D5C', letterSpacing: 1 }}>DIRECT ENTRY</Text>
        </View>
        <EventCard
          ev={events.weekly}
          rankGated={!hasRank}
          mainDrawPlaysLeft={mainDrawPlaysLeft(events.weekly)}
          qs={null}
          onPlayQualifier={() => {}}
          onPlayMainDraw={() => handlePlayMainDraw(events.weekly)}
        />

        {/* Monthly Cup, 2-round qualifier */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, marginTop: 4 }}>
          <GlowText intensity="medium" color='#252A2B' style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2 }}>MONTHLY CUP</GlowText>
          <View style={{ flex: 1, height: 1, backgroundColor: '#575D5C44' }} />
          <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: '#575D5C', letterSpacing: 1 }}>2-ROUND QUALIFIER</Text>
        </View>
        <EventCard
          ev={events.monthly}
          rankGated={!hasRank}
          mainDrawPlaysLeft={mainDrawPlaysLeft(events.monthly)}
          qs={getEventQualifierState(profile, events.monthly)}
          onPlayQualifier={(rIdx, rDef) => handlePlayQualifier(events.monthly, rIdx, rDef)}
          onPlayMainDraw={() => handlePlayMainDraw(events.monthly)}
        />

        {/* Annual Grand Prix, 3-round qualifier */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, marginTop: 4 }}>
          <GlowText intensity="medium" color='#252A2B' style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2 }}>ANNUAL GRAND PRIX</GlowText>
          <View style={{ flex: 1, height: 1, backgroundColor: '#575D5C44' }} />
          <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: '#575D5C', letterSpacing: 1 }}>3-ROUND QUALIFIER</Text>
        </View>
        <EventCard
          ev={events.annual}
          rankGated={!hasRank}
          mainDrawPlaysLeft={mainDrawPlaysLeft(events.annual)}
          qs={getEventQualifierState(profile, events.annual)}
          onPlayQualifier={(rIdx, rDef) => handlePlayQualifier(events.annual, rIdx, rDef)}
          onPlayMainDraw={() => handlePlayMainDraw(events.annual)}
        />

        <View style={[s.infoBox, { borderColor: '#575D5C66', backgroundColor: '#E3DFD3' }]}>
          <Glyph style={s.infoIcon} value="⚡" />
          <Text style={[s.infoText, { color: '#575D5C' }]}>
            All participants earn <Text style={{ color: '#252A2B' }}>Credits</Text> (spent in the Forge to craft items) plus bonus XP and coins in the <Text style={{ color: '#252A2B' }}>Main Draw</Text>. Qualifier rounds award <Text style={{ color: '#252A2B' }}>Qualifier Points (QP)</Text> based on finishing place; earn enough QP to advance to the next stage.
          </Text>
        </View>
        </Shell>
      </ScrollView>
    </Reanimated.View>
  );
}

// ─── Featured Mode Section ────────────────────────────────────────────────────
function FeaturedModeSection({ onPlay }: { onPlay: (mode: FeaturedMode) => void }) {
  const { mode, timeLeft } = useFeaturedModeCountdown();
  if (!mode) return null;

  const { d, h, m: min, s: sec } = timeLeft;
  const timeStr = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${min}m` : `${min}m ${sec}s`;
  const color = mode.color;

  return (
    <View style={{ gap: 8, marginBottom: 4 }}>
      {/* Section header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 0 }}>
        <GlowText intensity="medium" color={color} style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color }}>FEATURED THIS WEEK</GlowText>
        <View style={{ flex: 1, height: 1, backgroundColor: '#575D5C44' }} />
        <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: '#575D5C', letterSpacing: 1 }}>OPEN TO ALL · CASUAL · COMPETITIVE LEVEL UNCHANGED</Text>
      </View>

      {/* Card */}
        <View style={[s.card, { backgroundColor: '#E3DFD3', borderColor: '#575D5C' }]}>
        <LinearGradient colors={[color + '14', 'transparent']} style={StyleSheet.absoluteFill} />

        {/* Top row */}
        <View style={s.cardTop}>
          <View style={[s.typeBadge, { borderColor: color + '55', backgroundColor: color + '18' }]}>
            <Glyph style={{ fontSize: 12, marginRight: 3 }} value={mode.emoji} />
            <Text style={[s.badgeText, { color: '#252A2B' }]}>FEATURED</Text>
          </View>
            <View style={[s.timePill, { borderColor: '#575D5C66' }]}>
            <Feather name="clock" size={9} color="#575D5C" />
            <Text style={[s.timeText, { color: '#575D5C' }]}>{timeStr} left</Text>
          </View>
        </View>

        {/* Name row */}
        <View style={s.nameRow}>
          <Glyph style={s.eventEmoji} value={mode.emoji} />
          <View style={{ flex: 1 }}>
            <GlowText intensity="medium" color="#252A2B" style={s.eventName}>{mode.name}</GlowText>
            <Text style={[s.eventDesc, { color: '#575D5C' }]}>{mode.descriptor}</Text>
          </View>
        </View>

        {/* Rule summary */}
        <View style={{ gap: 5 }}>
          {mode.ruleSummary.map((rule, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color + '99' }} />
              <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 12, color: '#575D5C', lineHeight: 18 }}>{rule}</Text>
            </View>
          ))}
        </View>

        {/* Override pills */}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {mode.overrides.coinMultiplier != null && (
            <View style={[s.rewardPill]}>
              <Text style={[s.rewardValue, { color: '#252A2B' }]}>{mode.overrides.coinMultiplier}× </Text>
              <Text style={s.rewardLabel}>COINS</Text>
            </View>
          )}
          {mode.overrides.xpMultiplier != null && (
            <View style={[s.rewardPill]}>
              <Text style={[s.rewardValue, { color: '#252A2B' }]}>{mode.overrides.xpMultiplier}× </Text>
              <Text style={s.rewardLabel}>XP</Text>
            </View>
          )}
          {mode.overrides.ballSpeedFactor != null && (
            <View style={[s.rewardPill]}>
              <Text style={[s.rewardValue, { color: '#252A2B' }]}>{mode.overrides.ballSpeedFactor}× </Text>
              <Text style={s.rewardLabel}>BALL SPEED</Text>
            </View>
          )}
        </View>

        {/* Play button */}
        <Pressable
          onPress={() => onPlay(mode)}
          accessibilityRole="button"
          accessibilityLabel={`Play ${mode.name}, casual match, competitive level unchanged`}
          style={({ pressed }) => [
            s.playBtn,
            { backgroundColor: '#F36B3F', borderColor: '#252A2B',
              opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <Text style={[s.playBtnText, { color: '#252A2B' }]}>PLAY {mode.name.toUpperCase()}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────
type QS = ReturnType<typeof getEventQualifierState>;

// ─── Event Card ────────────────────────────────────────────────────────────────
function EventCard({
  ev, rankGated, mainDrawPlaysLeft, qs, onPlayQualifier, onPlayMainDraw,
}: {
  ev: EventDefinition;
  rankGated: boolean;
  mainDrawPlaysLeft: number;
  qs: QS;
  onPlayQualifier: (roundIdx: number, roundDef: QualifierRoundDef) => void;
  onPlayMainDraw: () => void;
}) {
  const modeName: Record<string, string> = {
    classic: 'Classic', chaos: 'Chaos', blitz: 'Blitz',
    six_player: '6-Player', survival: 'Survival', turbo: 'Turbo',
  };

  // ── DATE-LOCKED ──────────────────────────────────────────────────────────────
  if (ev.isLocked) {
    return (
      <View style={[s.card, { backgroundColor: '#E3DFD3', borderColor: '#575D5C66' }]}>
        <View style={s.cardTop}>
          <View style={[s.lockBadge, { borderColor: '#575D5C66' }]}>
            <Feather name="lock" size={10} color="#575D5C" />
            <Text style={[s.badgeText, { color: '#575D5C' }]}>LOCKED</Text>
          </View>
          <View style={[s.timePill, { borderColor: '#575D5C66' }]}>
            <Feather name="clock" size={9} color="#575D5C" />
            <Text style={[s.timeText, { color: '#575D5C' }]}>Opens {ev.opensOnLabel}</Text>
          </View>
        </View>
        <View style={s.nameRow}>
          <Glyph style={[s.eventEmoji, { opacity: 0.25 }]} value={ev.emoji} />
          <View style={{ flex: 1 }}>
            <Text style={[s.eventName, { color: '#252A2B' }]}>{ev.name}</Text>
            <Text style={[s.eventDesc, { color: '#575D5C' }]}>Opens {ev.opensOnLabel}. Check back then!</Text>
          </View>
        </View>
        <View style={[s.countdownBox, { borderColor: '#575D5C66', backgroundColor: '#E3DFD3' }]}>
          <Feather name="lock" size={14} color="#575D5C" />
          <View>
            <Text style={[s.countdownLabel, { color: '#575D5C' }]}>OPENS IN</Text>
            <Text style={[s.countdownTime, { color: '#252A2B' }]}>{fmt(ev.endsIn)}</Text>
          </View>
          <Text style={[s.countdownDate, { color: '#575D5C' }]}>{ev.opensOnLabel}</Text>
        </View>
        <View style={[s.playBtn, { backgroundColor: '#E3DFD3', borderColor: '#575D5C66', opacity: 0.8 }]}>
          <Text style={[s.playBtnText, { color: '#575D5C' }]}> OPENS {ev.opensOnLabel.toUpperCase()}</Text>
        </View>
      </View>
    );
  }

  // ── WEEKLY (no qualifier) ─────────────────────────────────────────────────────
  if (ev.rounds === null) {
    const noPlays  = mainDrawPlaysLeft === 0;
    const disabled = noPlays || rankGated;
    return (
      <GlowBorder color={ev.color ?? '#CE7863'} borderRadius={3} spread={8}>
        <View style={[s.card, { backgroundColor: '#E3DFD3', borderColor: '#575D5C' }]}>
          <LinearGradient colors={[ev.color + (disabled ? '06' : '14'), 'transparent']} style={StyleSheet.absoluteFill} />
          <View style={s.cardTop}>
            <TypeBadge label="WEEKLY" color={ev.color} dim={disabled} />
            <View style={s.cardTopRight}>
              <ModePill mode={modeName[ev.mode] ?? ev.mode} />
              <TimePill ms={ev.endsIn} label="left" />
            </View>
          </View>
          <NameRow ev={ev} dim={disabled} />
          <PlaysRow plays={mainDrawPlaysLeft} max={ev.maxPlays} color={ev.color} />
          <View style={[s.divider, { backgroundColor: '#575D5C66' }]} />
          <RewardRow ev={ev} />
          <PlayButton
            label={rankGated ? 'REQUIRES GENERAL 1' : noPlays ? 'NO PLAYS REMAINING' : `▶  PLAY ${ev.name.toUpperCase()}`}
            color="#F36B3F"
            disabled={disabled}
            onPress={onPlayMainDraw}
          />
        </View>
      </GlowBorder>
    );
  }

  // ── QUALIFIER EVENTS (monthly / annual) ───────────────────────────────────────
  if (!qs) return null; // shouldn't happen

  // ELIMINATED, used all qualifier plays without reaching threshold
  if (qs.isEliminated) {
    return (
      <View style={[s.card, { backgroundColor: '#E3DFD3', borderColor: '#575D5C' }]}>
        <View style={s.cardTop}>
          <View style={[s.lockBadge, { borderColor: '#575D5C66', backgroundColor: '#EEE9DE' }]}>
            <Text style={[s.badgeText, { color: '#252A2B' }]}>ELIMINATED</Text>
          </View>
          <TimePill ms={ev.endsIn} label="resets" />
        </View>
        <NameRow ev={ev} dim />
        <View style={[s.countdownBox, { borderColor: '#575D5C66', backgroundColor: '#EEE9DE' }]}>
          <Glyph style={{ fontSize: 20 }} value="❌" />
          <View style={{ flex: 1 }}>
            <Text style={[s.countdownLabel, { color: '#575D5C' }]}>
              {qs.roundDef.name.toUpperCase()}, ELIMINATED
            </Text>
            <Text style={[s.countdownTime, { color: '#575D5C', fontSize: 13, fontFamily: 'SourceSans3_400Regular' }]}>
              You earned <Text style={{ color: '#252A2B', fontFamily: 'SourceSans3_700Bold' }}>{qs.qp} QP</Text> but needed <Text style={{ color: '#252A2B', fontFamily: 'SourceSans3_700Bold' }}>{qs.roundDef.threshold} QP</Text> to advance.
              {'\n'}Try again next period when the event resets.
            </Text>
          </View>
        </View>
        <View style={[s.playBtn, { backgroundColor: '#EEE9DE', borderColor: '#575D5C66', opacity: 0.85 }]}>
          <Text style={[s.playBtnText, { color: '#575D5C' }]}>ELIMINATED THIS PERIOD</Text>
        </View>
      </View>
    );
  }

  // MAIN DRAW, player has qualified
  if (qs.roundDef.isMainDraw) {
    const noPlays  = mainDrawPlaysLeft === 0;
    const disabled = noPlays || rankGated;
    const roundLabel = ev.rounds.length > 2 ? 'GRAND FINAL' : 'MAIN DRAW';
    return (
      <GlowBorder color={ev.color ?? '#CE7863'} borderRadius={3} spread={8}>
        <View style={[s.card, { backgroundColor: '#E3DFD3', borderColor: '#575D5C' }]}>
          <LinearGradient colors={['#EDBA3C18', 'transparent']} style={StyleSheet.absoluteFill} />
          <View style={s.cardTop}>
            <View style={[s.qualifiedBadge, { borderColor: '#252A2B', backgroundColor: '#EDBA3C' }]}>
              <Text style={[s.badgeText, { color: '#252A2B' }]}> {roundLabel}, QUALIFIED</Text>
            </View>
            <View style={s.cardTopRight}>
              <ModePill mode={modeName[ev.mode] ?? ev.mode} />
              <TimePill ms={ev.endsIn} label="left" />
            </View>
          </View>
          <NameRow ev={ev} dim={disabled} />
          {/* Main draw plays */}
          <PlaysRow plays={mainDrawPlaysLeft} max={ev.maxPlays} color={ev.color} />
          <View style={[s.divider, { backgroundColor: '#575D5C66' }]} />
          <RewardRow ev={ev} />
          <PlayButton
            label={rankGated ? 'REQUIRES GENERAL 1' : noPlays ? 'NO PLAYS REMAINING' : `▶  PLAY ${roundLabel}`}
            color="#F36B3F"
            disabled={disabled}
            onPress={onPlayMainDraw}
          />
        </View>
      </GlowBorder>
    );
  }

  // QUALIFIER ROUND, playing to earn QP
  const disabled  = qs.playsLeft === 0 || rankGated;
  const qpFraction = Math.min(qs.qp / qs.roundDef.threshold, 1);
  const totalRounds = ev.rounds.length;
  const roundNum    = qs.roundIdx + 1;

  return (
    <GlowBorder color={ev.color ?? '#CE7863'} borderRadius={3} spread={8}>
      <View style={[s.card, { backgroundColor: '#E3DFD3', borderColor: '#575D5C' }]}>
        <LinearGradient colors={['#E3DFD30C', 'transparent']} style={StyleSheet.absoluteFill} />

        {/* Top row: round badge + mode + time */}
        <View style={s.cardTop}>
          <View style={[s.roundBadge, { borderColor: '#575D5C66', backgroundColor: '#EEE9DE' }]}>
            <Text style={s.roundBadgeEmoji}>{qs.roundDef.badge}</Text>
            <Text style={[s.badgeText, { color: '#252A2B' }]}>{qs.roundDef.name.toUpperCase()}</Text>
            <Text style={[s.roundCounter, { color: '#575D5C' }]}>  {roundNum}/{totalRounds}</Text>
          </View>
          <View style={s.cardTopRight}>
            <ModePill mode={modeName[ev.mode] ?? ev.mode} />
            <TimePill ms={ev.endsIn} label="left" />
          </View>
        </View>

        <NameRow ev={ev} dim={disabled} />

        {/* QP Progress bar */}
        <View style={s.qpSection}>
          <View style={s.qpHeader}>
            <Text style={[s.qpLabel, { color: '#575D5C' }]}>QUALIFIER POINTS</Text>
            <Text style={[s.qpValue, { color: '#252A2B' }]}>
              {qs.qp} / {qs.roundDef.threshold} QP
            </Text>
          </View>
          <View style={[s.qpTrack, { backgroundColor: '#575D5C66' }]}>
            <View style={[s.qpFill, { width: `${qpFraction * 100}%` as never, backgroundColor: '#F36B3F' }]} />
          </View>
          {qs.qp >= qs.roundDef.threshold - (qs.roundDef.qpPerPlace[0]) && qs.qp < qs.roundDef.threshold && (
            <Text style={[s.qpNearNote, { color: '#575D5C' }]}>
              One good finish can qualify you!
            </Text>
          )}
        </View>

        {/* Plays remaining */}
        <PlaysRow plays={qs.playsLeft} max={qs.roundDef.maxPlays} color="#F36B3F" />

        {/* QP per placement table */}
        <View style={[s.qpTable, { borderColor: '#575D5C66', backgroundColor: '#EEE9DE' }]}>
          <Text style={[s.qpTableTitle, { color: '#252A2B' }]}>QP PER PLACEMENT</Text>
          <View style={s.qpTableRows}>
            {qs.roundDef.qpPerPlace.map((qp, i) => (
              <View key={i} style={s.qpTableRow}>
                <Glyph style={s.qpTableIcon} value={PLACEMENT_ICONS[i]} />
                <Text style={[s.qpTablePlace, { color: '#252A2B' }]}>
                  {['1st', '2nd', '3rd', '4th'][i]}
                </Text>
                <Text style={[s.qpTablePoints, { color: '#252A2B' }]}>+{qp} QP</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Advance info */}
        <View style={[s.advanceNote, { borderColor: '#575D5C66', backgroundColor: '#EEE9DE' }]}>
          <Text style={[s.advanceText, { color: '#575D5C' }]}>
             Reach <Text style={{ color: '#252A2B', fontFamily: 'SourceSans3_700Bold' }}>{qs.roundDef.threshold} QP</Text> to advance to <Text style={{ color: '#252A2B', fontFamily: 'SourceSans3_700Bold' }}>{ev.rounds[qs.roundIdx + 1]?.name ?? 'the Final'}</Text>
          </Text>
        </View>

        <PlayButton
          label={
            rankGated    ? 'REQUIRES GENERAL 1' :
            qs.playsLeft === 0 ? 'NO PLAYS REMAINING' :
            `▶  PLAY ${qs.roundDef.name.toUpperCase()}`
          }
          color="#F36B3F"
          disabled={disabled}
          onPress={() => !disabled && onPlayQualifier(qs!.roundIdx, qs!.roundDef)}
        />
      </View>
    </GlowBorder>
  );
}

// ─── Small shared components ───────────────────────────────────────────────────
function TypeBadge({ label, color, dim }: { label: string; color: string; dim: boolean }) {
  return (
    <View style={[s.typeBadge, { borderColor: (dim ? color + '22' : color + '55'), backgroundColor: color + (dim ? '08' : '18') }]}>
          <Text style={[s.badgeText, { color: '#252A2B' }]}>{label}</Text>
    </View>
  );
}

function ModePill({ mode }: { mode: string }) {
  return (
      <View style={[s.modePill, { borderColor: '#575D5C66' }]}>
      <Text style={[s.modeText, { color: '#575D5C' }]}>{mode}</Text>
    </View>
  );
}

function TimePill({ ms, label }: { ms: number; label: string }) {
  return (
    <View style={[s.timePill, { borderColor: '#575D5C66' }]}>
      <Feather name="clock" size={9} color="#575D5C" />
      <Text style={[s.timeText, { color: '#575D5C' }]}>{fmt(ms)} {label}</Text>
    </View>
  );
}

function NameRow({ ev, dim }: { ev: EventDefinition; dim: boolean }) {
  return (
    <View style={s.nameRow}>
      <Glyph style={[s.eventEmoji, { opacity: dim ? 0.25 : 1 }]} value={ev.emoji} />
      <View style={{ flex: 1 }}>
        <GlowText intensity="medium" color="#252A2B" style={s.eventName}>{ev.name}</GlowText>
        <Text style={[s.eventDesc, { color: '#575D5C' }]}>{ev.description}</Text>
      </View>
    </View>
  );
}

function PlaysRow({ plays, max, color }: { plays: number; max: number; color: string }) {
  return (
    <View style={s.playsRow}>
      <Text style={[s.playsLabel, { color: '#575D5C' }]}>PLAYS</Text>
      <View style={s.dots}>
        {Array.from({ length: max }).map((_, i) => (
          <View key={i} style={[s.dot, { backgroundColor: i < plays ? color : '#575D5C66' }]} />
        ))}
      </View>
      <Text style={[s.playsRemaining, { color: plays === 0 ? '#575D5C' : '#252A2B' }]}>
        {plays === 0 ? 'DONE' : `${plays}/${max}`}
      </Text>
    </View>
  );
}

function RewardRow({ ev }: { ev: EventDefinition }) {
  return (
    <>
      <View style={s.rewardRow}>
        <RewardPill label="WIN XP"    value={`+${ev.winRewards.xp}`} />
        <RewardPill label="WIN COINS" value={`+${ev.winRewards.coins}`} />
        <RewardPill label="CREDITS"   value={`+${ev.creditsOnWin}`} prefix="⚡" />
      </View>
      <Text style={[s.lossNote, { color: '#575D5C' }]}>
        Loss: +{ev.loseRewards.xp} XP · +{ev.loseRewards.coins} coins · +{ev.creditsOnLose}
      </Text>
    </>
  );
}

function RewardPill({ label, value, prefix = '' }: {
  label: string; value: string; prefix?: string;
}) {
  return (
    <View style={s.rewardPill}>
      <Text style={[s.rewardValue, { color: '#252A2B' }]}>{prefix}{value}</Text>
      <Text style={[s.rewardLabel, { color: '#575D5C' }]}>{label}</Text>
    </View>
  );
}

function PlayButton({ label, color, disabled, onPress }: {
  label: string; color: string; disabled: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label.replace('▶', '').trim()}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        s.playBtn,
        {
          backgroundColor: disabled ? '#E3DFD3' : color,
          borderColor:     disabled ? '#575D5C66' : '#252A2B',
          opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
      ]}
    >
      <Text style={[s.playBtnText, { color: disabled ? '#575D5C' : '#252A2B' }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  advHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  advTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 18, letterSpacing: 1, color: '#252A2B' },
  advMeta: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 0.8, color: '#575D5C' },
  root:            { flex: 1 },
  header:          { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  title:           { fontFamily: 'SourceSans3_700Bold', fontSize: 24, letterSpacing: 2 },
  subtitle:        { fontFamily: 'SourceSans3_400Regular', fontSize: 12, marginTop: 2, letterSpacing: 0.4 },
  datePill:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 2, borderRadius: 0, paddingHorizontal: 10, paddingVertical: 5 },
  dateText:        { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12 },
  scroll:          { paddingHorizontal: 16, paddingTop: 4, gap: 14 },

  rankGate:        { borderRadius: 3, borderWidth: 1, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start', overflow: 'hidden' },
  rankGateIcon:    { fontSize: 26, marginTop: 2 },
  rankGateTitle:   { fontFamily: 'SourceSans3_700Bold', fontSize: 13, letterSpacing: 1.2, marginBottom: 6 },
  rankGateBody:    { fontFamily: 'SourceSans3_400Regular', fontSize: 13, lineHeight: 19 },
  rankGateReq:     { fontFamily: 'SourceSans3_400Regular', fontSize: 12, marginTop: 8, lineHeight: 16 },

  card:            { borderRadius: 0, borderWidth: 2, padding: 16, overflow: 'hidden', gap: 12 },
  cardTop:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTopRight:    { flexDirection: 'row', gap: 6, alignItems: 'center' },

  typeBadge:       { borderWidth: 2, borderRadius: 0, paddingHorizontal: 8, paddingVertical: 3 },
  lockBadge:       { borderWidth: 2, borderRadius: 0, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 },
  qualifiedBadge:  { borderWidth: 2, borderRadius: 0, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  roundBadge:      { borderWidth: 2, borderRadius: 0, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center' },
  roundBadgeEmoji: { fontSize: 12, marginRight: 4 },
  roundCounter:    { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12 },
  badgeText:       { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1 },

  modePill:        { borderWidth: 2, borderRadius: 0, paddingHorizontal: 8, paddingVertical: 3 },
  modeText:        { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, letterSpacing: 0.4 },
  timePill:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 2, borderRadius: 0, paddingHorizontal: 8, paddingVertical: 3 },
  timeText:        { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12 },

  nameRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  eventEmoji:      { fontSize: 28, lineHeight: 34 },
  eventName:       { fontFamily: 'SourceSans3_700Bold', fontSize: 17, letterSpacing: 0.5 },
  eventDesc:       { fontFamily: 'SourceSans3_400Regular', fontSize: 12, marginTop: 3, lineHeight: 17 },

  countdownBox:    { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderRadius: 0, paddingHorizontal: 14, paddingVertical: 12 },
  countdownLabel:  { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1.2 },
  countdownTime:   { fontFamily: 'SourceSans3_700Bold', fontSize: 18, marginTop: 1 },
  countdownDate:   { fontFamily: 'SourceSans3_400Regular', fontSize: 12, marginLeft: 'auto' as never },

  playsRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playsLabel:      { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, letterSpacing: 1, width: 38 },
  dots:            { flexDirection: 'row', gap: 5, flex: 1 },
  dot:             { width: 10, height: 10, borderRadius: 3 },
  playsRemaining:  { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12 },

  divider:         { height: 1, borderRadius: 2 },

  rewardRow:       { flexDirection: 'row', gap: 8 },
  rewardPill:      { flex: 1, alignItems: 'center', gap: 2 },
  rewardValue:     { fontFamily: 'SourceSans3_700Bold', fontSize: 15 },
  rewardLabel:     { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, letterSpacing: 0.8 },
  lossNote:        { fontFamily: 'SourceSans3_400Regular', fontSize: 12, textAlign: 'center' },

  // QP section
  qpSection:       { gap: 6 },
  qpHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qpLabel:         { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1 },
  qpValue:         { fontFamily: 'SourceSans3_700Bold', fontSize: 13 },
  qpTrack:         { height: 8, borderRadius: 4, overflow: 'hidden' },
  qpFill:          { height: '100%', borderRadius: 4 },
  qpNearNote:      { fontFamily: 'SourceSans3_400Regular', fontSize: 12, textAlign: 'center' },

  // QP placement table
  qpTable:         { borderRadius: 3, borderWidth: 1, padding: 12, gap: 6 },
  qpTableTitle:    { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1.2, marginBottom: 2 },
  qpTableRows:     { gap: 6 },
  qpTableRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qpTableIcon:     { fontSize: 14, width: 22 },
  qpTablePlace:    { fontFamily: 'SourceSans3_600SemiBold', fontSize: 13, flex: 1 },
  qpTablePoints:   { fontFamily: 'SourceSans3_700Bold', fontSize: 14 },

  advanceNote:     { borderRadius: 3, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  advanceText:     { fontFamily: 'SourceSans3_400Regular', fontSize: 12, lineHeight: 17 },

  playBtn:         { borderRadius: 0, borderWidth: 2, paddingVertical: 14, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  playBtnText:     { fontFamily: 'SourceSans3_700Bold', fontSize: 13, letterSpacing: 1.5 },

  infoBox:         { flexDirection: 'row', gap: 10, borderWidth: 2, borderRadius: 0, padding: 14, alignItems: 'flex-start', marginTop: 2 },
  infoIcon:        { fontSize: 14 },
  infoText:        { fontFamily: 'SourceSans3_400Regular', fontSize: 12, flex: 1, lineHeight: 18 },
});
