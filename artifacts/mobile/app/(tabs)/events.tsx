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
  getCurrentEvents, getRankIndex, RANKS, usePlayer,
  type EventDefinition,
} from '@/context/PlayerContext';
import { useColors } from '@/hooks/useColors';
import {
  setActiveEvent, setGameConfig,
  type ActiveEventBonus, type GameVariant,
} from '@/store/gameSession';

// ─── Time helpers ──────────────────────────────────────────────────────────────
function formatTimeRemaining(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const days  = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const mins  = Math.floor((secs % 3600) / 60);
  if (days > 1)  return `${days}d ${hours}h`;
  if (days === 1) return `1d ${hours}h`;
  if (hours > 0)  return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function EventsScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { profile, spendEventPlay } = usePlayer();

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const events   = getCurrentEvents();
  const rankIdx  = getRankIndex(profile.rank);
  const topPad   = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  function playsLeft(ev: EventDefinition): number {
    const used = (profile.eventPlaysUsed ?? {})[ev.periodKey] ?? 0;
    return Math.max(0, ev.maxPlays - used);
  }

  async function handlePlay(ev: EventDefinition) {
    const ok = await spendEventPlay(ev.periodKey);
    if (!ok) return;

    const earnsCredits = rankIdx >= ev.creditRankIndex;
    const bonus: ActiveEventBonus = {
      eventId:    ev.id,
      eventName:  ev.name,
      eventEmoji: ev.emoji,
      eventColor: ev.color,
      winXP:      ev.winRewards.xp,
      winCoins:   ev.winRewards.coins,
      loseXP:     ev.loseRewards.xp,
      loseCoins:  ev.loseRewards.coins,
      winCredits:  earnsCredits ? ev.creditsOnWin  : 0,
      loseCredits: earnsCredits ? ev.creditsOnLose : 0,
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

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    router.push('/game');
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#07090F', '#0C1428', '#07090F']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 6 }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>EVENTS</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Limited plays · Bonus XP & Coins · Credits for Legend 1+
          </Text>
        </View>
        <View style={[styles.datePill, { borderColor: colors.border }]}>
          <Feather name="calendar" size={11} color={colors.mutedForeground} />
          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
      >
        <EventCard
          event={events.weekly}
          playsLeft={playsLeft(events.weekly)}
          rankIdx={rankIdx}
          onPlay={() => handlePlay(events.weekly)}
        />
        <EventCard
          event={events.monthly}
          playsLeft={playsLeft(events.monthly)}
          rankIdx={rankIdx}
          onPlay={() => handlePlay(events.monthly)}
        />
        <EventCard
          event={events.annual}
          playsLeft={playsLeft(events.annual)}
          rankIdx={rankIdx}
          onPlay={() => handlePlay(events.annual)}
        />

        {/* Credit rank info */}
        <View style={[styles.infoBox, { borderColor: '#B9A0E022', backgroundColor: '#B9A0E00A' }]}>
          <Text style={styles.infoIcon}>⚡</Text>
          <Text style={[styles.infoText, { color: '#FFFFFF66' }]}>
            Credits are awarded to{' '}
            <Text style={{ color: '#B9A0E0' }}>
              {RANKS.find(r => r.name === 'Legend 1')?.name ?? 'Legend 1'}+
            </Text>{' '}
            ranked players only. Climb the ranks to unlock bonus credit rewards from every event.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Event Card ────────────────────────────────────────────────────────────────
function EventCard({
  event, playsLeft, rankIdx, onPlay,
}: {
  event: EventDefinition;
  playsLeft: number;
  rankIdx: number;
  onPlay: () => void;
}) {
  const earnsCredits = rankIdx >= event.creditRankIndex;
  const noPlays      = playsLeft === 0;

  const typeLabel = event.type === 'weekly'
    ? 'WEEKLY'
    : event.type === 'monthly'
    ? 'MONTHLY CUP'
    : 'ANNUAL CUP';

  const modeName = {
    classic:    'Classic',
    chaos:      'Chaos',
    blitz:      'Blitz',
    six_player: 'Six-Player',
    survival:   'Survival',
    turbo:      'Turbo',
    pinball:    'Pinball',
  }[event.mode] ?? event.mode;

  return (
    <View style={[
      styles.card,
      {
        borderColor: noPlays ? '#FFFFFF0D' : event.color + '44',
        backgroundColor: noPlays ? '#FFFFFF04' : event.color + '0A',
      },
    ]}>
      <LinearGradient
        colors={[event.color + (noPlays ? '08' : '14'), 'transparent']}
        style={StyleSheet.absoluteFill}
      />

      {/* Top row: type badge + mode + time */}
      <View style={styles.cardTop}>
        <View style={[styles.typeBadge, { backgroundColor: event.color + '22', borderColor: event.color + '55' }]}>
          <Text style={[styles.typeBadgeText, { color: noPlays ? event.color + '66' : event.color }]}>
            {typeLabel}
          </Text>
        </View>
        <View style={styles.cardTopRight}>
          <View style={[styles.modePill, { borderColor: '#FFFFFF18' }]}>
            <Text style={styles.modeText}>{modeName}</Text>
          </View>
          <View style={[styles.timePill, { borderColor: '#FFFFFF18' }]}>
            <Feather name="clock" size={9} color="#FFFFFF44" />
            <Text style={styles.timeText}>{formatTimeRemaining(event.endsIn)}</Text>
          </View>
        </View>
      </View>

      {/* Name + description */}
      <View style={styles.nameRow}>
        <Text style={styles.eventEmoji}>{event.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eventName, { color: noPlays ? event.color + '55' : event.color }]}>
            {event.name}
          </Text>
          <Text style={[styles.eventDesc, { color: noPlays ? '#FFFFFF22' : '#FFFFFF77' }]}>
            {event.description}
          </Text>
        </View>
      </View>

      {/* Plays remaining */}
      <View style={styles.playsRow}>
        <Text style={[styles.playsLabel, { color: '#FFFFFF44' }]}>PLAYS</Text>
        <View style={styles.dots}>
          {Array.from({ length: event.maxPlays }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i < playsLeft ? event.color : '#FFFFFF18' },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.playsRemaining, { color: noPlays ? '#FFFFFF33' : event.color }]}>
          {noPlays ? 'DONE' : `${playsLeft} / ${event.maxPlays}`}
        </Text>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: '#FFFFFF0C' }]} />

      {/* Rewards */}
      <View style={styles.rewardRow}>
        <RewardPill
          label="WIN XP"
          value={`+${event.winRewards.xp}`}
          color="#FFD700"
          dim={noPlays}
        />
        <RewardPill
          label="WIN COINS"
          value={`+${event.winRewards.coins}`}
          color="#C8820A"
          dim={noPlays}
        />
        {earnsCredits ? (
          <RewardPill
            label="CREDITS"
            value={`+${event.creditsOnWin}`}
            color="#B9A0E0"
            dim={noPlays}
            prefix="⚡ "
          />
        ) : (
          <View style={styles.lockedCredits}>
            <Text style={[styles.lockedLabel, { color: '#FFFFFF22' }]}>⚡ Credits</Text>
            <Text style={[styles.lockedReq, { color: '#FFFFFF22' }]}>Legend 1+</Text>
          </View>
        )}
      </View>

      {/* Loss reward sub-line */}
      <Text style={[styles.lossNote, { color: '#FFFFFF33' }]}>
        Loss: +{event.loseRewards.xp} XP · +{event.loseRewards.coins} coins
        {earnsCredits ? ` · ⚡+${event.creditsOnLose}` : ''}
      </Text>

      {/* Play button */}
      <Pressable
        onPress={noPlays ? undefined : onPlay}
        style={({ pressed }) => [
          styles.playBtn,
          {
            backgroundColor: noPlays ? '#FFFFFF08' : event.color + '22',
            borderColor:     noPlays ? '#FFFFFF12' : event.color + '66',
            opacity: noPlays ? 0.5 : pressed ? 0.75 : 1,
            transform: [{ scale: pressed && !noPlays ? 0.98 : 1 }],
          },
        ]}
      >
        <Text style={[styles.playBtnText, { color: noPlays ? '#FFFFFF33' : event.color }]}>
          {noPlays ? 'NO PLAYS REMAINING' : `▶  PLAY NOW`}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Reward Pill ───────────────────────────────────────────────────────────────
