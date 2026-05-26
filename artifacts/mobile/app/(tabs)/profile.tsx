import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RankBadge } from '@/components/RankBadge';
import { ACHIEVEMENTS, RANKS, usePlayer, xpForNextRank, xpToLevel } from '@/context/PlayerContext';
import { useColors } from '@/hooks/useColors';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateName } = usePlayer();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);

  const rankInfo = xpForNextRank(profile.xp);
  const rankData = RANKS.find(r => r.name === profile.rank) ?? RANKS[0];
  const currentSkinDef = { color: '#FFD700' };
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  function saveName() {
    if (nameInput.trim().length < 2) {
      Alert.alert('Name too short', 'Name must be at least 2 characters.');
      return;
    }
    updateName(nameInput.trim());
    setEditing(false);
  }

  const winRate = profile.totalGames > 0 ? Math.round((profile.wins / profile.totalGames) * 100) : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#080814', '#0C0C22']} style={StyleSheet.absoluteFill} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: insets.bottom + 80, paddingHorizontal: 20, gap: 16 }}
      >
        {/* Profile card */}
        <View style={[styles.profileCard, { borderColor: rankData.color + '44' }]}>
          <LinearGradient colors={[rankData.color + '1A', rankData.color + '08']} style={StyleSheet.absoluteFill} />
          <View style={[styles.bigAvatar, { borderColor: rankData.color, backgroundColor: rankData.color + '22' }]}>
            <Text style={[styles.bigAvatarText, { color: rankData.color }]}>
              {profile.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            {editing ? (
              <View style={styles.editRow}>
                <TextInput
                  style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                  value={nameInput}
                  onChangeText={setNameInput}
                  maxLength={16}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveName}
                />
                <Pressable onPress={saveName} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                  <Feather name="check" size={16} color={colors.background} />
                </Pressable>
                <Pressable onPress={() => setEditing(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.nameRow}>
                <Text style={[styles.profileName, { color: colors.foreground }]}>{profile.name}</Text>
                <Pressable onPress={() => { setNameInput(profile.name); setEditing(true); }}>
                  <Feather name="edit-2" size={14} color={colors.mutedForeground} />
                </Pressable>
              </View>
            )}
            <Text style={[styles.levelBadge, { color: rankData.color }]}>
              Level {xpToLevel(profile.xp)} · {profile.rank}
            </Text>
          </View>
          <RankBadge rank={profile.rank} size="md" showLabel={false} />
        </View>

        {/* XP bar */}
        <View style={[styles.xpSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.xpHeader}>
            <Text style={[styles.xpTitle, { color: colors.foreground }]}>{profile.rank}</Text>
            <Text style={[styles.xpTotal, { color: colors.mutedForeground }]}>{profile.xp} XP total</Text>
            {rankInfo.next && (
              <Text style={[styles.xpRemaining, { color: rankData.color }]}>
                {rankInfo.remaining} to {rankInfo.next}
              </Text>
            )}
          </View>
          <View style={[styles.xpTrack, { backgroundColor: colors.muted }]}>
            <View style={[styles.xpFill, { width: `${rankInfo.progress * 100}%` as never, backgroundColor: rankData.color }]} />
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {[
            { label: 'WINS', value: String(profile.wins), icon: 'award', color: '#FFD700' },
            { label: 'LOSSES', value: String(profile.losses), icon: 'x-circle', color: '#FF4757' },
            { label: 'WIN RATE', value: `${winRate}%`, icon: 'percent', color: '#00FF88' },
            { label: 'BEST STREAK', value: String(profile.bestStreak), icon: 'zap', color: '#FF6B35' },
            { label: 'DEFLECTIONS', value: String(profile.totalDeflections), icon: 'shield', color: '#00BFFF' },
            { label: 'GAMES', value: String(profile.totalGames), icon: 'grid', color: '#9B59B6' },
          ].map(stat => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name={stat.icon as never} size={18} color={stat.color} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Achievements */}
        <View style={styles.section}>
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
                  borderColor: unlocked ? '#FFD70055' : colors.border,
                  opacity: unlocked ? 1 : 0.45,
                }]}>
                  <Feather name="award" size={18} color={unlocked ? '#FFD700' : colors.mutedForeground} />
                  <Text style={[styles.achName, { color: unlocked ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
                    {ach.name}
                  </Text>
                  <Text style={[styles.achDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {ach.desc}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Match history */}
        {profile.matchHistory.length > 0 && (
          <View style={styles.section}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  profileCard: { borderRadius: 18, borderWidth: 1.5, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden' },
  bigAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  bigAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  profileInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileName: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  levelBadge: { fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 0.5 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameInput: { flex: 1, height: 36, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  saveBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  xpSection: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  xpHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  xpTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, flex: 1 },
  xpTotal: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  xpRemaining: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  xpTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '30%', flex: 1, minWidth: 90, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 9, letterSpacing: 1, textAlign: 'center' },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, letterSpacing: 1, flex: 1 },
  sectionCount: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  achieveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achCard: { width: '47%', flex: 1, minWidth: 140, borderRadius: 12, borderWidth: 1, padding: 10, gap: 4 },
  achName: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  achDesc: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14 },
  historyList: { gap: 6 },
  historyRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, padding: 10, gap: 10 },
  histResult: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  histResultText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  histMain: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  histSub: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  histXP: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  histTime: { fontFamily: 'Inter_400Regular', fontSize: 10 },
});
