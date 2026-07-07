import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RANKS, usePlayer, getRankFromXP } from '@/context/PlayerContext';

const BG0  = '#08071A';
const BG1  = '#0F0C24';
const GOLD = '#F0B429';
const WHITE= '#FFFFFF';
const MUTED= '#FFFFFF55';
const DIM  = '#FFFFFF18';
const CARD = '#FFFFFF07';
const BORDR= '#FFFFFF12';

const RANK_EMOJIS: Record<string, string> = {
  Iron:'🪨', Bronze:'🥉', Silver:'🥈', Gold:'🥇', Platinum:'💎', Diamond:'💠', Master:'⭐', Legend:'👑',
};

const MOCK_PLAYERS = [
  { username: 'DragonSlayer', emoji: '🐉', xp: 52000, rankName: 'Legend'   },
  { username: 'GoldRushKing', emoji: '👑', xp: 41000, rankName: 'Legend'   },
  { username: 'BlasterX',     emoji: '💥', xp: 22000, rankName: 'Master'   },
  { username: 'SilverArrow',  emoji: '🏹', xp: 18000, rankName: 'Diamond'  },
  { username: 'IceQueen',     emoji: '❄️', xp: 12000, rankName: 'Platinum' },
  { username: 'RedStorm',     emoji: '⚡', xp: 8000,  rankName: 'Platinum' },
  { username: 'CryptoFire',   emoji: '🔥', xp: 4500,  rankName: 'Gold'     },
  { username: 'NightHunter',  emoji: '🌙', xp: 2000,  rankName: 'Silver'   },
];

const TABS = ['GLOBAL', 'YOUR RANK'] as const;
type Tab = typeof TABS[number];

