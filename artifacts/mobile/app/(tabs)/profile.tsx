import { Feather } from '@expo/vector-icons';
import { LinearGradient } from '@/components/ui/Flat';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useFocusAnimation } from '@/hooks/useFocusAnimation';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RankBadge } from '@/components/RankBadge';
import { FloatingOrbs, GlowBorder, GlowText, PulseRing, ShimmerCard } from '@/components/effects';
import {
  ACHIEVEMENTS, AVATAR_COLORS, AVATAR_EMOJIS, RANKS, SKINS,
  getChallengeCode, getRankIndex, usePlayer, xpForNextRank, xpToLevel,
} from '@/context/PlayerContext';
import { apiUrl } from '@/utils/api';
import { useColors } from '@/hooks/useColors';
import { Glyph } from '@/components/ui/Glyph';
import { staticLoop } from '@/components/ui/motion';

// ─── AI-generated achievement artwork, replaces generic award icon ──────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ACH_IMAGE: Partial<Record<string, number>> = {
  first_win:  require('../../assets/images/ach_first_win.png'),
  hat_trick:  require('../../assets/images/ach_hat_trick.png'),
  survivor:   require('../../assets/images/ach_survivor.png'),
  streak3:    require('../../assets/images/ach_streak3.png'),
  streak5:    require('../../assets/images/ach_streak5.png'),
  level10:    require('../../assets/images/ach_level10.png'),
  level25:    require('../../assets/images/ach_level25.png'),
  collector:  require('../../assets/images/ach_collector.png'),
  gold_rank:  require('../../assets/images/ach_gold_rank.png'),
  century:    require('../../assets/images/ach_century.png'),
  deflect100: require('../../assets/images/ach_deflect100.png'),
  powerup10:  require('../../assets/images/ach_powerup10.png'),
};

