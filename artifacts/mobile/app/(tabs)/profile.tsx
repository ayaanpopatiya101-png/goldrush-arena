import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RankBadge } from '@/components/RankBadge';
import {
  ACHIEVEMENTS, AVATAR_COLORS, AVATAR_EMOJIS, RANKS, SKINS,
  getChallengeCode, usePlayer, xpForNextRank, xpToLevel,
} from '@/context/PlayerContext';

// ─── Stat tile ─────────────────────────────────────────────────────────────────
function StatTile({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1,    duration: 1800, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <View style={[ST.tile, { borderColor: color + '44', shadowColor: color }]}>
      <LinearGradient colors={[color + '22', color + '08']} style={StyleSheet.absoluteFill} />
      <Text style={{ fontSize: 24 }}>{icon}</Text>
      <Animated.Text style={[ST.val, { color, transform: [{ scale: anim }] }]}>{value}</Animated.Text>
      <Text style={ST.lbl}>{label}</Text>
    </View>
  );
}

const ST = StyleSheet.create({
  tile: {
    flex: 1, borderRadius: 18, borderWidth: 1.5, padding: 14,
    alignItems: 'center', gap: 4, overflow: 'hidden',
    shadowRadius: 10, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 0 },
  },
  val:  { fontFamily: 'Inter_900Black', fontSize: 22 },
  lbl:  { fontFamily: 'Inter_600SemiBold', fontSize: 8, letterSpacing: 1.5, color: '#FFFFFF44' },
});

// ─── Achievement badge ──────────────────────────────────────────────────────────
const ACH_ICONS: Record<string, string> = {
  first_win: '🏆', hat_trick: '🎩', survivor: '❤️', streak3: '🔥', streak5: '⚡',
  level10: '⭐', level25: '💎', collector: '🎨', gold_rank: '🥇', century: '💯',
  deflect100: '🛡️', powerup10: '💊',
};

function AchBadge({ id, unlocked }: { id: string; unlocked: boolean }) {
  const ach = ACHIEVEMENTS.find(a => a.id === id) ?? ACHIEVEMENTS[0];
  return (
    <View style={[AB.badge, !unlocked && AB.locked]}>
      <Text style={{ fontSize: unlocked ? 22 : 18, opacity: unlocked ? 1 : 0.3 }}>{ACH_ICONS[ach.id] ?? '🎖️'}</Text>
      {unlocked && (
        <View style={AB.dot} />
      )}
    </View>
  );
}

const AB = StyleSheet.create({
  badge: {
    width: 48, height: 48, borderRadius: 14, borderWidth: 1.5,
    borderColor: '#C8820A55', backgroundColor: '#C8820A22',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#C8820A', shadowRadius: 8, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 0 },
  },
  locked: { borderColor: '#FFFFFF15', backgroundColor: '#FFFFFF08', shadowOpacity: 0 },
  dot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#00FF88',
  },
});