function PodiumPlayer({ player, position, delay }: {
  player: typeof MOCK_PLAYERS[0]; position: number; delay: number;
}) {
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 500, delay, useNativeDriver: true }).start();
  }, [rise, delay]);

  const podiumColors = ['#F59E0B', '#94A3B8', '#CD7F32'];
  const heights      = [100, 76, 60];
  const color        = podiumColors[position - 1] ?? GOLD;
  const rankColor    = RANKS.find(r => r.name === player.rankName)?.color ?? MUTED;

  return (
    <Animated.View style={[S.podiumSlot, { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
      <Text style={S.podiumEmoji}>{player.emoji}</Text>
      <Text style={[S.podiumName, { color }]}>{player.username.slice(0, 10)}</Text>
      <Text style={[S.podiumRank, { color: rankColor }]}>{RANK_EMOJIS[player.rankName] ?? ''} {player.rankName}</Text>
      <View style={[S.podiumBase, { height: heights[position - 1], borderTopColor: color }]}>
        <Text style={[S.podiumNum, { color }]}>{position === 1 ? '👑' : `#${position}`}</Text>
      </View>
    </Animated.View>
  );
}

function PlayerRow({ player, rank, isYou }: {
  player: { username: string; emoji: string; xp: number; rankName: string };
  rank: number; isYou: boolean;
}) {
  const rankColors: Record<number, string> = { 1: GOLD, 2: '#94A3B8', 3: '#CD7F32' };
  const rankColor = RANKS.find(r => r.name === player.rankName)?.color ?? MUTED;
  return (
    <View style={[S.playerRow, isYou && S.playerRowYou]}>
      {isYou && <LinearGradient colors={[GOLD + '15', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />}
      <Text style={[S.rowRank, { color: rankColors[rank] ?? MUTED }]}>
        {rank <= 3 ? (['🥇','🥈','🥉'] as const)[rank - 1] : `#${rank}`}
      </Text>
      <View style={S.rowAvatar}>
        <Text style={{ fontSize: 18 }}>{player.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={S.rowName}>{player.username}</Text>
        <Text style={[S.rowRankName, { color: rankColor }]}>{RANK_EMOJIS[player.rankName] ?? ''} {player.rankName}</Text>
      </View>
      <Text style={S.rowXp}>{(player.xp / 1000).toFixed(1)}k XP</Text>
      {isYou && <View style={S.youBadge}><Text style={S.youBadgeTxt}>YOU</Text></View>}
    </View>
  );
}

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = usePlayer();
  const [tab, setTab] = useState<Tab>('GLOBAL');

  const myXp      = profile?.xp ?? 0;
  const rankName  = getRankFromXP(myXp);
  const rankData  = RANKS.find(r => r.name === rankName);
  const myEntry   = {
    username: profile?.name ?? 'You',
    emoji:    profile?.avatarEmoji ?? '🎮',
    xp:       myXp,
    rankName,
  };

  const allPlayers = [...MOCK_PLAYERS, myEntry].sort((a, b) => b.xp - a.xp);
  const myPos      = allPlayers.findIndex(p => p.username === myEntry.username) + 1;

  return (
    <View style={[S.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={[BG1, BG0]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={S.header}>
        <Text style={S.headerTitle}>LEADERBOARD</Text>
        <View style={S.rankChip}>
          <Text style={{ fontSize: 13 }}>{RANK_EMOJIS[rankName] ?? '🎖️'}</Text>
          <Text style={[S.chipVal, { color: rankData?.color ?? GOLD }]}>{rankName}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={S.tabBar}>
        {TABS.map(t => (
          <Pressable key={t} onPress={() => setTab(t)} style={[S.tabBtn, tab === t && S.tabBtnActive]}>
            <Text style={[S.tabTxt, tab === t && S.tabTxtActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        {tab === 'GLOBAL' && (
          <>
            <View style={S.podium}>
              <PodiumPlayer player={MOCK_PLAYERS[1]} position={2} delay={100} />
              <PodiumPlayer player={MOCK_PLAYERS[0]} position={1} delay={0}   />
              <PodiumPlayer player={MOCK_PLAYERS[2]} position={3} delay={200} />
            </View>
            <Text style={S.secTitle}>ALL PLAYERS</Text>
            {allPlayers.map((p, i) => (
              <PlayerRow key={p.username} player={p} rank={i + 1} isYou={p.username === myEntry.username} />
            ))}
          </>
        )}

        {tab === 'YOUR RANK' && (
          <>
            <View style={[S.yourCard, { borderColor: (rankData?.color ?? GOLD) + '55' }]}>
              <LinearGradient colors={[(rankData?.color ?? GOLD) + '22', CARD]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <View style={S.yourAvatarRing}>
                <Text style={{ fontSize: 36 }}>{myEntry.emoji}</Text>
              </View>
              <Text style={S.yourName}>{myEntry.username}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Text style={{ fontSize: 18 }}>{RANK_EMOJIS[rankName] ?? '🎖️'}</Text>
                <Text style={[S.yourRank, { color: rankData?.color ?? GOLD }]}>{rankName}</Text>
              </View>
              <Text style={S.yourPos}>Global Rank #{myPos}</Text>
              <View style={S.yourXpRow}>
                <Text style={S.yourXp}>{myXp.toLocaleString()} XP</Text>
              </View>
            </View>

            <Text style={S.secTitle}>NEARBY PLAYERS</Text>
            {allPlayers.slice(Math.max(0, myPos - 3), myPos + 2).map((p, i) => (
              <PlayerRow key={p.username} player={p} rank={Math.max(1, myPos - 2) + i} isYou={p.username === myEntry.username} />
            ))}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG0 },
  scroll: { paddingHorizontal: 16, paddingTop: 14 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDR },
  headerTitle: { fontFamily: 'Exo2_900Black', fontSize: 20, color: WHITE, letterSpacing: 2 },
  rankChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: DIM, borderWidth: 1, borderColor: BORDR, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  chipVal:     { fontFamily: 'Exo2_700Bold', fontSize: 13 },

  tabBar:      { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: BORDR },
  tabBtn:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: DIM },
  tabBtnActive:{ backgroundColor: GOLD + '22', borderWidth: 1, borderColor: GOLD + '60' },
  tabTxt:      { fontFamily: 'Exo2_700Bold', fontSize: 11, color: MUTED, letterSpacing: 1 },
  tabTxtActive:{ color: GOLD },

  secTitle: { fontFamily: 'Exo2_700Bold', fontSize: 10, color: MUTED, letterSpacing: 2, marginBottom: 10, marginTop: 18 },

  podium:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 4, marginBottom: 8, paddingHorizontal: 8 },
  podiumSlot: { flex: 1, alignItems: 'center', gap: 4 },
  podiumEmoji:{ fontSize: 28 },
  podiumName: { fontFamily: 'Exo2_700Bold', fontSize: 11, textAlign: 'center' },
  podiumRank: { fontFamily: 'Exo2_500Medium', fontSize: 9, textAlign: 'center' },
  podiumBase: { width: '100%', backgroundColor: CARD, borderTopWidth: 2, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  podiumNum:  { fontFamily: 'Exo2_900Black', fontSize: 20, padding: 8 },

  playerRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDR, borderRadius: 12, padding: 12, marginBottom: 8, overflow: 'hidden' },
  playerRowYou: { borderColor: GOLD + '40' },
  rowRank:      { fontFamily: 'Exo2_900Black', fontSize: 13, width: 28, textAlign: 'center' },
  rowAvatar:    { width: 36, height: 36, borderRadius: 18, backgroundColor: DIM, alignItems: 'center', justifyContent: 'center' },
  rowName:      { fontFamily: 'Exo2_700Bold', fontSize: 14, color: WHITE },
  rowRankName:  { fontFamily: 'Exo2_600SemiBold', fontSize: 10 },
  rowXp:        { fontFamily: 'Exo2_700Bold', fontSize: 12, color: MUTED },
  youBadge:     { backgroundColor: GOLD, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  youBadgeTxt:  { fontFamily: 'Exo2_700Bold', fontSize: 9, color: BG0, letterSpacing: 0.5 },

  yourCard:      { backgroundColor: CARD, borderWidth: 1, borderRadius: 18, padding: 24, alignItems: 'center', gap: 6, overflow: 'hidden', marginBottom: 4 },
  yourAvatarRing:{ width: 80, height: 80, borderRadius: 40, backgroundColor: DIM, borderWidth: 2, borderColor: GOLD + '50', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  yourName:      { fontFamily: 'Exo2_900Black', fontSize: 20, color: WHITE },
  yourRank:      { fontFamily: 'Exo2_700Bold', fontSize: 15 },
  yourPos:       { fontFamily: 'Exo2_600SemiBold', fontSize: 12, color: MUTED, marginTop: 2 },
  yourXpRow:     { marginTop: 4 },
  yourXp:        { fontFamily: 'Exo2_900Black', fontSize: 26, color: GOLD },
});
