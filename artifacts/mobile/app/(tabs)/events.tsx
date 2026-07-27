import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  EVENT_MIN_RANK_INDEX,
  getCurrentEvents, getEventQualifierState, getRankIndex, RANKS, usePlayer,
  type EventDefinition, type QualifierRoundDef,
} from '@/context/PlayerContext';
import { useColors } from '@/hooks/useColors';
import {
  setActiveEvent, setGameConfig, setQualifierContext,
  type ActiveEventBonus, type GameVariant,
} from '@/store/gameSession';
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
      playerColor:     profile.avatarFrameColor ?? '#FFD700',
      playerGlowColor: (profile.avatarFrameColor ?? '#FFD700') + '55',
      matchType:       'ranked',
      variant:         ev.mode as GameVariant,
      playerRelicId:   profile.currentRelic ?? 'none',
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
      playerColor:     profile.avatarFrameColor ?? '#FFD700',
      playerGlowColor: (profile.avatarFrameColor ?? '#FFD700') + '55',
      matchType:       'ranked',
      variant:         ev.mode as GameVariant,
      playerRelicId:   profile.currentRelic ?? 'none',
    });
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/game');
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <FloatingOrbs opacity={0.8} />
      <LinearGradient colors={['#070B1E', '#04060E', '#06091A']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['#C8820A22', '#C8820A0E', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', '#05081888']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 280 }}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 6 }]}>
        <View>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 2.5, color: '#FFFFFF44', marginBottom: 2 }}>GOLDRUSH ARENA</Text>
          <GlowText intensity="medium" color='#C8820A' style={s.title}>EVENTS</GlowText>
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
          <View style={[s.rankGate, { borderColor: '#E04030AA', backgroundColor: '#E0403010' }]}>
            <LinearGradient colors={['#E0403020', 'transparent']} style={StyleSheet.absoluteFill} />
            <Text style={s.rankGateIcon}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.rankGateTitle, { color: '#E04030' }]}>EVENTS LOCKED</Text>
              <Text style={[s.rankGateBody, { color: '#FFFFFF88' }]}>
                Events require{' '}
                <Text style={{ color: GENERAL1?.color ?? '#E04030', fontFamily: 'Inter_700Bold' }}>General 1</Text>
                {' '}rank. Earn matches, climb ranks, and return to compete in the qualifier ladder.
              </Text>
              <Text style={[s.rankGateReq, { color: '#FFFFFF44' }]}>
                Your rank: <Text style={{ color: RANKS.find(r => r.name === profile.rank)?.color ?? '#FFF' }}>{profile.rank}</Text>
                {'  ·  '}
                <Text style={{ color: GENERAL1?.color ?? '#E04030' }}>General 1</Text>{' '}requires {(340_000 - Math.min(profile.xp, 340_000)).toLocaleString()} more XP
              </Text>
            </View>
          </View>
        )}

        {/* Weekly — direct entry, no qualifier */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <View style={{ width: 3, height: 16, backgroundColor: '#00FF88', borderRadius: 2 }} />
          <GlowText intensity="medium" color='#C8820A' style={{ fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2 }}>WEEKLY EVENT</GlowText>
          <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#FFFFFF33', letterSpacing: 1 }}>DIRECT ENTRY</Text>
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
          <View style={{ width: 3, height: 16, backgroundColor: '#C8820A', borderRadius: 2 }} />
          <GlowText intensity="medium" color='#C8820A' style={{ fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2 }}>MONTHLY CUP</GlowText>
          <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#FFFFFF33', letterSpacing: 1 }}>2-ROUND QUALIFIER</Text>
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
          <View style={{ width: 3, height: 16, backgroundColor: '#AA44FF', borderRadius: 2 }} />
          <GlowText intensity="medium" color='#C8820A' style={{ fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2 }}>ANNUAL GRAND PRIX</GlowText>
          <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#FFFFFF33', letterSpacing: 1 }}>3-ROUND QUALIFIER</Text>
        </View>
        <EventCard
          ev={events.annual}
          rankGated={!hasRank}
          mainDrawPlaysLeft={mainDrawPlaysLeft(events.annual)}
          qs={getEventQualifierState(profile, events.annual)}
          onPlayQualifier={(rIdx, rDef) => handlePlayQualifier(events.annual, rIdx, rDef)}
          onPlayMainDraw={() => handlePlayMainDraw(events.annual)}
        />

        <View style={[s.infoBox, { borderColor: '#FFFFFF0C', backgroundColor: '#FFFFFF06' }]}>
          <Text style={s.infoIcon}>⚡</Text>
          <Text style={[s.infoText, { color: '#FFFFFF55' }]}>
            All participants earn <Text style={{ color: '#B9A0E0' }}>Credits</Text> (used in the Forge) plus bonus XP and coins in the <Text style={{ color: '#C8820A' }}>Main Draw</Text>. Qualifier rounds award <Text style={{ color: '#00BFFF' }}>Qualifier Points (QP)</Text> — earn enough QP to advance to the next stage.
          </Text>
        </View>
      </ScrollView>
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
      <View style={[s.card, { backgroundColor: '#FFFFFF04', borderColor: '#FFFFFF0C' }]}>
        <View style={s.cardTop}>
          <View style={[s.lockBadge, { borderColor: '#FFFFFF15' }]}>
            <Feather name="lock" size={10} color="#FFFFFF33" />
            <Text style={[s.badgeText, { color: '#FFFFFF33' }]}>LOCKED</Text>
          </View>
          <View style={[s.timePill, { borderColor: '#FFFFFF0C' }]}>
            <Feather name="clock" size={9} color="#FFFFFF22" />
            <Text style={[s.timeText, { color: '#FFFFFF22' }]}>Opens {ev.opensOnLabel}</Text>
          </View>
        </View>
        <View style={s.nameRow}>
          <Text style={[s.eventEmoji, { opacity: 0.25 }]}>{ev.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.eventName, { color: ev.color + '44' }]}>{ev.name}</Text>
            <Text style={[s.eventDesc, { color: '#FFFFFF22' }]}>Opens {ev.opensOnLabel}. Check back then!</Text>
          </View>
        </View>
        <View style={[s.countdownBox, { borderColor: '#FFFFFF0C', backgroundColor: '#FFFFFF06' }]}>
          <Feather name="lock" size={14} color="#FFFFFF33" />
          <View>
            <Text style={[s.countdownLabel, { color: '#FFFFFF44' }]}>OPENS IN</Text>
            <Text style={[s.countdownTime, { color: '#FFFFFF77' }]}>{fmt(ev.endsIn)}</Text>
          </View>
          <Text style={[s.countdownDate, { color: '#FFFFFF33' }]}>{ev.opensOnLabel}</Text>
        </View>
        <View style={[s.playBtn, { backgroundColor: '#FFFFFF04', borderColor: '#FFFFFF0C', opacity: 0.5 }]}>
          <Text style={[s.playBtnText, { color: '#FFFFFF22' }]}>🔒  OPENS {ev.opensOnLabel.toUpperCase()}</Text>
        </View>
      </View>
    );
  }

  // ── WEEKLY (no qualifier) ─────────────────────────────────────────────────────
  if (ev.rounds === null) {
    const noPlays  = mainDrawPlaysLeft === 0;
    const disabled = noPlays || rankGated;
    return (
      <GlowBorder color={ev.color ?? '#FF4444'} borderRadius={14} spread={8}>
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
          <View style={[s.divider, { backgroundColor: '#FFFFFF0C' }]} />
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
      <View style={[s.card, { backgroundColor: '#FF475706', borderColor: '#FF475722' }]}>
        <View style={s.cardTop}>
          <View style={[s.lockBadge, { borderColor: '#FF475733', backgroundColor: '#FF47570A' }]}>
            <Text style={[s.badgeText, { color: '#FF4757' }]}>❌  ELIMINATED</Text>
          </View>
          <TimePill ms={ev.endsIn} label="resets" dim />
        </View>
        <NameRow ev={ev} dim />
        <View style={[s.countdownBox, { borderColor: '#FF475722', backgroundColor: '#FF47570A' }]}>
          <Text style={{ fontSize: 20 }}>❌</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.countdownLabel, { color: '#FF4757BB' }]}>
              {qs.roundDef.name.toUpperCase()} — ELIMINATED
            </Text>
            <Text style={[s.countdownTime, { color: '#FF475799', fontSize: 13, fontFamily: 'Inter_400Regular' }]}>
              You earned <Text style={{ color: '#FF4757', fontFamily: 'Inter_700Bold' }}>{qs.qp} QP</Text> but needed <Text style={{ fontFamily: 'Inter_700Bold' }}>{qs.roundDef.threshold} QP</Text> to advance.
              {'\n'}Try again next period when the event resets.
            </Text>
          </View>
        </View>
        <View style={[s.playBtn, { backgroundColor: '#FFFFFF04', borderColor: '#FFFFFF0C', opacity: 0.4 }]}>
          <Text style={[s.playBtnText, { color: '#FFFFFF22' }]}>❌  ELIMINATED THIS PERIOD</Text>
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
      <GlowBorder color={ev.color ?? '#FF4444'} borderRadius={14} spread={8}>
        <View style={[s.card, { backgroundColor: ev.color + (disabled ? '08' : '14'), borderColor: ev.color + (disabled ? '22' : '55') }]}>
          <LinearGradient colors={['#FFD70018', 'transparent']} style={StyleSheet.absoluteFill} />
          <View style={s.cardTop}>
            <View style={[s.qualifiedBadge, { borderColor: '#FFD70055', backgroundColor: '#FFD70012' }]}>
              <Text style={[s.badgeText, { color: '#FFD700' }]}>✅  {roundLabel} — QUALIFIED</Text>
            </View>
            <View style={s.cardTopRight}>
              <ModePill mode={modeName[ev.mode] ?? ev.mode} dim={disabled} />
              <TimePill ms={ev.endsIn} label="left" dim={disabled} />
            </View>
          </View>
          <NameRow ev={ev} dim={disabled} />
          {/* Main draw plays */}
          <PlaysRow plays={mainDrawPlaysLeft} max={ev.maxPlays} color={ev.color} dim={disabled} />
          <View style={[s.divider, { backgroundColor: '#FFFFFF0C' }]} />
          <RewardRow ev={ev} dim={disabled} />
          <PlayButton
            label={rankGated ? '🔒  REQUIRES GENERAL 1' : noPlays ? 'NO PLAYS REMAINING' : `▶  PLAY ${roundLabel}`}
            color={disabled ? ev.color : '#FFD700'}
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
    <GlowBorder color={ev.color ?? '#FF4444'} borderRadius={14} spread={8}>
      <View style={[s.card, { backgroundColor: '#00BFFF08', borderColor: '#00BFFF22' }]}>
        <LinearGradient colors={['#00BFFF0C', 'transparent']} style={StyleSheet.absoluteFill} />

        {/* Top row: round badge + mode + time */}
        <View style={s.cardTop}>
          <View style={[s.roundBadge, { borderColor: '#00BFFF44', backgroundColor: '#00BFFF12' }]}>
            <Text style={s.roundBadgeEmoji}>{qs.roundDef.badge}</Text>
            <Text style={[s.badgeText, { color: '#00BFFF' }]}>{qs.roundDef.name.toUpperCase()}</Text>
            <Text style={[s.roundCounter, { color: '#00BFFF88' }]}>  {roundNum}/{totalRounds}</Text>
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
            <Text style={[s.qpLabel, { color: '#00BFFF88' }]}>QUALIFIER POINTS</Text>
            <Text style={[s.qpValue, { color: '#00BFFF' }]}>
              {qs.qp} / {qs.roundDef.threshold} QP
            </Text>
          </View>
          <View style={[s.qpTrack, { backgroundColor: '#00BFFF14' }]}>
            <View style={[s.qpFill, { width: `${qpFraction * 100}%` as never, backgroundColor: '#00BFFF' }]} />
          </View>
          {qs.qp >= qs.roundDef.threshold - (qs.roundDef.qpPerPlace[0]) && qs.qp < qs.roundDef.threshold && (
            <Text style={[s.qpNearNote, { color: '#00BFFF88' }]}>
              One good finish can qualify you!
            </Text>
          )}
        </View>

        {/* Plays remaining */}
        <PlaysRow plays={qs.playsLeft} max={qs.roundDef.maxPlays} color="#00BFFF" dim={disabled} />

        {/* QP per placement table */}
        <View style={[s.qpTable, { borderColor: '#FFFFFF0C', backgroundColor: '#FFFFFF04' }]}>
          <Text style={[s.qpTableTitle, { color: '#FFFFFF33' }]}>QP PER PLACEMENT</Text>
          <View style={s.qpTableRows}>
            {qs.roundDef.qpPerPlace.map((qp, i) => (
              <View key={i} style={s.qpTableRow}>
                <Text style={s.qpTableIcon}>{PLACEMENT_ICONS[i]}</Text>
                <Text style={[s.qpTablePlace, { color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#FFFFFF55' }]}>
                  {['1st', '2nd', '3rd', '4th'][i]}
                </Text>
                <Text style={[s.qpTablePoints, { color: '#00BFFF' }]}>+{qp} QP</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Advance info */}
        <View style={[s.advanceNote, { borderColor: '#FFD70022', backgroundColor: '#FFD70008' }]}>
          <Text style={[s.advanceText, { color: '#FFD70088' }]}>
            🏆 Reach <Text style={{ color: '#FFD700', fontFamily: 'Inter_700Bold' }}>{qs.roundDef.threshold} QP</Text> to advance to <Text style={{ color: '#FFD700', fontFamily: 'Inter_700Bold' }}>{ev.rounds[qs.roundIdx + 1]?.name ?? 'the Final'}</Text>
          </Text>
        </View>

        <PlayButton
          label={
            rankGated    ? '🔒  REQUIRES GENERAL 1' :
            qs.playsLeft === 0 ? 'NO PLAYS REMAINING' :
            `▶  PLAY ${qs.roundDef.name.toUpperCase()}`
          }
          color="#00BFFF"
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
    <View style={[s.modePill, { borderColor: '#FFFFFF14' }]}>
      <Text style={[s.modeText, { color: dim ? '#FFFFFF22' : '#FFFFFF66' }]}>{mode}</Text>
    </View>
  );
}

function TimePill({ ms, label, dim }: { ms: number; label: string; dim: boolean }) {
  return (
    <View style={[s.timePill, { borderColor: '#FFFFFF14' }]}>
      <Feather name="clock" size={9} color={dim ? '#FFFFFF22' : '#FFFFFF55'} />
      <Text style={[s.timeText, { color: dim ? '#FFFFFF22' : '#FFFFFF66' }]}>{fmt(ms)} {label}</Text>
    </View>
  );
}

function NameRow({ ev, dim }: { ev: EventDefinition; dim: boolean }) {
  return (
    <View style={s.nameRow}>
      <Text style={[s.eventEmoji, { opacity: dim ? 0.25 : 1 }]}>{ev.emoji}</Text>
      <View style={{ flex: 1 }}>
        <GlowText intensity="medium" color={dim ? ev.color + '44' : ev.color} style={s.eventName}>{ev.name}</GlowText>
        <Text style={[s.eventDesc, { color: dim ? '#FFFFFF18' : '#FFFFFF66' }]}>{ev.description}</Text>
      </View>
    </View>
  );
}

function PlaysRow({ plays, max, color, dim }: { plays: number; max: number; color: string; dim: boolean }) {
  return (
    <View style={s.playsRow}>
      <Text style={[s.playsLabel, { color: '#FFFFFF33' }]}>PLAYS</Text>
      <View style={s.dots}>
        {Array.from({ length: max }).map((_, i) => (
          <View key={i} style={[s.dot, { backgroundColor: i < plays ? color : '#FFFFFF14' }]} />
        ))}
      </View>
      <Text style={[s.playsRemaining, { color: plays === 0 ? '#FFFFFF22' : color }]}>
        {plays === 0 ? 'DONE' : `${plays}/${max}`}
      </Text>
    </View>
  );
}

function RewardRow({ ev, dim }: { ev: EventDefinition; dim: boolean }) {
  return (
    <>
      <View style={s.rewardRow}>
        <RewardPill label="WIN XP"    value={`+${ev.winRewards.xp}`}    color="#FFD700"  dim={dim} />
        <RewardPill label="WIN COINS" value={`+${ev.winRewards.coins}`} color="#C8820A"  dim={dim} />
        <RewardPill label="CREDITS"   value={`+${ev.creditsOnWin}`}     color="#B9A0E0"  dim={dim} prefix="⚡" />
      </View>
      <Text style={[s.lossNote, { color: dim ? '#FFFFFF14' : '#FFFFFF33' }]}>
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
      <Text style={[s.rewardValue, { color: dim ? '#FFFFFF18' : color }]}>{prefix}{value}</Text>
      <Text style={[s.rewardLabel, { color: dim ? '#FFFFFF0E' : '#FFFFFF44' }]}>{label}</Text>
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
          backgroundColor: disabled ? '#FFFFFF06' : color + '20',
          borderColor:     disabled ? '#FFFFFF10' : color + '66',
          opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
      ]}
    >
      <Text style={[s.playBtnText, { color: disabled ? '#FFFFFF22' : color }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:            { flex: 1 },
  header:          { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  title:           { fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: 2 },
  subtitle:        { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2, letterSpacing: 0.4 },
  datePill:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  dateText:        { fontFamily: 'Inter_500Medium', fontSize: 11 },
  scroll:          { paddingHorizontal: 16, paddingTop: 4, gap: 14 },

  rankGate:        { borderRadius: 14, borderWidth: 1, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start', overflow: 'hidden' },
  rankGateIcon:    { fontSize: 26, marginTop: 2 },
  rankGateTitle:   { fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 1.2, marginBottom: 6 },
  rankGateBody:    { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  rankGateReq:     { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 8, lineHeight: 16 },

  card:            { borderRadius: 16, borderWidth: 1, padding: 16, overflow: 'hidden', gap: 12 },
  cardTop:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTopRight:    { flexDirection: 'row', gap: 6, alignItems: 'center' },

  typeBadge:       { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  lockBadge:       { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 },
  qualifiedBadge:  { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  roundBadge:      { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center' },
  roundBadgeEmoji: { fontSize: 12, marginRight: 4 },
  roundCounter:    { fontFamily: 'Inter_500Medium', fontSize: 10 },
  badgeText:       { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 },

  modePill:        { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  modeText:        { fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 0.4 },
  timePill:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  timeText:        { fontFamily: 'Inter_500Medium', fontSize: 10 },

  nameRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  eventEmoji:      { fontSize: 28, lineHeight: 34 },
  eventName:       { fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: 0.5 },
  eventDesc:       { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3, lineHeight: 17 },

  countdownBox:    { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  countdownLabel:  { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2 },
  countdownTime:   { fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 1 },
  countdownDate:   { fontFamily: 'Inter_400Regular', fontSize: 12, marginLeft: 'auto' as never },

  playsRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playsLabel:      { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1, width: 38 },
  dots:            { flexDirection: 'row', gap: 5, flex: 1 },
  dot:             { width: 10, height: 10, borderRadius: 5 },
  playsRemaining:  { fontFamily: 'Inter_600SemiBold', fontSize: 11 },

  divider:         { height: 1, borderRadius: 1 },

  rewardRow:       { flexDirection: 'row', gap: 8 },
  rewardPill:      { flex: 1, alignItems: 'center', gap: 2 },
  rewardValue:     { fontFamily: 'Inter_700Bold', fontSize: 15 },
  rewardLabel:     { fontFamily: 'Inter_500Medium', fontSize: 9, letterSpacing: 0.8 },
  lossNote:        { fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center' },

  // QP section
  qpSection:       { gap: 6 },
  qpHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qpLabel:         { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 },
  qpValue:         { fontFamily: 'Inter_700Bold', fontSize: 13 },
  qpTrack:         { height: 8, borderRadius: 4, overflow: 'hidden' },
  qpFill:          { height: '100%', borderRadius: 4 },
  qpNearNote:      { fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'center' },

  // QP placement table
  qpTable:         { borderRadius: 10, borderWidth: 1, padding: 12, gap: 6 },
  qpTableTitle:    { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2, marginBottom: 2 },
  qpTableRows:     { gap: 6 },
  qpTableRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qpTableIcon:     { fontSize: 14, width: 22 },
  qpTablePlace:    { fontFamily: 'Inter_600SemiBold', fontSize: 13, flex: 1 },
  qpTablePoints:   { fontFamily: 'Inter_700Bold', fontSize: 14 },

  advanceNote:     { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  advanceText:     { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },

  playBtn:         { borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
  playBtnText:     { fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 1.5 },

  infoBox:         { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'flex-start', marginTop: 2 },
  infoIcon:        { fontSize: 14 },
  infoText:        { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1, lineHeight: 18 },
});
