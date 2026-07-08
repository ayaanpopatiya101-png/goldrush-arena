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
  getCurrentEvents, getRankIndex, RANKS, usePlayer,
  type EventDefinition,
} from '@/context/PlayerContext';
import { useColors } from '@/hooks/useColors';
import {
  setActiveEvent, setGameConfig,
  type ActiveEventBonus, type GameVariant,
} from '@/store/gameSession';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 1)  return `${d}d ${h}h`;
  if (d === 1) return `1d ${h}h`;
  if (h > 0)   return `${h}h ${m}m`;
  return `${m}m`;
}

const GENERAL1_RANK = RANKS.find(r => r.name === 'General 1');

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function EventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, spendEventPlay } = usePlayer();

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const events  = getCurrentEvents();
  const rankIdx = getRankIndex(profile.rank);
  const topPad  = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const hasRank = rankIdx >= EVENT_MIN_RANK_INDEX;

  function playsLeft(ev: EventDefinition): number {
    const used = (profile.eventPlaysUsed ?? {})[ev.periodKey] ?? 0;
    return Math.max(0, ev.maxPlays - used);
  }

  async function handlePlay(ev: EventDefinition) {
    if (ev.isLocked || !hasRank) return;
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
      <LinearGradient colors={['#07090F', '#0C1428', '#07090F']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 6 }]}>
        <View>
          <Text style={[s.title, { color: colors.foreground }]}>EVENTS</Text>
          <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
            Exclusive · General 1+ only · Resets on schedule
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
        {/* Rank gate banner — shown when player is below General 1 */}
        {!hasRank && (
          <View style={[s.rankGate, { borderColor: '#E04030AA', backgroundColor: '#E0403010' }]}>
            <LinearGradient colors={['#E0403020', 'transparent']} style={StyleSheet.absoluteFill} />
            <Text style={s.rankGateIcon}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.rankGateTitle, { color: '#E04030' }]}>EVENTS LOCKED</Text>
              <Text style={[s.rankGateBody, { color: '#FFFFFF88' }]}>
                Events are exclusive to{' '}
                <Text style={{ color: GENERAL1_RANK?.color ?? '#E04030', fontFamily: 'Inter_700Bold' }}>
                  General 1
                </Text>
                {' '}and above. Keep climbing the ranks to unlock event access and earn bonus rewards.
              </Text>
              <Text style={[s.rankGateReq, { color: '#FFFFFF44' }]}>
                Your rank: <Text style={{ color: RANKS.find(r => r.name === profile.rank)?.color ?? '#FFF' }}>{profile.rank}</Text>
                {'  ·  '}Required: <Text style={{ color: GENERAL1_RANK?.color ?? '#E04030' }}>General 1</Text>
                {'  ·  '}{(340_000 - profile.xp).toLocaleString()} XP to go
              </Text>
            </View>
          </View>
        )}

        <EventCard
          event={events.weekly}
          playsLeft={playsLeft(events.weekly)}
          rankGated={!hasRank}
          onPlay={() => handlePlay(events.weekly)}
        />
        <EventCard
          event={events.monthly}
          playsLeft={playsLeft(events.monthly)}
          rankGated={!hasRank}
          onPlay={() => handlePlay(events.monthly)}
        />
        <EventCard
          event={events.annual}
          playsLeft={playsLeft(events.annual)}
          rankGated={!hasRank}
          onPlay={() => handlePlay(events.annual)}
        />

        <View style={[s.infoBox, { borderColor: '#E0403022', backgroundColor: '#E040300A' }]}>
          <Text style={s.infoIcon}>⚡</Text>
          <Text style={[s.infoText, { color: '#FFFFFF55' }]}>
            All General 1+ participants earn{' '}
            <Text style={{ color: '#B9A0E0' }}>Credits</Text> in addition to XP and coins.
            Credits are used in the <Text style={{ color: '#C8820A' }}>Forge</Text> shop.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Event Card ────────────────────────────────────────────────────────────────
