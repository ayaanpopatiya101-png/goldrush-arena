import { Text } from '@/components/ui/Text';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from '@/components/ui/FlatSurface';
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
const GENERAL1 = RANKS.find(r => r.name === 'General 1');

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
      playerColor:     profile.avatarFrameColor ?? '#D0AF66',
      playerGlowColor: (profile.avatarFrameColor ?? '#D0AF66') + '55',
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
      playerColor:     profile.avatarFrameColor ?? '#D0AF66',
      playerGlowColor: (profile.avatarFrameColor ?? '#D0AF66') + '55',
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
      <LinearGradient colors={['#191B19', '#191B19', '#191B19']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['#BB786522', '#BB78650E', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', '#191B1988']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 280 }}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 6 }]}>
        <View>
          <Text style={{ fontFamily: 'System', fontSize: 10, letterSpacing: 2.5, color: '#EEE7D844', marginBottom: 2 }}>GOLDRUSH ARENA</Text>
          <GlowText intensity="medium" color='#BB7865' style={s.title}>EVENTS</GlowText>
          <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
            Exclusive · General 1+ · Qualifier system
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
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 90 }]}
      >
        {/* Rank gate — shown below General 1 */}
        {!hasRank && (
          <View style={[s.rankGate, { borderColor: '#BB7865AA', backgroundColor: '#BB786510' }]}>
            <LinearGradient colors={['#BB786520', 'transparent']} style={StyleSheet.absoluteFill} />
            <Text style={s.rankGateIcon}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.rankGateTitle, { color: '#BB7865' }]}>EVENTS LOCKED</Text>
              <Text style={[s.rankGateBody, { color: '#EEE7D888' }]}>
                Events require{' '}
                <Text style={{ color: GENERAL1?.color ?? '#BB7865', fontFamily: 'System' }}>General 1</Text>
                {' '}rank. Earn matches, climb ranks, and return to compete in the qualifier ladder.
              </Text>
              <Text style={[s.rankGateReq, { color: '#EEE7D844' }]}>
                Your rank: <Text style={{ color: RANKS.find(r => r.name === profile.rank)?.color ?? '#FFF' }}>{profile.rank}</Text>
                {'  ·  '}
                <Text style={{ color: GENERAL1?.color ?? '#BB7865' }}>General 1</Text>{' '}requires {(340_000 - Math.min(profile.xp, 340_000)).toLocaleString()} more XP
              </Text>
            </View>
          </View>
        )}

        {/* ── Featured Mode ── */}
        <FeaturedModeSection onPlay={handlePlayFeaturedMode} />

        {/* Weekly — direct entry, no qualifier */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <GlowText intensity="medium" color='#BB7865' style={{ fontFamily: 'System', fontSize: 12, letterSpacing: 2 }}>WEEKLY EVENT</GlowText>
          <View style={{ flex: 1, height: 1, backgroundColor: '#EEE7D80E' }} />
          <Text style={{ fontFamily: 'System', fontSize: 9, color: '#EEE7D833', letterSpacing: 1 }}>DIRECT ENTRY</Text>
        </View>
        <EventCard
          ev={events.weekly}
          rankGated={!hasRank}
          mainDrawPlaysLeft={mainDrawPlaysLeft(events.weekly)}
          qs={null}
          onPlayQualifier={() => {}}
          onPlayMainDraw={() => handlePlayMainDraw(events.weekly)}
        />

        {/* Monthly Cup — 2-round qualifier */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, marginTop: 4 }}>
          <GlowText intensity="medium" color='#BB7865' style={{ fontFamily: 'System', fontSize: 12, letterSpacing: 2 }}>MONTHLY CUP</GlowText>
          <View style={{ flex: 1, height: 1, backgroundColor: '#EEE7D80E' }} />
          <Text style={{ fontFamily: 'System', fontSize: 9, color: '#EEE7D833', letterSpacing: 1 }}>2-ROUND QUALIFIER</Text>
        </View>
        <EventCard
          ev={events.monthly}
          rankGated={!hasRank}
          mainDrawPlaysLeft={mainDrawPlaysLeft(events.monthly)}
          qs={getEventQualifierState(profile, events.monthly)}
          onPlayQualifier={(rIdx, rDef) => handlePlayQualifier(events.monthly, rIdx, rDef)}
          onPlayMainDraw={() => handlePlayMainDraw(events.monthly)}
        />

        {/* Annual Grand Prix — 3-round qualifier */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, marginTop: 4 }}>
          <GlowText intensity="medium" color='#BB7865' style={{ fontFamily: 'System', fontSize: 12, letterSpacing: 2 }}>ANNUAL GRAND PRIX</GlowText>
          <View style={{ flex: 1, height: 1, backgroundColor: '#EEE7D80E' }} />
          <Text style={{ fontFamily: 'System', fontSize: 9, color: '#EEE7D833', letterSpacing: 1 }}>3-ROUND QUALIFIER</Text>
        </View>
        <EventCard
          ev={events.annual}
          rankGated={!hasRank}
          mainDrawPlaysLeft={mainDrawPlaysLeft(events.annual)}
          qs={getEventQualifierState(profile, events.annual)}
          onPlayQualifier={(rIdx, rDef) => handlePlayQualifier(events.annual, rIdx, rDef)}
          onPlayMainDraw={() => handlePlayMainDraw(events.annual)}
        />

        <View style={[s.infoBox, { borderColor: '#EEE7D80C', backgroundColor: '#EEE7D806' }]}>
          <Text style={s.infoIcon}>⚡</Text>
          <Text style={[s.infoText, { color: '#EEE7D855' }]}>
            All participants earn <Text style={{ color: '#A6AEA7' }}>Credits</Text> (used in the Forge) plus bonus XP and coins in the <Text style={{ color: '#BB7865' }}>Main Draw</Text>. Qualifier rounds award <Text style={{ color: '#A6AEA7' }}>Qualifier Points (QP)</Text> — earn enough QP to advance to the next stage.
          </Text>
        </View>
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
        <GlowText intensity="medium" color={color} style={{ fontFamily: 'System', fontSize: 12, letterSpacing: 2, color }}>FEATURED THIS WEEK</GlowText>
        <View style={{ flex: 1, height: 1, backgroundColor: '#EEE7D80E' }} />
        <Text style={{ fontFamily: 'System', fontSize: 9, color: '#EEE7D833', letterSpacing: 1 }}>OPT-IN · CASUAL</Text>
      </View>

      {/* Card */}
      <View style={[s.card, { backgroundColor: color + '10', borderColor: color + '40' }]}>
        <LinearGradient colors={[color + '14', 'transparent']} style={StyleSheet.absoluteFill} />

        {/* Top row */}
        <View style={s.cardTop}>
          <View style={[s.typeBadge, { borderColor: color + '55', backgroundColor: color + '18' }]}>
            <Text style={{ fontSize: 11, marginRight: 3 }}>{mode.emoji}</Text>
            <Text style={[s.badgeText, { color }]}>FEATURED</Text>
          </View>
          <View style={[s.timePill, { borderColor: '#EEE7D814' }]}>
            <Feather name="clock" size={9} color={color + 'AA'} />
            <Text style={[s.timeText, { color: color + 'AA' }]}>{timeStr} left</Text>
          </View>
        </View>

        {/* Name row */}
        <View style={s.nameRow}>
          <Text style={s.eventEmoji}>{mode.emoji}</Text>
          <View style={{ flex: 1 }}>
            <GlowText intensity="medium" color={color} style={s.eventName}>{mode.name}</GlowText>
            <Text style={[s.eventDesc, { color: '#EEE7D866' }]}>{mode.descriptor}</Text>
          </View>
        </View>

        {/* Rule summary */}
        <View style={{ gap: 5 }}>
          {mode.ruleSummary.map((rule, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color + '99' }} />
              <Text style={{ fontFamily: 'System', fontSize: 12, color: '#EEE7D8AA', lineHeight: 18 }}>{rule}</Text>
            </View>
          ))}
        </View>

        {/* Override pills */}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {mode.overrides.coinMultiplier != null && (
            <View style={[s.rewardPill]}>
              <Text style={[s.rewardValue, { color: '#D0AF66' }]}>{mode.overrides.coinMultiplier}× 🪙</Text>
              <Text style={s.rewardLabel}>COINS</Text>
            </View>
          )}
          {mode.overrides.xpMultiplier != null && (
            <View style={[s.rewardPill]}>
              <Text style={[s.rewardValue, { color: '#98A581' }]}>{mode.overrides.xpMultiplier}× ⚡</Text>
              <Text style={s.rewardLabel}>XP</Text>
            </View>
          )}
          {mode.overrides.ballSpeedFactor != null && (
            <View style={[s.rewardPill]}>
              <Text style={[s.rewardValue, { color: '#BB7865' }]}>{mode.overrides.ballSpeedFactor}× 🎯</Text>
              <Text style={s.rewardLabel}>BALL SPEED</Text>
            </View>
          )}
        </View>

        {/* Play button */}
        <Pressable
          onPress={() => onPlay(mode)}
          style={({ pressed }) => [
            s.playBtn,
            { backgroundColor: color + '20', borderColor: color + '66',
              opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <Text style={[s.playBtnText, { color }]}>▶  PLAY {mode.name.toUpperCase()}</Text>
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
      <View style={[s.card, { backgroundColor: '#EEE7D804', borderColor: '#EEE7D80C' }]}>
        <View style={s.cardTop}>
          <View style={[s.lockBadge, { borderColor: '#EEE7D815' }]}>
            <Feather name="lock" size={10} color="#EEE7D833" />
            <Text style={[s.badgeText, { color: '#EEE7D833' }]}>LOCKED</Text>
          </View>
          <View style={[s.timePill, { borderColor: '#EEE7D80C' }]}>
            <Feather name="clock" size={9} color="#EEE7D822" />
            <Text style={[s.timeText, { color: '#EEE7D822' }]}>Opens {ev.opensOnLabel}</Text>
          </View>
        </View>
        <View style={s.nameRow}>
          <Text style={[s.eventEmoji, { opacity: 0.25 }]}>{ev.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.eventName, { color: ev.color + '44' }]}>{ev.name}</Text>
            <Text style={[s.eventDesc, { color: '#EEE7D822' }]}>Opens {ev.opensOnLabel}. Check back then!</Text>
          </View>
        </View>
        <View style={[s.countdownBox, { borderColor: '#EEE7D80C', backgroundColor: '#EEE7D806' }]}>
          <Feather name="lock" size={14} color="#EEE7D833" />
          <View>
            <Text style={[s.countdownLabel, { color: '#EEE7D844' }]}>OPENS IN</Text>
            <Text style={[s.countdownTime, { color: '#EEE7D877' }]}>{fmt(ev.endsIn)}</Text>
          </View>
          <Text style={[s.countdownDate, { color: '#EEE7D833' }]}>{ev.opensOnLabel}</Text>
        </View>
        <View style={[s.playBtn, { backgroundColor: '#EEE7D804', borderColor: '#EEE7D80C', opacity: 0.5 }]}>
          <Text style={[s.playBtnText, { color: '#EEE7D822' }]}>🔒  OPENS {ev.opensOnLabel.toUpperCase()}</Text>
        </View>
      </View>
    );
  }

  // ── WEEKLY (no qualifier) ─────────────────────────────────────────────────────
  if (ev.rounds === null) {
    const noPlays  = mainDrawPlaysLeft === 0;
    const disabled = noPlays || rankGated;
    return (
      <GlowBorder color={ev.color ?? '#BB7865'} borderRadius={14} spread={8}>
        <View style={[s.card, { backgroundColor: ev.color + (disabled ? '06' : '10'), borderColor: ev.color + (disabled ? '18' : '40') }]}>
          <LinearGradient colors={[ev.color + (disabled ? '06' : '14'), 'transparent']} style={StyleSheet.absoluteFill} />
          <View style={s.cardTop}>
            <TypeBadge label="WEEKLY" color={ev.color} dim={disabled} />
            <View style={s.cardTopRight}>
              <ModePill mode={modeName[ev.mode] ?? ev.mode} dim={disabled} />
              <TimePill ms={ev.endsIn} label="left" dim={disabled} />
            </View>
          </View>
          <NameRow ev={ev} dim={disabled} />
          <PlaysRow plays={mainDrawPlaysLeft} max={ev.maxPlays} color={ev.color} dim={disabled} />
          <View style={[s.divider, { backgroundColor: '#EEE7D80C' }]} />
          <RewardRow ev={ev} dim={disabled} />
          <PlayButton
            label={rankGated ? '🔒  REQUIRES GENERAL 1' : noPlays ? 'NO PLAYS REMAINING' : `▶  PLAY ${ev.name.toUpperCase()}`}
            color={ev.color}
            disabled={disabled}
            onPress={onPlayMainDraw}
          />
        </View>
      </GlowBorder>
    );
  }

  // ── QUALIFIER EVENTS (monthly / annual) ───────────────────────────────────────
  if (!qs) return null; // shouldn't happen

  // ELIMINATED — used all qualifier plays without reaching threshold
  if (qs.isEliminated) {
    return (
      <View style={[s.card, { backgroundColor: '#BB786506', borderColor: '#BB786522' }]}>
        <View style={s.cardTop}>
          <View style={[s.lockBadge, { borderColor: '#BB786533', backgroundColor: '#BB78650A' }]}>
            <Text style={[s.badgeText, { color: '#BB7865' }]}>❌  ELIMINATED</Text>
          </View>
          <TimePill ms={ev.endsIn} label="resets" dim />
        </View>
        <NameRow ev={ev} dim />
        <View style={[s.countdownBox, { borderColor: '#BB786522', backgroundColor: '#BB78650A' }]}>
          <Text style={{ fontSize: 20 }}>❌</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.countdownLabel, { color: '#BB7865BB' }]}>
              {qs.roundDef.name.toUpperCase()} — ELIMINATED
            </Text>
            <Text style={[s.countdownTime, { color: '#BB786599', fontSize: 13, fontFamily: 'System' }]}>
              You earned <Text style={{ color: '#BB7865', fontFamily: 'System' }}>{qs.qp} QP</Text> but needed <Text style={{ fontFamily: 'System' }}>{qs.roundDef.threshold} QP</Text> to advance.
              {'\n'}Try again next period when the event resets.
            </Text>
          </View>
        </View>
        <View style={[s.playBtn, { backgroundColor: '#EEE7D804', borderColor: '#EEE7D80C', opacity: 0.4 }]}>
          <Text style={[s.playBtnText, { color: '#EEE7D822' }]}>❌  ELIMINATED THIS PERIOD</Text>
        </View>
      </View>
    );
  }

  // MAIN DRAW — player has qualified
  if (qs.roundDef.isMainDraw) {
    const noPlays  = mainDrawPlaysLeft === 0;
    const disabled = noPlays || rankGated;
    const roundLabel = ev.rounds.length > 2 ? 'GRAND FINAL' : 'MAIN DRAW';
    return (
      <GlowBorder color={ev.color ?? '#BB7865'} borderRadius={14} spread={8}>
        <View style={[s.card, { backgroundColor: ev.color + (disabled ? '08' : '14'), borderColor: ev.color + (disabled ? '22' : '55') }]}>
          <LinearGradient colors={['#D0AF6618', 'transparent']} style={StyleSheet.absoluteFill} />
          <View style={s.cardTop}>
            <View style={[s.qualifiedBadge, { borderColor: '#D0AF6655', backgroundColor: '#D0AF6612' }]}>
              <Text style={[s.badgeText, { color: '#D0AF66' }]}>✅  {roundLabel} — QUALIFIED</Text>
            </View>
            <View style={s.cardTopRight}>
              <ModePill mode={modeName[ev.mode] ?? ev.mode} dim={disabled} />
              <TimePill ms={ev.endsIn} label="left" dim={disabled} />
            </View>
          </View>
          <NameRow ev={ev} dim={disabled} />
          {/* Main draw plays */}
          <PlaysRow plays={mainDrawPlaysLeft} max={ev.maxPlays} color={ev.color} dim={disabled} />
          <View style={[s.divider, { backgroundColor: '#EEE7D80C' }]} />
          <RewardRow ev={ev} dim={disabled} />
          <PlayButton
            label={rankGated ? '🔒  REQUIRES GENERAL 1' : noPlays ? 'NO PLAYS REMAINING' : `▶  PLAY ${roundLabel}`}
            color={disabled ? ev.color : '#D0AF66'}
            disabled={disabled}
            onPress={onPlayMainDraw}
          />
        </View>
      </GlowBorder>
    );
  }

  // QUALIFIER ROUND — playing to earn QP
  const disabled  = qs.playsLeft === 0 || rankGated;
  const qpFraction = Math.min(qs.qp / qs.roundDef.threshold, 1);
  const totalRounds = ev.rounds.length;
  const roundNum    = qs.roundIdx + 1;

  return (
    <GlowBorder color={ev.color ?? '#BB7865'} borderRadius={14} spread={8}>
      <View style={[s.card, { backgroundColor: '#A6AEA708', borderColor: '#A6AEA722' }]}>
        <LinearGradient colors={['#A6AEA70C', 'transparent']} style={StyleSheet.absoluteFill} />

        {/* Top row: round badge + mode + time */}
        <View style={s.cardTop}>
          <View style={[s.roundBadge, { borderColor: '#A6AEA744', backgroundColor: '#A6AEA712' }]}>
            <Text style={s.roundBadgeEmoji}>{qs.roundDef.badge}</Text>
            <Text style={[s.badgeText, { color: '#A6AEA7' }]}>{qs.roundDef.name.toUpperCase()}</Text>
            <Text style={[s.roundCounter, { color: '#A6AEA788' }]}>  {roundNum}/{totalRounds}</Text>
          </View>
          <View style={s.cardTopRight}>
            <ModePill mode={modeName[ev.mode] ?? ev.mode} dim={disabled} />
            <TimePill ms={ev.endsIn} label="left" dim={disabled} />
          </View>
        </View>

        <NameRow ev={ev} dim={disabled} />

        {/* QP Progress bar */}
        <View style={s.qpSection}>
          <View style={s.qpHeader}>
            <Text style={[s.qpLabel, { color: '#A6AEA788' }]}>QUALIFIER POINTS</Text>
            <Text style={[s.qpValue, { color: '#A6AEA7' }]}>
              {qs.qp} / {qs.roundDef.threshold} QP
            </Text>
          </View>
          <View style={[s.qpTrack, { backgroundColor: '#A6AEA714' }]}>
            <View style={[s.qpFill, { width: `${qpFraction * 100}%` as never, backgroundColor: '#A6AEA7' }]} />
          </View>
          {qs.qp >= qs.roundDef.threshold - (qs.roundDef.qpPerPlace[0]) && qs.qp < qs.roundDef.threshold && (
            <Text style={[s.qpNearNote, { color: '#A6AEA788' }]}>
              One good finish can qualify you!
            </Text>
          )}
        </View>

        {/* Plays remaining */}
        <PlaysRow plays={qs.playsLeft} max={qs.roundDef.maxPlays} color="#A6AEA7" dim={disabled} />

        {/* QP per placement table */}
        <View style={[s.qpTable, { borderColor: '#EEE7D80C', backgroundColor: '#EEE7D804' }]}>
          <Text style={[s.qpTableTitle, { color: '#EEE7D833' }]}>QP PER PLACEMENT</Text>
          <View style={s.qpTableRows}>
            {qs.roundDef.qpPerPlace.map((qp, i) => (
              <View key={i} style={s.qpTableRow}>
                <Text style={s.qpTableIcon}>{PLACEMENT_ICONS[i]}</Text>
                <Text style={[s.qpTablePlace, { color: i === 0 ? '#D0AF66' : i === 1 ? '#B9BDAF' : i === 2 ? '#BB7865' : '#EEE7D855' }]}>
                  {['1st', '2nd', '3rd', '4th'][i]}
                </Text>
                <Text style={[s.qpTablePoints, { color: '#A6AEA7' }]}>+{qp} QP</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Advance info */}
        <View style={[s.advanceNote, { borderColor: '#D0AF6622', backgroundColor: '#D0AF6608' }]}>
          <Text style={[s.advanceText, { color: '#D0AF6688' }]}>
            🏆 Reach <Text style={{ color: '#D0AF66', fontFamily: 'System' }}>{qs.roundDef.threshold} QP</Text> to advance to <Text style={{ color: '#D0AF66', fontFamily: 'System' }}>{ev.rounds[qs.roundIdx + 1]?.name ?? 'the Final'}</Text>
          </Text>
        </View>

        <PlayButton
          label={
            rankGated    ? '🔒  REQUIRES GENERAL 1' :
            qs.playsLeft === 0 ? 'NO PLAYS REMAINING' :
            `▶  PLAY ${qs.roundDef.name.toUpperCase()}`
          }
          color="#A6AEA7"
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
      <Text style={[s.badgeText, { color: dim ? color + '44' : color }]}>{label}</Text>
    </View>
  );
}

function ModePill({ mode, dim }: { mode: string; dim: boolean }) {
  return (
    <View style={[s.modePill, { borderColor: '#EEE7D814' }]}>
      <Text style={[s.modeText, { color: dim ? '#EEE7D822' : '#EEE7D866' }]}>{mode}</Text>
    </View>
  );
}

function TimePill({ ms, label, dim }: { ms: number; label: string; dim: boolean }) {
  return (
    <View style={[s.timePill, { borderColor: '#EEE7D814' }]}>
      <Feather name="clock" size={9} color={dim ? '#EEE7D822' : '#EEE7D855'} />
      <Text style={[s.timeText, { color: dim ? '#EEE7D822' : '#EEE7D866' }]}>{fmt(ms)} {label}</Text>
    </View>
  );
}

function NameRow({ ev, dim }: { ev: EventDefinition; dim: boolean }) {
  return (
    <View style={s.nameRow}>
      <Text style={[s.eventEmoji, { opacity: dim ? 0.25 : 1 }]}>{ev.emoji}</Text>
      <View style={{ flex: 1 }}>
        <GlowText intensity="medium" color={dim ? ev.color + '44' : ev.color} style={s.eventName}>{ev.name}</GlowText>
        <Text style={[s.eventDesc, { color: dim ? '#EEE7D818' : '#EEE7D866' }]}>{ev.description}</Text>
      </View>
    </View>
  );
}

function PlaysRow({ plays, max, color, dim }: { plays: number; max: number; color: string; dim: boolean }) {
  return (
    <View style={s.playsRow}>
      <Text style={[s.playsLabel, { color: '#EEE7D833' }]}>PLAYS</Text>
      <View style={s.dots}>
        {Array.from({ length: max }).map((_, i) => (
          <View key={i} style={[s.dot, { backgroundColor: i < plays ? color : '#EEE7D814' }]} />
        ))}
      </View>
      <Text style={[s.playsRemaining, { color: plays === 0 ? '#EEE7D822' : color }]}>
        {plays === 0 ? 'DONE' : `${plays}/${max}`}
      </Text>
    </View>
  );
}

function RewardRow({ ev, dim }: { ev: EventDefinition; dim: boolean }) {
  return (
    <>
      <View style={s.rewardRow}>
        <RewardPill label="WIN XP"    value={`+${ev.winRewards.xp}`}    color="#D0AF66"  dim={dim} />
        <RewardPill label="WIN COINS" value={`+${ev.winRewards.coins}`} color="#BB7865"  dim={dim} />
        <RewardPill label="CREDITS"   value={`+${ev.creditsOnWin}`}     color="#A6AEA7"  dim={dim} prefix="⚡" />
      </View>
      <Text style={[s.lossNote, { color: dim ? '#EEE7D814' : '#EEE7D833' }]}>
        Loss: +{ev.loseRewards.xp} XP · +{ev.loseRewards.coins} coins · ⚡+{ev.creditsOnLose}
      </Text>
    </>
  );
}

function RewardPill({ label, value, color, dim, prefix = '' }: {
  label: string; value: string; color: string; dim: boolean; prefix?: string;
}) {
  return (
    <View style={s.rewardPill}>
      <Text style={[s.rewardValue, { color: dim ? '#EEE7D818' : color }]}>{prefix}{value}</Text>
      <Text style={[s.rewardLabel, { color: dim ? '#EEE7D80E' : '#EEE7D844' }]}>{label}</Text>
    </View>
  );
}

function PlayButton({ label, color, disabled, onPress }: {
  label: string; color: string; disabled: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        s.playBtn,
        {
          backgroundColor: disabled ? '#EEE7D806' : color + '20',
          borderColor:     disabled ? '#EEE7D810' : color + '66',
          opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
      ]}
    >
      <Text style={[s.playBtnText, { color: disabled ? '#EEE7D822' : color }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:            { flex: 1 },
  header:          { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  title:           { fontFamily: 'System', fontSize: 24, letterSpacing: 2 },
  subtitle:        { fontFamily: 'System', fontSize: 11, marginTop: 2, letterSpacing: 0.4 },
  datePill:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 2, paddingHorizontal: 10, paddingVertical: 5 },
  dateText:        { fontFamily: 'System', fontSize: 11 },
  scroll:          { paddingHorizontal: 16, paddingTop: 4, gap: 14 },

  rankGate:        { borderRadius: 2, borderWidth: 1, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start', overflow: 'hidden' },
  rankGateIcon:    { fontSize: 26, marginTop: 2 },
  rankGateTitle:   { fontFamily: 'System', fontSize: 13, letterSpacing: 1.2, marginBottom: 6 },
  rankGateBody:    { fontFamily: 'System', fontSize: 13, lineHeight: 19 },
  rankGateReq:     { fontFamily: 'System', fontSize: 11, marginTop: 8, lineHeight: 16 },

  card:            { borderRadius: 2, borderWidth: 1, padding: 16, overflow: 'hidden', gap: 12 },
  cardTop:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTopRight:    { flexDirection: 'row', gap: 6, alignItems: 'center' },

  typeBadge:       { borderWidth: 1, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3 },
  lockBadge:       { borderWidth: 1, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 },
  qualifiedBadge:  { borderWidth: 1, borderRadius: 2, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  roundBadge:      { borderWidth: 1, borderRadius: 2, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center' },
  roundBadgeEmoji: { fontSize: 12, marginRight: 4 },
  roundCounter:    { fontFamily: 'System', fontSize: 10 },
  badgeText:       { fontFamily: 'System', fontSize: 10, letterSpacing: 1 },

  modePill:        { borderWidth: 1, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3 },
  modeText:        { fontFamily: 'System', fontSize: 10, letterSpacing: 0.4 },
  timePill:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3 },
  timeText:        { fontFamily: 'System', fontSize: 10 },

  nameRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  eventEmoji:      { fontSize: 28, lineHeight: 34 },
  eventName:       { fontFamily: 'System', fontSize: 17, letterSpacing: 0.5 },
  eventDesc:       { fontFamily: 'System', fontSize: 12, marginTop: 3, lineHeight: 17 },

  countdownBox:    { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 2, paddingHorizontal: 14, paddingVertical: 12 },
  countdownLabel:  { fontFamily: 'System', fontSize: 9, letterSpacing: 1.2 },
  countdownTime:   { fontFamily: 'System', fontSize: 18, marginTop: 1 },
  countdownDate:   { fontFamily: 'System', fontSize: 12, marginLeft: 'auto' as never },

  playsRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playsLabel:      { fontFamily: 'System', fontSize: 10, letterSpacing: 1, width: 38 },
  dots:            { flexDirection: 'row', gap: 5, flex: 1 },
  dot:             { width: 10, height: 10, borderRadius: 2 },
  playsRemaining:  { fontFamily: 'System', fontSize: 11 },

  divider:         { height: 1, borderRadius: 2 },

  rewardRow:       { flexDirection: 'row', gap: 8 },
  rewardPill:      { flex: 1, alignItems: 'center', gap: 2 },
  rewardValue:     { fontFamily: 'System', fontSize: 15 },
  rewardLabel:     { fontFamily: 'System', fontSize: 9, letterSpacing: 0.8 },
  lossNote:        { fontFamily: 'System', fontSize: 10, textAlign: 'center' },

  // QP section
  qpSection:       { gap: 6 },
  qpHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qpLabel:         { fontFamily: 'System', fontSize: 10, letterSpacing: 1 },
  qpValue:         { fontFamily: 'System', fontSize: 13 },
  qpTrack:         { height: 8, borderRadius: 2, overflow: 'hidden' },
  qpFill:          { height: '100%', borderRadius: 2 },
  qpNearNote:      { fontFamily: 'System', fontSize: 11, textAlign: 'center' },

  // QP placement table
  qpTable:         { borderRadius: 2, borderWidth: 1, padding: 12, gap: 6 },
  qpTableTitle:    { fontFamily: 'System', fontSize: 9, letterSpacing: 1.2, marginBottom: 2 },
  qpTableRows:     { gap: 6 },
  qpTableRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qpTableIcon:     { fontSize: 14, width: 22 },
  qpTablePlace:    { fontFamily: 'System', fontSize: 13, flex: 1 },
  qpTablePoints:   { fontFamily: 'System', fontSize: 14 },

  advanceNote:     { borderRadius: 2, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  advanceText:     { fontFamily: 'System', fontSize: 12, lineHeight: 17 },

  playBtn:         { borderRadius: 2, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
  playBtnText:     { fontFamily: 'System', fontSize: 13, letterSpacing: 1.5 },

  infoBox:         { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 2, padding: 14, alignItems: 'flex-start', marginTop: 2 },
  infoIcon:        { fontSize: 14 },
  infoText:        { fontFamily: 'System', fontSize: 12, flex: 1, lineHeight: 18 },
});