function RewardPill({
  label, value, color, dim, prefix = '',
}: { label: string; value: string; color: string; dim: boolean; prefix?: string }) {
  return (
    <View style={styles.rewardPill}>
      <Text style={[styles.rewardValue, { color: dim ? '#FFFFFF22' : color }]}>
        {prefix}{value}
      </Text>
      <Text style={[styles.rewardLabel, { color: dim ? '#FFFFFF11' : '#FFFFFF44' }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:         { flex: 1 },
  header:       { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  title:        { fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: 2 },
  subtitle:     { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2, letterSpacing: 0.5 },
  datePill:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  dateText:     { fontFamily: 'Inter_500Medium', fontSize: 11 },
  scroll:       { paddingHorizontal: 16, paddingTop: 4, gap: 14 },

  card:         { borderRadius: 16, borderWidth: 1, padding: 16, overflow: 'hidden', gap: 12 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTopRight: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  typeBadge:    { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText:{ fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 },
  modePill:     { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  modeText:     { fontFamily: 'Inter_500Medium', fontSize: 10, color: '#FFFFFF55', letterSpacing: 0.5 },
  timePill:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  timeText:     { fontFamily: 'Inter_500Medium', fontSize: 10, color: '#FFFFFF55' },

  nameRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  eventEmoji:   { fontSize: 28, lineHeight: 34 },
  eventName:    { fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: 0.5 },
  eventDesc:    { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3, lineHeight: 17 },

  playsRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playsLabel:   { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1, width: 38 },
  dots:         { flexDirection: 'row', gap: 5, flex: 1 },
  dot:          { width: 10, height: 10, borderRadius: 5 },
  playsRemaining:{ fontFamily: 'Inter_600SemiBold', fontSize: 11 },

  divider:      { height: 1, borderRadius: 1 },

  rewardRow:    { flexDirection: 'row', gap: 8 },
  rewardPill:   { flex: 1, alignItems: 'center', gap: 2 },
  rewardValue:  { fontFamily: 'Inter_700Bold', fontSize: 15 },
  rewardLabel:  { fontFamily: 'Inter_500Medium', fontSize: 9, letterSpacing: 0.8 },

  lockedCredits:{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  lockedLabel:  { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  lockedReq:    { fontFamily: 'Inter_400Regular', fontSize: 9 },

  lossNote:     { fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center' },

  playBtn:      { borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
  playBtnText:  { fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 1.5 },

  infoBox:      { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'flex-start', marginTop: 2 },
  infoIcon:     { fontSize: 14 },
  infoText:     { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1, lineHeight: 18 },
});
