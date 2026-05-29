import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RankBadge } from '@/components/RankBadge';
import {
  ACHIEVEMENTS, AVATAR_COLORS, AVATAR_EMOJIS, RANKS, SKINS,
  getChallengeCode, usePlayer, xpForNextRank, xpToLevel,
} from '@/context/PlayerContext';
import { useColors } from '@/hooks/useColors';

export default function ProfileScreen() {
  const colors    = useColors();
  const insets    = useSafeAreaInsets();
  const {
    profile, logout, setAvatar,
  } = usePlayer();

  const [avatarEditing, setAvatarEditing] = useState(false);
  const [tempEmoji, setTempEmoji]         = useState(profile.avatarEmoji);
  const [tempColor, setTempColor]         = useState(profile.avatarFrameColor);

  const rankInfo  = xpForNextRank(profile.xp);
  const rankData  = RANKS.find(r => r.name === profile.rank) ?? RANKS[0];
  const topPad    = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const winRate   = profile.totalGames > 0 ? Math.round((profile.wins / profile.totalGames) * 100) : 0;
  const code      = getChallengeCode(profile.name);

  async function handleSaveAvatar() {
    await setAvatar(tempEmoji, tempColor);
    setAvatarEditing(false);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: [
          '🏆 GOLDRUSH ARENA RANK CARD 🏆',
          '━━━━━━━━━━━━━━━━━━━━',
          `👤 ${profile.name}`,
          `⭐ ${profile.rank} · Level ${xpToLevel(profile.xp)}`,
          `🏅 ${profile.xp.toLocaleString()} Total XP`,
          `🎯 ${profile.wins} Wins · ${winRate}% Win Rate`,
          `⚡ Best Streak: ${profile.bestStreak}`,
          '━━━━━━━━━━━━━━━━━━━━',
          `🎮 Challenge Code: ${code}`,
          'Download GoldRush Arena — Last One Standing Wins!',
        ].join('\n'),
      });
    } catch { /* user dismissed */ }
  }

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#080814', '#0C0C22']} style={StyleSheet.absoluteFill} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: insets.bottom + 80, paddingHorizontal: 20, gap: 16 }}
      >
        {/* ── Profile card ── */}
        <View style={[styles.profileCard, { borderColor: rankData.color + '44' }]}>
          <LinearGradient colors={[rankData.color + '1A', rankData.color + '08']} style={StyleSheet.absoluteFill} />

          {/* Avatar — tappable to edit */}
          <Pressable onPress={() => { setTempEmoji(profile.avatarEmoji); setTempColor(profile.avatarFrameColor); setAvatarEditing(true); }}>
            <View style={[styles.bigAvatar, { borderColor: profile.avatarFrameColor, backgroundColor: profile.avatarFrameColor + '33' }]}>
              <Text style={styles.bigAvatarEmoji}>{profile.avatarEmoji}</Text>
              <View style={styles.editBadge}>
                <Feather name="edit-2" size={9} color="#000" />
              </View>
            </View>
          </Pressable>

          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>{profile.name}</Text>
            <Text style={[styles.levelBadge, { color: rankData.color }]}>Level {xpToLevel(profile.xp)} · {profile.rank}</Text>
            <View style={styles.loginStreakRow}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={[styles.streakText, { color: '#FF6B35' }]}>{profile.loginStreak} day streak</Text>
            </View>
          </View>
          <RankBadge rank={profile.rank} size="md" showLabel={false} />
        </View>

        {/* ── Avatar picker (expanded when editing) ── */}
        {avatarEditing && (
          <View style={[styles.section, { borderColor: tempColor + '55', backgroundColor: tempColor + '08' }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>CUSTOMIZE AVATAR</Text>
            </View>

            {/* Emoji row */}
            <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>PICK YOUR ICON</Text>
            <View style={styles.emojiGrid}>
              {AVATAR_EMOJIS.map(e => (
                <Pressable key={e} onPress={() => setTempEmoji(e)}
                  style={[styles.emojiBtn, tempEmoji === e && { borderColor: tempColor, backgroundColor: tempColor + '22', transform: [{ scale: 1.15 }] }]}>
                  <Text style={styles.emojiBtnText}>{e}</Text>
                </Pressable>
              ))}
            </View>

            {/* Color row */}
            <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>PICK YOUR COLOR</Text>
            <View style={styles.colorGrid}>
              {AVATAR_COLORS.map(c => (
                <Pressable key={c} onPress={() => setTempColor(c)}
                  style={[styles.colorDot, { backgroundColor: c, borderColor: tempColor === c ? '#FFFFFF' : 'transparent', transform: [{ scale: tempColor === c ? 1.25 : 1 }] }]}>
                  {tempColor === c && <Feather name="check" size={10} color="#000" />}
                </Pressable>
              ))}
            </View>

            {/* Preview */}
            <View style={styles.avatarPreview}>
              <View style={[styles.previewCircle, { borderColor: tempColor, backgroundColor: tempColor + '33' }]}>
                <Text style={styles.previewEmoji}>{tempEmoji}</Text>
              </View>
              <Text style={[styles.previewName, { color: tempColor }]}>{profile.name}</Text>
            </View>

            <View style={styles.row}>
              <Pressable onPress={handleSaveAvatar} style={[styles.saveBtn, { backgroundColor: colors.primary, flex: 1 }]}>
                <Text style={[styles.saveBtnText, { color: colors.background }]}>SAVE</Text>
              </Pressable>
              <Pressable onPress={() => setAvatarEditing(false)} style={[styles.cancelBtn, { borderColor: colors.border, flex: 1 }]}>
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>CANCEL</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── XP bar ── */}
        <View style={[styles.xpSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.xpHeader}>
            <Text style={[styles.xpTitle, { color: colors.foreground }]}>{profile.rank}</Text>
            <Text style={[styles.xpTotal, { color: colors.mutedForeground }]}>{profile.xp} XP total</Text>
            {rankInfo.next && (
              <Text style={[styles.xpRemaining, { color: rankData.color }]}>{rankInfo.remaining} to {rankInfo.next}</Text>
            )}
          </View>
          <View style={[styles.xpTrack, { backgroundColor: colors.muted }]}>
            <View style={[styles.xpFill, { width: `${rankInfo.progress * 100}%` as never, backgroundColor: rankData.color }]} />
          </View>
        </View>

        {/* ── Share stats card ── */}
        <Pressable onPress={handleShare} style={[styles.shareCard, { borderColor: '#00BFFF44', backgroundColor: '#00BFFF08' }]}>
          <View style={styles.shareLeft}>
            <Feather name="share-2" size={22} color="#00BFFF" />
            <View>
              <Text style={styles.shareTitle}>SHARE YOUR RANK</Text>
              <Text style={[styles.shareSub, { color: colors.mutedForeground }]}>Show off your stats to friends</Text>
            </View>
          </View>
          <View style={styles.shareMiniCard}>
            <Text style={[styles.shareMiniRank, { color: rankData.color }]}>{profile.rank}</Text>
            <Text style={[styles.shareMiniWins, { color: colors.mutedForeground }]}>{profile.wins}W</Text>
          </View>
        </Pressable>

        {/* ── Challenge code ── */}
        <View style={[styles.codeSection, { backgroundColor: '#BF5FFF11', borderColor: '#BF5FFF33' }]}>
          <Feather name="zap" size={14} color="#BF5FFF" />
          <View style={{ flex: 1 }}>
            <Text style={styles.codeLabel}>YOUR CHALLENGE CODE</Text>
            <Text style={styles.codeSub}>Share with friends so they can find and challenge you!</Text>
          </View>
          <Pressable
            onPress={handleShare}
            style={styles.codeBox}
          >
            <Text style={styles.codeText}>{code}</Text>
            <Feather name="share" size={12} color="#BF5FFF" />
          </Pressable>
        </View>

        {/* ── Stats grid ── */}
        <View style={styles.statsGrid}>
          {[
            { label: 'WINS',        value: String(profile.wins),             icon: 'award',   color: '#FFD700' },
            { label: 'LOSSES',      value: String(profile.losses),           icon: 'x-circle',color: '#FF4757' },
            { label: 'WIN RATE',    value: `${winRate}%`,                    icon: 'percent', color: '#00FF88' },
            { label: 'BEST STREAK', value: String(profile.bestStreak),       icon: 'zap',     color: '#FF6B35' },
            { label: 'DEFLECTIONS', value: String(profile.totalDeflections), icon: 'shield',  color: '#00BFFF' },
            { label: 'GAMES',       value: String(profile.totalGames),       icon: 'grid',    color: '#9B59B6' },
          ].map(stat => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name={stat.icon as never} size={18} color={stat.color} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Achievements ── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>ACHIEVEMENTS</Text>
            <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
              {profile.achievements.length}/{ACHIEVEMENTS.length}
            </Text>
          </View>
          <View style={styles.achieveGrid}>
            {ACHIEVEMENTS.map(ach => {
              const unlocked = profile.achievements.includes(ach.id);
              return (
                <View key={ach.id} style={[styles.achCard, {
                  backgroundColor: unlocked ? '#FFD70022' : colors.card,
                  borderColor:     unlocked ? '#FFD70055' : colors.border,
                  opacity:         unlocked ? 1 : 0.45,
                }]}>
                  <Feather name="award" size={18} color={unlocked ? '#FFD700' : colors.mutedForeground} />
                  <Text style={[styles.achName, { color: unlocked ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>{ach.name}</Text>
                  <Text style={[styles.achDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{ach.desc}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Match history ── */}
        {profile.matchHistory.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>RECENT MATCHES</Text>
            <View style={styles.historyList}>
              {profile.matchHistory.slice(0, 8).map(match => (
                <View key={match.id} style={[styles.historyRow, { backgroundColor: colors.card, borderColor: match.won ? '#00FF8822' : colors.border }]}>
                  <View style={[styles.histResult, { backgroundColor: match.won ? '#00FF8833' : '#FF475733' }]}>
                    <Text style={[styles.histResultText, { color: match.won ? '#00FF88' : '#FF4757' }]}>
                      {match.won ? 'W' : 'L'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.histMain, { color: colors.foreground }]}>
                      {match.won ? 'Victory' : `${match.position === 2 ? '2nd' : match.position === 3 ? '3rd' : '4th'} Place`}
                    </Text>
                    <Text style={[styles.histSub, { color: colors.mutedForeground }]}>
                      {match.deflections} deflections · {match.goalsAgainst} goals against
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={[styles.histXP, { color: rankData.color }]}>+{match.xpEarned} XP</Text>
                    <Text style={[styles.histTime, { color: colors.mutedForeground }]}>
                      {new Date(match.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Sign out ── */}
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Feather name="log-out" size={16} color="#FF475788" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          GoldRush Arena · Account saved on this device
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  profileCard:    { borderRadius: 18, borderWidth: 1.5, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden' },
  bigAvatar:      { width: 68, height: 68, borderRadius: 34, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  bigAvatarEmoji: { fontSize: 32 },
  editBadge:      { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFD700', alignItems: 'center', justifyContent: 'center' },
  profileInfo:    { flex: 1, gap: 4 },
  profileName:    { fontFamily: 'Inter_700Bold', fontSize: 20 },
  levelBadge:     { fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 0.5 },
  loginStreakRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakIcon:     { fontSize: 11 },
  streakText:     { fontFamily: 'Inter_600SemiBold', fontSize: 11 },

  // Avatar editor
  section:      { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle:  { fontFamily: 'Inter_700Bold', fontSize: 14, letterSpacing: 1, flex: 1 },
  sectionCount:  { fontFamily: 'Inter_500Medium', fontSize: 12 },
  pickerLabel:   { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.5 },
  emojiGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn:      { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#FFFFFF18', backgroundColor: '#FFFFFF08', alignItems: 'center', justifyContent: 'center' },
  emojiBtnText:  { fontSize: 22 },
  colorGrid:     { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot:      { width: 32, height: 32, borderRadius: 16, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  avatarPreview: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF08', borderRadius: 12, padding: 12 },
  previewCircle: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  previewEmoji:  { fontSize: 26 },
  previewName:   { fontFamily: 'Inter_700Bold', fontSize: 17 },
  row:           { flexDirection: 'row', gap: 8 },
  saveBtn:       { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  saveBtnText:   { fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 0.5 },
  cancelBtn:     { borderRadius: 10, borderWidth: 1, paddingVertical: 11, alignItems: 'center' },
  cancelBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },

  // XP
  xpSection: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  xpHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  xpTitle:   { fontFamily: 'Inter_700Bold', fontSize: 14, flex: 1 },
  xpTotal:   { fontFamily: 'Inter_400Regular', fontSize: 11 },
  xpRemaining: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  xpTrack:   { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpFill:    { height: '100%', borderRadius: 4 },

  // Share card
  shareCard:  { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  shareTitle: { color: '#00BFFF', fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1 },
  shareSub:   { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  shareMiniCard: { backgroundColor: '#00BFFF11', borderRadius: 10, padding: 10, alignItems: 'center', gap: 2 },
  shareMiniRank: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  shareMiniWins: { fontFamily: 'Inter_500Medium', fontSize: 10 },

  // Challenge code
  codeSection: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeLabel:   { color: '#BF5FFF', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5 },
  codeSub:     { color: '#FFFFFF66', fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  codeBox:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#BF5FFF22', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#BF5FFF44' },
  codeText:    { color: '#BF5FFF', fontFamily: 'Inter_700Bold', fontSize: 14, letterSpacing: 3 },

  // Stats
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard:   { width: '30%', flex: 1, minWidth: 90, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  statValue:  { fontFamily: 'Inter_700Bold', fontSize: 20 },
  statLabel:  { fontFamily: 'Inter_500Medium', fontSize: 9, letterSpacing: 1, textAlign: 'center' },

  // Achievements
  sectionWrap: { gap: 10 },
  achieveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achCard:     { width: '47%', flex: 1, minWidth: 140, borderRadius: 12, borderWidth: 1, padding: 10, gap: 4 },
  achName:     { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  achDesc:     { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14 },

  // History
  historyList: { gap: 6 },
  historyRow:  { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, padding: 10, gap: 10 },
  histResult:  { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  histResultText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  histMain:    { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  histSub:     { fontFamily: 'Inter_400Regular', fontSize: 11 },
  histXP:      { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  histTime:    { fontFamily: 'Inter_400Regular', fontSize: 10 },

  // Logout
  logoutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FF475722', backgroundColor: '#FF475708' },
  logoutText: { color: '#FF475788', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  footer:     { fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center' },
});