export default function ProfileScreen() {
  const colors    = useColors();
  const insets    = useSafeAreaInsets();
  const {
    profile, logout, setAvatar, claimReferralReward,
  } = usePlayer();

  // ── Referral system state ──
  const [myReferralCode,   setMyReferralCode]   = useState<string | null>(null);
  const [pendingReferrals, setPendingReferrals] = useState(0);
  const [referralInput,    setReferralInput]    = useState('');
  const [referralStatus,   setReferralStatus]   = useState<string | null>(null);
  const [loadingReferral,  setLoadingReferral]  = useState(false);
  const referralPlayerId = profile.name; // stable ID per player

  useEffect(() => {
    // Fetch / generate this player's referral code
    fetch(apiUrl(`/referral/code/${encodeURIComponent(referralPlayerId)}`))
      .then(r => r.json())
      .then((d: { code?: string }) => { if (d.code) setMyReferralCode(d.code); })
      .catch(() => {});
    // Check for pending rewards
    fetch(apiUrl(`/referral/pending/${encodeURIComponent(referralPlayerId)}`))
      .then(r => r.json())
      .then((d: { pending?: number }) => setPendingReferrals(d.pending ?? 0))
      .catch(() => {});
  }, [referralPlayerId]);

  async function handleRedeemReferral() {
    const code = referralInput.trim().toUpperCase();
    if (code.length < 4) return;
    setLoadingReferral(true);
    setReferralStatus(null);
    try {
      const res = await fetch(apiUrl('/referral/redeem'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redeemerPlayerId: referralPlayerId }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        setReferralStatus('Code applied! Your friend will get their reward.');
        setReferralInput('');
      } else {
        setReferralStatus(`${data.error ?? 'Could not apply code.'}`);
      }
    } catch {
      setReferralStatus('No connection, try again.');
    }
    setLoadingReferral(false);
  }

  async function handleClaimReferralReward() {
    Alert.alert(
      'Referral Reward',
      'A friend joined using your code! Choose your reward:',
      [
        {
          text: '10,000 Coins',
          onPress: async () => {
            try {
              await fetch(apiUrl(`/referral/claim/${encodeURIComponent(referralPlayerId)}`), { method: 'POST' });
              await claimReferralReward('coins');
              setPendingReferrals(p => Math.max(0, p - 1));
            } catch { /* apply locally even if server call fails */ await claimReferralReward('coins'); setPendingReferrals(p => Math.max(0, p - 1)); }
          },
        },
        {
          text: '1 Bank Life',
          onPress: async () => {
            try {
              await fetch(apiUrl(`/referral/claim/${encodeURIComponent(referralPlayerId)}`), { method: 'POST' });
              await claimReferralReward('life');
              setPendingReferrals(p => Math.max(0, p - 1));
            } catch { await claimReferralReward('life'); setPendingReferrals(p => Math.max(0, p - 1)); }
          },
        },
      ]
    );
  }

  const [avatarEditing, setAvatarEditing] = useState(false);
  const [tempEmoji, setTempEmoji]         = useState(profile.avatarEmoji);
  const [tempColor, setTempColor]         = useState(profile.avatarFrameColor);

  const orbitAnim  = useRef(new Animated.Value(0)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const orbit = staticLoop(
      Animated.timing(orbitAnim, { toValue: 1, duration: 5500, easing: Easing.linear, useNativeDriver: true })
    );
    const glow = staticLoop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
    ]));
    orbit.start(); glow.start();
    return () => { orbit.stop(); glow.stop(); };
  }, []);
  const orbitRotate  = orbitAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const orbitRotateR = orbitAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const avatarScale  = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.04] });

  const rankInfo  = xpForNextRank(profile.xp);
  const rankData  = RANKS.find(r => r.name === profile.rank) ?? RANKS[0];
  const topPad    = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const winRate   = profile.totalGames > 0 ? Math.round((profile.wins / profile.totalGames) * 100) : 0;
  const code      = getChallengeCode(profile.name);
  const focusStyle = useFocusAnimation();

  async function handleSaveAvatar() {
    await setAvatar(tempEmoji, tempColor);
    setAvatarEditing(false);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: [
          'GOLDRUSH ARENA RANK CARD',
          '━━━━━━━━━━━━━━━━━━━━',
          `${profile.name}`,
          `${profile.rank} · Level ${xpToLevel(profile.xp)}`,
          `${profile.xp.toLocaleString()} Total XP`,
          `${profile.wins} Wins · ${winRate}% Win Rate`,
          `Best Streak: ${profile.bestStreak}`,
          '━━━━━━━━━━━━━━━━━━━━',
          `Challenge Code: ${code}`,
          'Download GoldRush Arena, Last One Standing Wins!',
        ].join('\n'),
      });
    } catch { /* user dismissed */ }
  }

  function handleLogout() {
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out? You will be returned to the login screen.')) logout();
      return;
    }
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <Reanimated.View style={[styles.root, { backgroundColor: colors.background }, focusStyle]}>
      <FloatingOrbs opacity={0.75} />
      <LinearGradient colors={['#0E2621', '#0E2621', '#0E2621']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['#F0B42926', '#F0B42910', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 440 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', '#0E262188']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 300 }}
        pointerEvents="none"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: insets.bottom + 80, paddingHorizontal: 20, gap: 16 }}
      >
        {/* ── Profile card ── */}
        <View style={[styles.profileCard, { borderColor: rankData.color + '44' }]}>
          {/* Rank-colored top band, the visual signal that this is a player card */}
          <LinearGradient
            colors={[rankData.color + '60', rankData.color + '28', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 100 }}
            pointerEvents="none"
          />
          <LinearGradient colors={[rankData.color + '18', rankData.color + '06']} style={StyleSheet.absoluteFill} />

          {/* Avatar, centered, tappable to edit */}
          <Pressable onPress={() => { setTempEmoji(profile.avatarEmoji); setTempColor(profile.avatarFrameColor); setAvatarEditing(true); }}>
            <Animated.View style={[styles.bigAvatar, {
              borderColor: profile.avatarFrameColor,
              backgroundColor: profile.avatarFrameColor + '33',
              transform: [{ scale: avatarScale }],
              overflow: 'visible',
            }]}>
              <Glyph style={styles.bigAvatarEmoji} value={profile.avatarEmoji} />
              <View style={styles.editBadge}>
                <Feather name="edit-2" size={9} color="#0E2621" />
              </View>
            </Animated.View>
          </Pressable>

          {/* Centered name / rank / streak block */}
          <View style={[styles.profileInfo, { alignItems: 'center' }]}>
            <GlowText intensity="medium" color={rankData.color} style={[styles.profileName, { color: colors.foreground }]}>{profile.name}</GlowText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <RankBadge rank={profile.rank} size="sm" showLabel={false} />
              <GlowText intensity="soft" color={rankData.color} style={[styles.levelBadge, { color: rankData.color }]}>Lv.{xpToLevel(profile.xp)} · {profile.rank}</GlowText>
            </View>
            {/* Skill tier badge */}
            {profile.skillTier && (() => {
              const tierColor = profile.skillTier === 'Pro' ? '#F0B429' : profile.skillTier === 'Veteran' ? '#CFE0D6' : '#F0B429';
              const tierIcon  = profile.skillTier === 'Pro' ? '🏆' : profile.skillTier === 'Veteran' ? '🥈' : '🥉';
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tierColor + '1E', borderRadius: 3, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: tierColor + '44' }}>
                  <Glyph style={{ fontSize: 12 }} value={tierIcon} />
                  <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 10, color: tierColor, letterSpacing: 0.8 }}>{profile.skillTier.toUpperCase()}</Text>
                </View>
              );
            })()}
            <View style={styles.loginStreakRow}>
              <Glyph style={styles.streakIcon} value="🔥" />
              <Text style={[styles.streakText, { color: '#E04A2F' }]}>{profile.loginStreak} day streak</Text>
            </View>
          </View>
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
                  <Glyph style={styles.emojiBtnText} value={e} />
                </Pressable>
              ))}
            </View>

            {/* Color row */}
            <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>PICK YOUR COLOR</Text>
            <View style={styles.colorGrid}>
              {AVATAR_COLORS.map(c => (
                <Pressable key={c} onPress={() => setTempColor(c)}
                  style={[styles.colorDot, { backgroundColor: c, borderColor: tempColor === c ? '#F3EAD3' : 'transparent', transform: [{ scale: tempColor === c ? 1.25 : 1 }] }]}>
                  {tempColor === c && <Feather name="check" size={10} color='#0E2621' />}
                </Pressable>
              ))}
            </View>

            {/* Preview */}
            <View style={styles.avatarPreview}>
              <View style={[styles.previewCircle, { borderColor: tempColor, backgroundColor: tempColor + '33' }]}>
                <Glyph style={styles.previewEmoji} value={tempEmoji} />
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
          <View style={[styles.xpTrack, { backgroundColor: '#F3EAD312' }]}>
            <ShimmerCard active={true} borderRadius={3} duration={2200} shimmerColor="rgba(255,255,255,0.3)" style={[styles.xpFill, { width: `${rankInfo.progress * 100}%` as never, backgroundColor: rankData.color }]}>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: '#F3EAD328', borderRadius: 4 }} />
            </ShimmerCard>
          </View>
        </View>

        {/* ── Share stats card ── */}
        <Pressable onPress={handleShare} style={[styles.shareCard, { borderColor: '#EDE3CC44', backgroundColor: '#EDE3CC08' }]}>
          <View style={styles.shareLeft}>
            <Feather name="share-2" size={22} color="#EDE3CC" />
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
        <View style={[styles.codeSection, { backgroundColor: '#EDE3CC11', borderColor: '#EDE3CC33' }]}>
          <Feather name="zap" size={14} color="#EDE3CC" />
          <View style={{ flex: 1 }}>
            <Text style={styles.codeLabel}>YOUR CHALLENGE CODE</Text>
            <Text style={styles.codeSub}>Share with friends so they can find and challenge you!</Text>
          </View>
          <Pressable
            onPress={handleShare}
            style={styles.codeBox}
          >
            <Text style={styles.codeText}>{code}</Text>
            <Feather name="share" size={12} color="#EDE3CC" />
          </Pressable>
        </View>

        {/* ── Stats grid ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: '#F0B429' }}>STATISTICS</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#F3EAD30E' }} />
        </View>
        <View style={styles.statsGrid}>
          {[
            { label: 'WINS',        value: String(profile.wins),             color: '#F0B429' },
            { label: 'LOSSES',      value: String(profile.losses),           color: '#E04A2F' },
            { label: 'WIN RATE',    value: `${winRate}%`,                    color: '#9CC93E' },
            { label: 'BEST STREAK', value: String(profile.bestStreak),       color: '#E04A2F' },
            { label: 'DEFLECTIONS', value: String(profile.totalDeflections), color: '#EDE3CC' },
            { label: 'GAMES',       value: String(profile.totalGames),       color: '#EDE3CC' },
          ].map(stat => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: stat.color + '0A', borderColor: stat.color + '28', overflow: 'hidden' }]}>
              <Text style={[styles.statValue, { color: '#F3EAD3' }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: stat.color + 'AA' }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Achievements ── */}
        <View style={styles.sectionWrap}>
          <View style={[styles.sectionHeader, { alignItems: 'center' }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>ACHIEVEMENTS</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#F3EAD30E' }} />
            <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
              {profile.achievements.length}/{ACHIEVEMENTS.length}
            </Text>
          </View>
          <View style={styles.achieveGrid}>
            {ACHIEVEMENTS.map(ach => {
              const unlocked = profile.achievements.includes(ach.id);
              return (
                <ShimmerCard key={ach.id} active={unlocked} borderRadius={3} shimmerColor="rgba(200,130,10,0.1)" style={[styles.achCard, {
                  backgroundColor: unlocked ? '#F0B42912' : colors.card,
                  borderColor:     unlocked ? '#F0B42966' : colors.border,
                  opacity:         unlocked ? 1 : 0.42,
                  overflow:        'hidden',
                }]}>
                  {ACH_IMAGE[ach.id] != null
                    ? <Image
                        source={ACH_IMAGE[ach.id]!}
                        style={{ width: unlocked ? 44 : 34, height: unlocked ? 44 : 34, opacity: unlocked ? 1 : 0.3, marginTop: unlocked ? 4 : 2 }}
                        resizeMode="contain"
                      />
                    : <Glyph style={{ fontSize: unlocked ? 26 : 20, opacity: unlocked ? 1 : 0.3, marginTop: unlocked ? 4 : 2 }} value="🏅" />
                  }
                  <Text style={[styles.achName, { color: unlocked ? '#F3EAD3' : colors.mutedForeground }]} numberOfLines={1}>{ach.name}</Text>
                  <Text style={[styles.achDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{ach.desc}</Text>
                </ShimmerCard>
              );
            })}
          </View>
        </View>

        {/* ── Match history ── */}
        {profile.matchHistory.length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>RECENT MATCHES</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#F3EAD30E' }} />
            </View>
            <View style={styles.historyList}>
              {profile.matchHistory.slice(0, 8).map(match => (
                <View key={match.id} style={[styles.historyRow, { backgroundColor: colors.card, borderColor: match.won ? '#9CC93E22' : colors.border }]}>
                  <View style={[styles.histResult, { backgroundColor: match.won ? '#9CC93E33' : '#E04A2F33' }]}>
                    <Text style={[styles.histResultText, { color: match.won ? '#9CC93E' : '#E04A2F' }]}>
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

        {/* ── Lives Bank summary ── */}
        <View style={{ backgroundColor: '#E04A2F10', borderRadius: 3, borderWidth: 1, borderColor: '#E04A2F33', padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: '#E04A2F' }}>LIVES BANK</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {Array.from({ length: Math.min(profile.extraLivesInventory ?? 0, 8) }).map((_, i) => (
                <Glyph key={i} style={{ fontSize: 18 }} value="❤️" />
              ))}
              {(profile.extraLivesInventory ?? 0) > 8 && (
                <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 14, color: '#E04A2F' }}>+{(profile.extraLivesInventory ?? 0) - 8}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 22, color: '#E04A2F' }}>
                {profile.extraLivesInventory ?? 0}
              </Text>
              <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 11, color: '#F3EAD355' }}>
                {getRankIndex(profile.rank) >= 15 ? 'Champion+ · max 2/match' : 'Up to 3 lives per match'}
              </Text>
            </View>
          </View>
          <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 11, color: '#F3EAD344', lineHeight: 17 }}>
            Earn from Dragon Cache / Nexus Core Gold Strikes, Premium Pass milestones, the Shop, or friend referrals.
          </Text>
        </View>

        {/* ── Referral ── */}
        <View style={{ backgroundColor: '#EDE3CC0A', borderRadius: 3, borderWidth: 1, borderColor: '#EDE3CC33', padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: '#EDE3CC' }}>REFER A FRIEND</Text>
          </View>

          {/* Pending reward claim */}
          {pendingReferrals > 0 && (
            <Pressable
              onPress={handleClaimReferralReward}
              style={{ backgroundColor: '#9CC93E18', borderRadius: 3, borderWidth: 1, borderColor: '#9CC93E44', paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Glyph style={{ fontSize: 18 }} value="🎉" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 13, color: '#9CC93E' }}>
                  {pendingReferrals} Friend{pendingReferrals > 1 ? 's' : ''} Joined!
                </Text>
                <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 11, color: '#9CC93E88' }}>Tap to claim your reward</Text>
              </View>
              <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: '#9CC93E' }}>CLAIM →</Text>
            </Pressable>
          )}

          {/* Your referral code */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 10, color: '#F3EAD355', letterSpacing: 1.5 }}>YOUR CODE</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: '#EDE3CC14', borderRadius: 3, borderWidth: 1, borderColor: '#EDE3CC44', paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 20, color: '#EDE3CC', letterSpacing: 4 }}>
                  {myReferralCode ?? '···'}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  if (!myReferralCode) return;
                  Share.share({ message: `Join me on GoldRush Arena! Use my referral code: ${myReferralCode}\nWhen you sign up and enter my code, I get a bonus reward` });
                }}
                style={{ backgroundColor: '#EDE3CC22', borderRadius: 3, borderWidth: 1, borderColor: '#EDE3CC55', padding: 12 }}
              >
                <Glyph style={{ fontSize: 18 }} value="📤" />
              </Pressable>
            </View>
            <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 11, color: '#F3EAD344', lineHeight: 17 }}>
              Share this code with friends. When they enter it after signing up, you'll earn your choice of 10,000 Coins or 1 Bank Life.
            </Text>
          </View>

          {/* Enter a friend's referral code */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 10, color: '#F3EAD355', letterSpacing: 1.5 }}>ENTER A FRIEND'S CODE</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={referralInput}
                onChangeText={v => setReferralInput(v.toUpperCase().slice(0, 8))}
                placeholder="FRIEND'S CODE"
                placeholderTextColor="#F3EAD322"
                autoCapitalize="characters"
                style={{ flex: 1, backgroundColor: '#F3EAD308', borderRadius: 3, borderWidth: 1, borderColor: '#EDE3CC33', color: '#F3EAD3', fontFamily: 'SourceSans3_700Bold', fontSize: 15, letterSpacing: 3, textAlign: 'center', paddingVertical: 10 }}
              />
              <Pressable
                onPress={handleRedeemReferral}
                disabled={loadingReferral || referralInput.length < 4}
                style={{ backgroundColor: '#EDE3CC', borderRadius: 3, paddingHorizontal: 16, justifyContent: 'center', opacity: referralInput.length < 4 ? 0.4 : 1 }}
              >
                <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: '#0E2621' }}>{loadingReferral ? '...' : 'APPLY'}</Text>
              </Pressable>
            </View>
            {referralStatus && (
              <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, color: referralStatus.startsWith('✅') ? '#9CC93E' : '#E04A2F', textAlign: 'center' }}>
                {referralStatus}
              </Text>
            )}
          </View>
        </View>

        {/* ── Sign out ── */}
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Feather name="log-out" size={16} color="#E04A2F88" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          GoldRush Arena · Account saved on this device
        </Text>
      </ScrollView>
    </Reanimated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  profileCard:    { borderRadius: 3, borderWidth: 1.5, paddingTop: 28, paddingBottom: 22, paddingHorizontal: 20, alignItems: 'center', gap: 14, overflow: 'hidden' },
  bigAvatar:      { width: 76, height: 76, borderRadius: 3, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  bigAvatarEmoji: { fontSize: 36 },
  editBadge:      { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 3, backgroundColor: '#F0B429', alignItems: 'center', justifyContent: 'center' },
  profileInfo:    { gap: 5 },
  profileName:    { fontFamily: 'SourceSans3_700Bold', fontSize: 22 },
  levelBadge:     { fontFamily: 'SourceSans3_600SemiBold', fontSize: 13, letterSpacing: 0.5 },
  loginStreakRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakIcon:     { fontSize: 12 },
  streakText:     { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12 },

  // Avatar editor
  section:      { borderRadius: 3, borderWidth: 1, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle:  { fontFamily: 'SourceSans3_700Bold', fontSize: 14, letterSpacing: 1, flex: 1 },
  sectionCount:  { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12 },
  pickerLabel:   { fontFamily: 'SourceSans3_600SemiBold', fontSize: 10, letterSpacing: 1.5 },
  emojiGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn:      { width: 44, height: 44, borderRadius: 3, borderWidth: 1.5, borderColor: '#F3EAD318', backgroundColor: '#F3EAD308', alignItems: 'center', justifyContent: 'center' },
  emojiBtnText:  { fontSize: 22 },
  colorGrid:     { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot:      { width: 32, height: 32, borderRadius: 3, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  avatarPreview: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F3EAD308', borderRadius: 3, padding: 12 },
  previewCircle: { width: 52, height: 52, borderRadius: 3, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  previewEmoji:  { fontSize: 26 },
  previewName:   { fontFamily: 'SourceSans3_700Bold', fontSize: 17 },
  row:           { flexDirection: 'row', gap: 8 },
  saveBtn:       { borderRadius: 3, paddingVertical: 11, alignItems: 'center' },
  saveBtnText:   { fontFamily: 'SourceSans3_700Bold', fontSize: 13, letterSpacing: 0.5 },
  cancelBtn:     { borderRadius: 3, borderWidth: 1, paddingVertical: 11, alignItems: 'center' },
  cancelBtnText: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 13 },

  // XP
  xpSection: { borderRadius: 3, borderWidth: 1, padding: 14, gap: 8 },
  xpHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  xpTitle:   { fontFamily: 'SourceSans3_700Bold', fontSize: 14, flex: 1 },
  xpTotal:   { fontFamily: 'SourceSans3_400Regular', fontSize: 11 },
  xpRemaining: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 11 },
  xpTrack:   { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpFill:    { height: '100%', borderRadius: 4 },

  // Share card
  shareCard:  { borderRadius: 3, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  shareTitle: { color: '#EDE3CC', fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1 },
  shareSub:   { fontFamily: 'SourceSans3_400Regular', fontSize: 11, marginTop: 2 },
  shareMiniCard: { backgroundColor: '#EDE3CC11', borderRadius: 3, padding: 10, alignItems: 'center', gap: 2 },
  shareMiniRank: { fontFamily: 'SourceSans3_700Bold', fontSize: 13 },
  shareMiniWins: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 10 },

  // Challenge code
  codeSection: { borderRadius: 3, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeLabel:   { color: '#EDE3CC', fontFamily: 'SourceSans3_700Bold', fontSize: 10, letterSpacing: 1.5 },
  codeSub:     { color: '#F3EAD366', fontFamily: 'SourceSans3_400Regular', fontSize: 11, marginTop: 2 },
  codeBox:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EDE3CC22', borderRadius: 3, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#EDE3CC44' },
  codeText:    { color: '#EDE3CC', fontFamily: 'SourceSans3_700Bold', fontSize: 14, letterSpacing: 3 },

  // Stats
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard:   { width: '30%', flex: 1, minWidth: 90, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 3, borderWidth: 1, gap: 4 },
  statValue:  { fontFamily: 'SourceSans3_700Bold', fontSize: 20 },
  statLabel:  { fontFamily: 'SourceSans3_700Bold', fontSize: 8, letterSpacing: 1.5, textAlign: 'center' },

  // Achievements
  sectionWrap: { gap: 10 },
  achieveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achCard:     { width: '47%', flex: 1, minWidth: 140, borderRadius: 3, borderWidth: 1, padding: 10, gap: 4 },
  achName:     { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12 },
  achDesc:     { fontFamily: 'SourceSans3_400Regular', fontSize: 10, lineHeight: 14 },

  // History
  historyList: { gap: 6 },
  historyRow:  { flexDirection: 'row', alignItems: 'center', borderRadius: 3, borderWidth: 1, padding: 10, gap: 10 },
  histResult:  { width: 28, height: 28, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  histResultText: { fontFamily: 'SourceSans3_700Bold', fontSize: 13 },
  histMain:    { fontFamily: 'SourceSans3_600SemiBold', fontSize: 13 },
  histSub:     { fontFamily: 'SourceSans3_400Regular', fontSize: 11 },
  histXP:      { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12 },
  histTime:    { fontFamily: 'SourceSans3_400Regular', fontSize: 10 },

  // Logout
  logoutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 3, borderWidth: 1, borderColor: '#E04A2F22', backgroundColor: '#E04A2F08' },
  logoutText: { color: '#E04A2F88', fontFamily: 'SourceSans3_600SemiBold', fontSize: 14 },
  footer:     { fontFamily: 'SourceSans3_400Regular', fontSize: 10, textAlign: 'center' },
});