// ─── Profile screen ──────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, logout, setAvatar } = usePlayer();

  const [avatarEditing, setAvatarEditing] = useState(false);
  const [tempEmoji, setTempEmoji] = useState(profile.avatarEmoji);
  const [tempColor, setTempColor] = useState(profile.avatarFrameColor);

  const rankInfo = xpForNextRank(profile.xp);
  const rankData = RANKS.find(r => r.name === profile.rank) ?? RANKS[0];
  const topPad   = Platform.OS === 'web' ? Math.max(insets.top, 56) : insets.top;
  const winRate  = profile.totalGames > 0 ? Math.round((profile.wins / profile.totalGames) * 100) : 0;
  const code     = getChallengeCode(profile.name);

  const xpAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(xpAnim, { toValue: rankInfo.progress, duration: 1400, useNativeDriver: false }).start();
  }, [rankInfo.progress]);

  async function handleSaveAvatar() { await setAvatar(tempEmoji, tempColor); setAvatarEditing(false); }
  async function handleShare() {
    try {
      await Share.share({ message: `🏆 ${profile.name} · ${profile.rank} · ${profile.wins} Wins · ${winRate}% WR\n🎮 Challenge Code: ${code}` });
    } catch { /* dismissed */ }
  }
  function handleLogout() {
    if (Platform.OS === 'web') { if (window.confirm('Sign out?')) logout(); return; }
    Alert.alert('Sign Out', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign Out', style: 'destructive', onPress: logout }]);
  }

  const xpBarW = xpAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const equippedSkin = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0];

  return (
    <View style={{ flex: 1, backgroundColor: '#07051A' }}>
      <LinearGradient colors={['#0E0B22', '#07051A']} style={StyleSheet.absoluteFill} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>

        {/* ── Hero Banner ── */}
        <LinearGradient
          colors={[rankData.color + '55', rankData.color + '22', '#07051A']}
          style={[P.heroBanner, { paddingTop: topPad + 10 }]}
        >
          {/* Background pattern */}
          {[...Array(5)].map((_, i) => (
            <View key={i} style={[P.heroDot, {
              width: 40 + i * 20, height: 40 + i * 20, borderRadius: 20 + i * 10,
              borderColor: rankData.color + '22',
              left: '50%', top: -10 + i * 5,
            }]} />
          ))}

          {/* Avatar */}
          <Pressable onPress={() => { setTempEmoji(profile.avatarEmoji); setTempColor(profile.avatarFrameColor); setAvatarEditing(true); }}>
            <View style={[P.avatarRing, { borderColor: profile.avatarFrameColor, shadowColor: profile.avatarFrameColor }]}>
              <Text style={P.avatarEmoji}>{profile.avatarEmoji}</Text>
            </View>
            <View style={P.editBadge}>
              <Feather name="edit-2" size={10} color="#FFF" />
            </View>
          </Pressable>

          <Text style={P.playerName}>{profile.name}</Text>
          <View style={P.rankRow}>
            <RankBadge rank={profile.rank} size="md" showLabel />
            <View style={[P.levelBadge, { backgroundColor: rankData.color + '33', borderColor: rankData.color + '88' }]}>
              <Text style={[P.levelTxt, { color: rankData.color }]}>LV {xpToLevel(profile.xp)}</Text>
            </View>
          </View>

          {/* XP bar */}
          <View style={P.xpSection}>
            <View style={P.xpBarBg}>
              <Animated.View style={[P.xpBarFill, { width: xpBarW as never, backgroundColor: rankData.color }]} />
            </View>
            <Text style={P.xpLabel}>
              {profile.xp.toLocaleString()} XP{rankInfo.next ? ` · ${rankInfo.remaining.toLocaleString()} to ${rankInfo.next}` : ' · MAX RANK'}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={P.actionRow}>
            <Pressable onPress={handleShare} style={P.actionBtn}>
              <Feather name="share-2" size={14} color="#FFFFFF88" />
              <Text style={P.actionTxt}>SHARE CARD</Text>
            </Pressable>
            <View style={[P.codeChip, { borderColor: rankData.color + '66' }]}>
              <Text style={P.codeTxt}>#{code}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 16, gap: 16 }}>
          {/* ── Stats ── */}
          <View>
            <Text style={P.sectionTitle}>📊 STATS</Text>
            <View style={P.statsGrid}>
              <StatTile icon="🏆" value={String(profile.wins)}      label="WINS"      color="#FFD700" />
              <StatTile icon="📈" value={`${winRate}%`}             label="WIN RATE"  color="#00FF88" />
            </View>
            <View style={[P.statsGrid, { marginTop: 10 }]}>
              <StatTile icon="🔥" value={String(profile.bestStreak)} label="BEST STREAK" color="#FF4757" />
              <StatTile icon="🎮" value={String(profile.totalGames)} label="TOTAL GAMES" color="#00E5FF" />
            </View>
          </View>

          {/* ── Equipped loadout ── */}
          <View>
            <Text style={P.sectionTitle}>⚔️ LOADOUT</Text>
            <View style={P.loadoutRow}>
              <View style={[P.loadoutCard, { borderColor: equippedSkin.color + '66' }]}>
                <LinearGradient colors={[equippedSkin.color + '33', equippedSkin.color + '11']} style={StyleSheet.absoluteFill} />
                <Text style={{ fontSize: 28 }}>🎨</Text>
                <Text style={[P.loadoutName, { color: equippedSkin.color }]}>{equippedSkin.name}</Text>
                <Text style={P.loadoutLabel}>SKIN</Text>
              </View>
              {profile.currentRelic !== 'none' && (
                <View style={[P.loadoutCard, { borderColor: '#C8820A66' }]}>
                  <LinearGradient colors={['#C8820A33', '#C8820A11']} style={StyleSheet.absoluteFill} />
                  <Text style={{ fontSize: 28 }}>⚡</Text>
                  <Text style={[P.loadoutName, { color: '#FFD700' }]}>{profile.currentRelic}</Text>
                  <Text style={P.loadoutLabel}>RELIC</Text>
                </View>
              )}
              <View style={[P.loadoutCard, { borderColor: '#BF5FFF66' }]}>
                <LinearGradient colors={['#BF5FFF33', '#BF5FFF11']} style={StyleSheet.absoluteFill} />
                <Text style={{ fontSize: 28 }}>
                  {(profile.selectedSuper ?? 1) === 1 ? '⚔️' : (profile.selectedSuper ?? 1) === 2 ? '🌀' : '💥'}
                </Text>
                <Text style={[P.loadoutName, { color: '#BF5FFF' }]}>
                  {(profile.selectedSuper ?? 1) === 1 ? 'IRON WALL' : (profile.selectedSuper ?? 1) === 2 ? 'SLOW FIELD' : 'BANISH'}
                </Text>
                <Text style={P.loadoutLabel}>SUPER</Text>
              </View>
            </View>
          </View>

          {/* ── Achievements ── */}
          <View>
            <View style={P.rowHeader}>
              <Text style={P.sectionTitle}>🏅 ACHIEVEMENTS</Text>
              <View style={P.countBadge}>
                <Text style={P.countTxt}>{profile.achievements.length}/{ACHIEVEMENTS.length}</Text>
              </View>
            </View>
            <View style={P.achGrid}>
              {ACHIEVEMENTS.map(a => (
                <AchBadge key={a.id} id={a.id} unlocked={profile.achievements.includes(a.id)} />
              ))}
            </View>
          </View>

          {/* ── Match history ── */}
          {profile.matchHistory.length > 0 && (
            <View>
              <Text style={P.sectionTitle}>📋 RECENT MATCHES</Text>
              {profile.matchHistory.slice(0, 5).map((m, i) => (
                <View key={i} style={[P.matchRow, { borderLeftColor: m.won ? '#00FF88' : '#FF4757' }]}>
                  <Text style={[P.matchResult, { color: m.won ? '#00FF88' : '#FF4757' }]}>
                    {m.won ? '🏆 WIN' : '💀 OUT'}
                  </Text>
                  <Text style={P.matchXp}>+{m.xpEarned} XP</Text>
                  <Text style={P.matchCoins}>+{m.coinsEarned} 🪙</Text>
                  <Text style={P.matchTime}>{new Date(m.timestamp).toLocaleDateString()}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Login streak ── */}
          <View style={P.streakCard}>
            <LinearGradient colors={['#1A1208', '#0E0A04']} style={StyleSheet.absoluteFill} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Text style={{ fontSize: 28 }}>{profile.loginStreak >= 7 ? '💎' : '🔥'}</Text>
              <View>
                <Text style={P.streakTitle}>LOGIN STREAK</Text>
                <Text style={P.streakDay}>Day {profile.loginStreak || 1}</Text>
              </View>
            </View>
            <View style={P.streakDots}>
              {[...Array(7)].map((_, i) => (
                <View key={i} style={[P.streakDot, {
                  backgroundColor: i < Math.min(profile.loginStreak, 7) ? '#C8820A' : '#FFFFFF15',
                  shadowColor: '#C8820A', shadowOpacity: i < Math.min(profile.loginStreak, 7) ? 0.8 : 0,
                  shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
                }]} />
              ))}
            </View>
          </View>

          {/* ── Sign out ── */}
          <Pressable onPress={handleLogout} style={({ pressed }) => [P.logoutBtn, pressed && { opacity: 0.7 }]}>
            <Feather name="log-out" size={16} color="#FF4757" />
            <Text style={P.logoutTxt}>SIGN OUT</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ── Avatar editor modal ── */}
      {avatarEditing && (
        <View style={P.modal}>
          <LinearGradient colors={['#1A1630', '#0E0B22']} style={P.modalBox}>
            <Text style={P.modalTitle}>CUSTOMIZE AVATAR</Text>
            <View style={[P.modalPreview, { borderColor: tempColor }]}>
              <Text style={{ fontSize: 42 }}>{tempEmoji}</Text>
            </View>
            <Text style={P.modalSubtitle}>EMOJI</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
              {AVATAR_EMOJIS.map(e => (
                <Pressable key={e} onPress={() => setTempEmoji(e)}
                  style={[P.emojiPick, tempEmoji === e && { backgroundColor: '#E5A02044', borderColor: '#E5A020' }]}>
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={[P.modalSubtitle, { marginTop: 12 }]}>FRAME COLOR</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingHorizontal: 4 }}>
              {AVATAR_COLORS.map(c => (
                <Pressable key={c} onPress={() => setTempColor(c)}
                  style={[P.colorPick, { backgroundColor: c }, tempColor === c && P.colorPickActive]} />
              ))}
            </View>
            <View style={P.modalBtns}>
              <Pressable onPress={() => setAvatarEditing(false)} style={P.cancelBtn}>
                <Text style={P.cancelTxt}>CANCEL</Text>
              </Pressable>
              <Pressable onPress={handleSaveAvatar} style={P.saveBtn}>
                <Text style={P.saveTxt}>SAVE ✓</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const P = StyleSheet.create({
  heroBanner: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 24, gap: 10, overflow: 'hidden', position: 'relative' },
  heroDot: { position: 'absolute', borderWidth: 1, aspectRatio: 1 },
  avatarRing: {
    width: 90, height: 90, borderRadius: 45, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF0A',
    shadowRadius: 20, shadowOpacity: 0.7, shadowOffset: { width: 0, height: 0 },
    zIndex: 1,
  },
  avatarEmoji: { fontSize: 48 },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#E5A020',
    alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  playerName: { fontFamily: 'Inter_900Black', fontSize: 24, color: '#FFFFFF', letterSpacing: 0.5 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelBadge: {
    borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 4,
  },
  levelTxt: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  xpSection: { width: '100%', gap: 4 },
  xpBarBg: { height: 8, borderRadius: 4, backgroundColor: '#FFFFFF18', overflow: 'hidden' },
  xpBarFill: { height: 8, borderRadius: 4 },
  xpLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: '#FFFFFF55', textAlign: 'center' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF0E', borderWidth: 1, borderColor: '#FFFFFF22',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  actionTxt: { color: '#FFFFFF88', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 0.5 },
  codeChip: {
    backgroundColor: '#FFFFFF0A', borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  codeTxt: { color: '#FFD700', fontFamily: 'Inter_700Bold', fontSize: 12 },

  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#FFFFFF55', letterSpacing: 2, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', gap: 10 },

  loadoutRow: { flexDirection: 'row', gap: 10 },
  loadoutCard: {
    flex: 1, borderRadius: 16, borderWidth: 1.5, padding: 12,
    alignItems: 'center', gap: 4, overflow: 'hidden', backgroundColor: '#FFFFFF05',
  },
  loadoutName: { fontFamily: 'Inter_700Bold', fontSize: 9, textAlign: 'center' },
  loadoutLabel: { fontFamily: 'Inter_500Medium', fontSize: 7, color: '#FFFFFF44', letterSpacing: 1 },

  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  countBadge: {
    backgroundColor: '#E5A02022', borderWidth: 1, borderColor: '#E5A02055',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  countTxt: { color: '#E5A020', fontFamily: 'Inter_700Bold', fontSize: 10 },
  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  matchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#FFFFFF08',
  },
  matchResult: { fontFamily: 'Inter_700Bold', fontSize: 11, width: 60 },
  matchXp:    { color: '#00E5FF', fontFamily: 'Inter_600SemiBold', fontSize: 10, flex: 1 },
  matchCoins: { color: '#FFD700', fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  matchTime:  { color: '#FFFFFF33', fontFamily: 'Inter_400Regular', fontSize: 9 },

  streakCard: {
    borderRadius: 18, borderWidth: 1.5, borderColor: '#C8820A33', padding: 14, overflow: 'hidden',
  },
  streakTitle: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#C8820A', letterSpacing: 2 },
  streakDay: { fontFamily: 'Inter_900Black', fontSize: 20, color: '#FFD700' },
  streakDots: { flexDirection: 'row', gap: 8 },
  streakDot: { width: 28, height: 28, borderRadius: 8 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FF475533', borderRadius: 14, padding: 14,
    backgroundColor: '#FF475511',
  },
  logoutTxt: { color: '#FF4757', fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1 },

  modal: {
    position: 'absolute', inset: 0, backgroundColor: '#00000088',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalBox: {
    width: '100%', borderRadius: 24, borderWidth: 1.5, borderColor: '#E5A02044',
    padding: 20, gap: 10,
  },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#FFD700', letterSpacing: 2, textAlign: 'center' },
  modalPreview: {
    width: 70, height: 70, borderRadius: 35, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF0A', alignSelf: 'center',
  },
  modalSubtitle: { fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#FFFFFF55', letterSpacing: 1.5 },
  emojiPick: {
    width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: '#FFFFFF22',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF06',
  },
  colorPick: { width: 32, height: 32, borderRadius: 8, borderWidth: 1.5, borderColor: '#FFFFFF22' },
  colorPickActive: { borderColor: '#FFFFFF', borderWidth: 2.5 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#FFFFFF0A',
    borderWidth: 1, borderColor: '#FFFFFF22', alignItems: 'center',
  },
  cancelTxt: { color: '#FFFFFF66', fontFamily: 'Inter_700Bold', fontSize: 11 },
  saveBtn: {
    flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#E5A02033',
    borderWidth: 1.5, borderColor: '#E5A020', alignItems: 'center',
  },
  saveTxt: { color: '#FFD700', fontFamily: 'Inter_700Bold', fontSize: 11 },
});