function EventCard({ event, playsLeft, rankGated, onPlay }: {
  event: EventDefinition;
  playsLeft: number;
  rankGated: boolean;
  onPlay: () => void;
}) {
  const noPlays    = playsLeft === 0 && !event.isLocked;
  const locked     = event.isLocked;
  const disabled   = locked || noPlays || rankGated;

  const typeLabel  = event.type === 'weekly' ? 'WEEKLY'
    : event.type === 'monthly' ? 'MONTHLY CUP'
    : 'ANNUAL CUP';

  const modeName: Record<string, string> = {
    classic: 'Classic', chaos: 'Chaos', blitz: 'Blitz',
    six_player: 'Six-Player', survival: 'Survival', turbo: 'Turbo',
  };

  const dimColor   = disabled ? '#FFFFFF08' : event.color + '12';
  const borderCol  = disabled ? '#FFFFFF10' : event.color + '44';

  return (
    <View style={[s.card, { backgroundColor: dimColor, borderColor: borderCol }]}>
      <LinearGradient
        colors={[event.color + (disabled ? '06' : '16'), 'transparent']}
        style={StyleSheet.absoluteFill}
      />

      {/* Top row */}
      <View style={s.cardTop}>
        {locked ? (
          <View style={[s.lockBadge, { backgroundColor: '#FFFFFF0A', borderColor: '#FFFFFF22' }]}>
            <Feather name="lock" size={10} color="#FFFFFF44" />
            <Text style={[s.lockBadgeText, { color: '#FFFFFF44' }]}>LOCKED</Text>
          </View>
        ) : (
          <View style={[s.typeBadge, { backgroundColor: event.color + '22', borderColor: event.color + '55' }]}>
            <Text style={[s.typeBadgeText, { color: disabled ? event.color + '44' : event.color }]}>
              {typeLabel}
            </Text>
          </View>
        )}

        <View style={s.cardTopRight}>
          <View style={[s.modePill, { borderColor: '#FFFFFF14' }]}>
            <Text style={[s.modeText, { color: disabled ? '#FFFFFF22' : '#FFFFFF66' }]}>
              {modeName[event.mode] ?? event.mode}
            </Text>
          </View>
          {/* Time pill: shows opens-in or closes-in */}
          <View style={[s.timePill, { borderColor: '#FFFFFF14' }]}>
            <Feather name="clock" size={9} color={disabled ? '#FFFFFF22' : '#FFFFFF55'} />
            <Text style={[s.timeText, { color: disabled ? '#FFFFFF22' : '#FFFFFF66' }]}>
              {locked ? `Opens ${event.opensOnLabel}` : `${fmt(event.endsIn)} left`}
            </Text>
          </View>
        </View>
      </View>

      {/* Name + description */}
      <View style={s.nameRow}>
        <Text style={[s.eventEmoji, { opacity: disabled ? 0.25 : 1 }]}>{event.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.eventName, { color: disabled ? event.color + '44' : event.color }]}>
            {event.name}
          </Text>
          <Text style={[s.eventDesc, { color: disabled ? '#FFFFFF18' : '#FFFFFF77' }]}>
            {locked
              ? `This event opens on ${event.opensOnLabel}. Check back then!`
              : event.description}
          </Text>
        </View>
      </View>

      {/* Lock countdown (date-locked events) */}
      {locked && (
        <View style={[s.countdownBox, { borderColor: '#FFFFFF0C', backgroundColor: '#FFFFFF06' }]}>
          <Feather name="lock" size={14} color="#FFFFFF33" />
          <View>
            <Text style={[s.countdownLabel, { color: '#FFFFFF44' }]}>OPENS IN</Text>
            <Text style={[s.countdownTime, { color: '#FFFFFF77' }]}>{fmt(event.endsIn)}</Text>
          </View>
          <Text style={[s.countdownDate, { color: '#FFFFFF33' }]}>{event.opensOnLabel}</Text>
        </View>
      )}

      {/* Plays dots — only when not locked */}
      {!locked && (
        <View style={s.playsRow}>
          <Text style={[s.playsLabel, { color: '#FFFFFF33' }]}>PLAYS</Text>
          <View style={s.dots}>
            {Array.from({ length: event.maxPlays }).map((_, i) => (
              <View
                key={i}
                style={[s.dot, { backgroundColor: i < playsLeft ? event.color : '#FFFFFF14' }]}
              />
            ))}
          </View>
          <Text style={[s.playsRemaining, { color: noPlays ? '#FFFFFF22' : event.color }]}>
            {noPlays ? 'DONE' : `${playsLeft} / ${event.maxPlays}`}
          </Text>
        </View>
      )}

      {/* Rewards — only when not locked */}
      {!locked && (
        <>
          <View style={[s.divider, { backgroundColor: '#FFFFFF0C' }]} />
          <View style={s.rewardRow}>
            <RewardPill label="WIN XP"    value={`+${event.winRewards.xp}`}    color="#FFD700"  dim={disabled} />
            <RewardPill label="WIN COINS" value={`+${event.winRewards.coins}`} color="#C8820A"  dim={disabled} />
            <RewardPill label="CREDITS"   value={`+${event.creditsOnWin}`}     color="#B9A0E0"  dim={disabled} prefix="⚡ " />
          </View>
          <Text style={[s.lossNote, { color: disabled ? '#FFFFFF18' : '#FFFFFF33' }]}>
            Loss: +{event.loseRewards.xp} XP · +{event.loseRewards.coins} coins · ⚡+{event.creditsOnLose}
          </Text>
        </>
      )}

      {/* Play / status button */}
      <Pressable
        onPress={disabled ? undefined : onPlay}
        style={({ pressed }) => [
          s.playBtn,
          {
            backgroundColor: disabled ? '#FFFFFF06' : event.color + '20',
            borderColor:     disabled ? '#FFFFFF10' : event.color + '66',
            opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
            transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
          },
        ]}
      >
        <Text style={[s.playBtnText, { color: disabled ? '#FFFFFF22' : event.color }]}>
          {rankGated
            ? '🔒  REQUIRES GENERAL 1'
            : locked
            ? `🔒  OPENS ${event.opensOnLabel.toUpperCase()}`
            : noPlays
            ? 'NO PLAYS REMAINING'
            : '▶  PLAY NOW'}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Reward Pill ───────────────────────────────────────────────────────────────
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

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:           { flex: 1 },
  header:         { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  title:          { fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: 2 },
  subtitle:       { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2, letterSpacing: 0.4 },
  datePill:       { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  dateText:       { fontFamily: 'Inter_500Medium', fontSize: 11 },
  scroll:         { paddingHorizontal: 16, paddingTop: 4, gap: 14 },

  // Rank gate
  rankGate:       { borderRadius: 14, borderWidth: 1, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start', overflow: 'hidden' },
  rankGateIcon:   { fontSize: 26, marginTop: 2 },
  rankGateTitle:  { fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 1.2, marginBottom: 6 },
  rankGateBody:   { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  rankGateReq:    { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 8, lineHeight: 16 },

  // Card
  card:           { borderRadius: 16, borderWidth: 1, padding: 16, overflow: 'hidden', gap: 12 },
  cardTop:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTopRight:   { flexDirection: 'row', gap: 6, alignItems: 'center' },
  typeBadge:      { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText:  { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 },
  lockBadge:      { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockBadgeText:  { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 },
  modePill:       { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  modeText:       { fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 0.4 },
  timePill:       { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  timeText:       { fontFamily: 'Inter_500Medium', fontSize: 10 },

  nameRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  eventEmoji:     { fontSize: 28, lineHeight: 34 },
  eventName:      { fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: 0.5 },
  eventDesc:      { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3, lineHeight: 17 },

  // Countdown box for locked events
  countdownBox:   { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  countdownLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2 },
  countdownTime:  { fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 1 },
  countdownDate:  { fontFamily: 'Inter_400Regular', fontSize: 12, marginLeft: 'auto' as never },

  playsRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playsLabel:     { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1, width: 38 },
  dots:           { flexDirection: 'row', gap: 5, flex: 1 },
  dot:            { width: 10, height: 10, borderRadius: 5 },
  playsRemaining: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },

  divider:        { height: 1, borderRadius: 1 },

  rewardRow:      { flexDirection: 'row', gap: 8 },
  rewardPill:     { flex: 1, alignItems: 'center', gap: 2 },
  rewardValue:    { fontFamily: 'Inter_700Bold', fontSize: 15 },
  rewardLabel:    { fontFamily: 'Inter_500Medium', fontSize: 9, letterSpacing: 0.8 },

  lossNote:       { fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center' },

  playBtn:        { borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
  playBtnText:    { fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 1.5 },

  infoBox:        { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'flex-start', marginTop: 2 },
  infoIcon:       { fontSize: 14 },
  infoText:       { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1, lineHeight: 18 },
});
