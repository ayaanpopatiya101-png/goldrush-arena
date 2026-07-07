import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  usePlayer, RANKS, ACHIEVEMENTS, SKINS, RELICS,
  getRelicLevel, getRankFromXP, xpForNextRank,
} from '@/context/PlayerContext';

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
const AVATAR_OPTS = ['🎮','⚡','🏆','👑','🔥','💎','🦁','🐉','⚔️','🛡️'];
const COLOR_OPTS  = ['#F0B429','#EF4444','#8B5CF6','#3B82F6','#10B981','#F97316','#EC4899','#06B6D4'];
const ACH_ICONS: Record<string, string> = {
  first_win:'🎉', win_streak:'🔥', trophy_100:'🏆', shop_purchase:'🛒', default:'⭐',
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, setAvatar, logout } = usePlayer();
  const [editAvatar, setEditAvatar] = useState(false);

  if (!profile) return null;

  const xp       = profile.xp ?? 0;
  const rankName = getRankFromXP(xp);
  const rankData = RANKS.find(r => r.name === rankName);
  const xpInfo   = xpForNextRank(xp);
  const wins     = profile.wins ?? 0;
  const losses   = profile.losses ?? 0;
  const total    = wins + losses;
  const winRate  = total > 0 ? Math.round((wins / total) * 100) : 0;
  const xpPct    = xpInfo.progress;

  const equippedSkin  = SKINS.find(s => s.id === profile.currentSkin);
  const equippedRelic = RELICS.find(r => r.id === profile.currentRelic);

  async function handleShare() {
    try {
      await Share.share({ message: `I'm ${profile.name} in GoldRush Arena — ${rankName} rank! 🏆` });
    } catch { /* ignore */ }
  }

  function handleLogout() {
    Alert.alert('Log out?', 'You will be returned to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <View style={[S.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={[BG1, BG0]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={S.header}>
        <Text style={S.headerTitle}>PROFILE</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {Platform.OS !== 'web' && (
            <Pressable onPress={handleShare} style={S.iconBtn}>
              <Text style={{ fontSize: 16 }}>↑</Text>
            </Pressable>
          )}
          <Pressable onPress={handleLogout} style={S.iconBtn}>
            <Text style={{ fontSize: 15 }}>🚪</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero banner */}
        <View style={[S.heroBanner, { borderColor: (rankData?.color ?? GOLD) + '44' }]}>
          <LinearGradient colors={[(rankData?.color ?? GOLD) + '28', CARD]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Pressable onPress={() => setEditAvatar(v => !v)} style={[S.avatarRing, { borderColor: rankData?.color ?? GOLD }]}>
            <Text style={{ fontSize: 38 }}>{profile.avatarEmoji}</Text>
          </Pressable>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={S.heroName}>{profile.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14 }}>{RANK_EMOJIS[rankName] ?? '🎖️'}</Text>
              <Text style={[S.rankName, { color: rankData?.color ?? GOLD }]}>{rankName}</Text>
            </View>
            <View style={S.xpRow}>
              <View style={S.xpBg}>
                <View style={[S.xpFill, { width: `${Math.round(xpPct * 100)}%` as `${number}%` }]} />
              </View>
              <Text style={S.xpLbl}>{xp} XP  ·  {xpInfo.remaining > 0 ? `${xpInfo.remaining} to ${xpInfo.next ?? 'MAX'}` : 'MAX'}</Text>
            </View>
          </View>
        </View>

        {/* Avatar picker */}
        {editAvatar && (
          <View style={S.editPanel}>
            <Text style={S.editTitle}>CHOOSE AVATAR</Text>
            <View style={S.pickerRow}>
              {AVATAR_OPTS.map(e => (
                <Pressable key={e}
                  onPress={() => { setAvatar(e, profile.avatarFrameColor); setEditAvatar(false); }}
                  style={[S.pickerItem, profile.avatarEmoji === e && S.pickerItemActive]}>
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[S.editTitle, { marginTop: 12 }]}>CHOOSE COLOR</Text>
            <View style={S.pickerRow}>
              {COLOR_OPTS.map(c => (
                <Pressable key={c}
                  onPress={() => { setAvatar(profile.avatarEmoji, c); setEditAvatar(false); }}
                  style={[S.colorDot, { backgroundColor: c }, profile.avatarFrameColor === c && S.colorDotActive]} />
              ))}
            </View>
          </View>
        )}

        {/* Stats */}
        <Text style={S.secTitle}>STATISTICS</Text>
        <View style={S.statsGrid}>
          {[
            { label: 'WINS',      val: wins,                icon: '⚔️' },
            { label: 'WIN RATE',  val: `${winRate}%`,       icon: '📈' },
            { label: 'STREAK',    val: profile.winStreak,   icon: '🔥' },
            { label: 'BEST EVER', val: profile.bestStreak,  icon: '🏅' },
          ].map(s => (
            <View key={s.label} style={S.statCard}>
              <Text style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</Text>
              <Text style={S.statVal}>{s.val}</Text>
              <Text style={S.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Loadout */}
        <Text style={S.secTitle}>LOADOUT</Text>
        <View style={S.loadoutRow}>
          <View style={S.loadoutCard}>
            <View style={[S.loadoutSwatch, { backgroundColor: equippedSkin?.color ?? '#666' }]} />
            <Text style={S.loadoutLabel}>{equippedSkin?.name ?? 'Classic'}</Text>
            <Text style={S.loadoutType}>SKIN</Text>
          </View>
          <View style={S.loadoutCard}>
            <Text style={{ fontSize: 28 }}>{equippedRelic?.icon ?? '✨'}</Text>
            <Text style={S.loadoutLabel}>{equippedRelic?.name ?? 'None'}</Text>
            <Text style={S.loadoutType}>RELIC</Text>
          </View>
          {equippedRelic && (
            <View style={S.loadoutCard}>
              <Text style={{ fontSize: 18, fontFamily: 'Exo2_900Black', color: GOLD }}>L{getRelicLevel(profile, equippedRelic.id)}</Text>
              <Text style={S.loadoutLabel}>Level</Text>
              <Text style={S.loadoutType}>RELIC LVL</Text>
            </View>
          )}
        </View>

        {/* Achievements */}
        <Text style={S.secTitle}>ACHIEVEMENTS</Text>
        <View style={S.achGrid}>
          {ACHIEVEMENTS.map(ach => {
            const earned = profile.achievements?.includes(ach.id);
            return (
              <View key={ach.id} style={[S.achCard, !earned && S.achCardLocked]}>
                <Text style={{ fontSize: 24, opacity: earned ? 1 : 0.3 }}>{ACH_ICONS[ach.id] ?? ACH_ICONS.default}</Text>
                <Text style={[S.achName, !earned && { opacity: 0.35 }]}>{ach.name}</Text>
                {earned && (
                  <View style={S.achBadge}>
                    <Text style={S.achBadgeTxt}>✓</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Login streak */}
        <Text style={S.secTitle}>LOGIN STREAK</Text>
        <View style={S.streakCard}>
          <View style={S.streakDots}>
            {Array.from({ length: 7 }).map((_, i) => (
              <View key={i} style={[S.dot, i < (profile.loginStreak % 7) && S.dotFilled]} />
            ))}
          </View>
          <Text style={S.streakTxt}>{profile.loginStreak} day{profile.loginStreak !== 1 ? 's' : ''} in a row 🔥</Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG0 },
  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDR },
  headerTitle: { fontFamily: 'Exo2_900Black', fontSize: 20, color: WHITE, letterSpacing: 2 },
  iconBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: DIM, alignItems: 'center', justifyContent: 'center' },

  secTitle: { fontFamily: 'Exo2_700Bold', fontSize: 10, color: MUTED, letterSpacing: 2, marginBottom: 10, marginTop: 20 },

  heroBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: CARD, borderWidth: 1, borderRadius: 18, padding: 16, overflow: 'hidden', marginBottom: 4 },
  avatarRing: { width: 70, height: 70, borderRadius: 35, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', backgroundColor: DIM, flexShrink: 0 },
  heroName:   { fontFamily: 'Exo2_900Black', fontSize: 18, color: WHITE },
  rankName:   { fontFamily: 'Exo2_700Bold', fontSize: 13 },
  xpRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  xpBg:       { flex: 1, height: 4, backgroundColor: DIM, borderRadius: 2, overflow: 'hidden' },
  xpFill:     { height: '100%', backgroundColor: GOLD, borderRadius: 2 },
  xpLbl:      { fontFamily: 'Exo2_500Medium', fontSize: 9, color: MUTED },

  editPanel:       { backgroundColor: CARD, borderWidth: 1, borderColor: BORDR, borderRadius: 14, padding: 14, marginTop: 10, marginBottom: 4 },
  editTitle:       { fontFamily: 'Exo2_700Bold', fontSize: 9, color: MUTED, letterSpacing: 2, marginBottom: 8 },
  pickerRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerItem:      { width: 42, height: 42, borderRadius: 21, backgroundColor: DIM, alignItems: 'center', justifyContent: 'center' },
  pickerItemActive:{ backgroundColor: GOLD + '30', borderWidth: 2, borderColor: GOLD },
  colorDot:        { width: 28, height: 28, borderRadius: 14 },
  colorDotActive:  { borderWidth: 2.5, borderColor: WHITE },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard:  { width: '47%', backgroundColor: CARD, borderWidth: 1, borderColor: BORDR, borderRadius: 14, padding: 16, alignItems: 'center', gap: 2 },
  statVal:   { fontFamily: 'Exo2_900Black', fontSize: 22, color: WHITE },
  statLbl:   { fontFamily: 'Exo2_600SemiBold', fontSize: 9, color: MUTED, letterSpacing: 1.5 },

  loadoutRow:  { flexDirection: 'row', gap: 10, marginBottom: 4 },
  loadoutCard: { flex: 1, backgroundColor: CARD, borderWidth: 1, borderColor: BORDR, borderRadius: 14, padding: 14, alignItems: 'center', gap: 5 },
  loadoutSwatch:{ width: 40, height: 40, borderRadius: 20 },
  loadoutLabel:{ fontFamily: 'Exo2_600SemiBold', fontSize: 11, color: WHITE, textAlign: 'center' },
  loadoutType: { fontFamily: 'Exo2_600SemiBold', fontSize: 8.5, color: MUTED, letterSpacing: 1 },

  achGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  achCard:     { width: '47%', backgroundColor: CARD, borderWidth: 1, borderColor: GOLD + '30', borderRadius: 14, padding: 14, alignItems: 'center', gap: 5 },
  achCardLocked:{ borderColor: BORDR },
  achName:     { fontFamily: 'Exo2_600SemiBold', fontSize: 11, color: WHITE, textAlign: 'center' },
  achBadge:    { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  achBadgeTxt: { fontFamily: 'Exo2_700Bold', fontSize: 10, color: WHITE },

  streakCard: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDR, borderRadius: 14, padding: 16, gap: 10 },
  streakDots: { flexDirection: 'row', gap: 8 },
  dot:        { flex: 1, height: 6, borderRadius: 3, backgroundColor: DIM },
  dotFilled:  { backgroundColor: GOLD },
  streakTxt:  { fontFamily: 'Exo2_600SemiBold', fontSize: 13, color: WHITE },
});
