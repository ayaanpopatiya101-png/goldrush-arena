import { Text } from '@/components/ui/Text';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, Panel, ScreenTitle, Shell, paperText } from '@/components/ui/Primitives';
import { tactile, palette } from '@/constants/colors';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useFocusAnimation } from '@/hooks/useFocusAnimation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RankBadge } from '@/components/RankBadge';
import { AchievementGrid } from '@/components/progression/AchievementGrid';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ACHIEVEMENTS, AVATAR_EMOJIS,
  getChallengeCode, getRankIndex, usePlayer, xpForNextRank, xpToLevel,
} from '@/context/PlayerContext';
import { apiUrl } from '@/utils/api';
import { useColors } from '@/hooks/useColors';
import { Glyph } from '@/components/ui/Glyph';
import { ColorPicker } from '@/components/appearance/ColorPicker';
import { AvatarPhoto, PhotoAvatarEditor, PhotoSourceMenu, type PhotoPickRequest } from '@/components/appearance/PhotoAvatarEditor';

export default function ProfileScreen() {
  const colors    = useColors();
  const insets    = useSafeAreaInsets();
  const {
    profile, logout, setAvatar, claimReferralReward, currentUsername,
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
  const [photoMenu, setPhotoMenu] = useState(false);
  const [pickRequest, setPickRequest] = useState<PhotoPickRequest | null>(null);
  const avatarBtnRef = useRef<View>(null);
  function choosePhotoSource(req: PhotoPickRequest) {
    setTempEmoji(profile.avatarEmoji); setTempColor(profile.avatarFrameColor); setAvatarEditing(true);
    setPickRequest(req);
  }
  function closePhotoMenu() {
    setPhotoMenu(false);
    // Return focus to the control that opened the menu.
    setTimeout(() => (avatarBtnRef.current as unknown as { focus?: () => void } | null)?.focus?.(), 0);
  }
  const [avatarSaveError, setAvatarSaveError] = useState('');
  const [tempEmoji, setTempEmoji]         = useState(profile.avatarEmoji);
  const [tempColor, setTempColor]         = useState(profile.avatarFrameColor);

  const rankInfo  = xpForNextRank(profile.xp);
  const topPad    = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const winRate   = profile.totalGames > 0 ? Math.round((profile.wins / profile.totalGames) * 100) : 0;
  const code      = getChallengeCode(profile.name);
  const focusStyle = useFocusAnimation();

  async function handleSaveAvatar() {
    setAvatarSaveError('');
    try {
      await setAvatar(tempEmoji, tempColor);
      setAvatarEditing(false);
    } catch { setAvatarSaveError('Your appearance could not be saved on this device. Retry or cancel; your previous look is kept.'); }
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: insets.bottom + 80 }}
      >
        <Shell style={{ gap: 16 }}>
        <ScreenTitle kicker="Player" title="Profile" />
        <View style={{ alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: tactile.brass, borderRadius: 10, borderWidth: 2, borderColor: palette.edge, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ color: palette.onAccent, fontFamily: 'SourceSans3_700Bold', fontSize: 12 }}>{profile.coins.toLocaleString()} COINS</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="Ranks" icon="award" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/leaderboard')} />
          <Button label="Trophy Road" icon="map" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/trophyroad-map')} />
        </View>
        {/* ── Profile card ── */}
        <View style={[styles.profileCard, { borderColor: palette.edge, backgroundColor: palette.surface }]}>
          {/* Rank-colored top band, the visual signal that this is a player card */}
          {/* Solid court-navy identity band with a gold rule, the avatar overlaps its edge */}
          <View style={styles.identityBand} pointerEvents="none" />

          {/* Avatar, centered, tappable to edit */}
          <Pressable ref={avatarBtnRef} testID="profile-avatar-button" accessibilityRole="button" accessibilityLabel="Change profile photo" accessibilityHint="Opens photo source options" hitSlop={8} onPress={() => setPhotoMenu(true)}>
            <View style={[styles.bigAvatar, {
              borderColor: profile.avatarFrameColor,
              backgroundColor: profile.avatarFrameColor + '33',
              overflow: 'visible',
            }]}>
              <View style={{ width: 84, height: 84, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                <AvatarPhoto username={currentUsername} size={84}>
                  <Glyph style={styles.bigAvatarEmoji} value={profile.avatarEmoji} />
                </AvatarPhoto>
              </View>
              <View style={styles.editBadge}>
                <Feather name="camera" size={13} color={palette.onAccent} />
              </View>
            </View>
          </Pressable>

          {/* Centered name / rank / streak block */}
          <View style={[styles.profileInfo, { alignItems: 'center' }]}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>{profile.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <RankBadge rank={profile.rank} size="sm" showLabel={false} />
              <Text style={[styles.levelBadge, { color: palette.foreground }]}>Lv.{xpToLevel(profile.xp)} · {profile.rank}</Text>
            </View>
            {/* Skill tier badge */}
            {profile.skillTier && (() => {
              const tierColor = profile.skillTier === 'Pro' ? palette.gold : profile.skillTier === 'Veteran' ? palette.border : palette.gold;
              const tierIcon = profile.skillTier === 'Pro' ? 'trophy-outline' as const : 'medal-outline' as const;
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tierColor + '1E', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: tierColor + '44' }}>
                  <MaterialCommunityIcons name={tierIcon} size={14} color={palette.gold} />
                  <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: palette.foreground, letterSpacing: 0.8 }}>{profile.skillTier.toUpperCase()}</Text>
                </View>
              );
            })()}
            <View style={styles.loginStreakRow}>
              <MaterialCommunityIcons name="fire" size={14} color={palette.gold} />
              <Text style={[styles.streakText, { color: palette.supporting }]}>{profile.loginStreak} day streak</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="Photo" icon="camera" testID="profile-edit-photo" style={{ flex: 1 }} onPress={() => setPhotoMenu(true)} />
          <Button label={avatarEditing ? 'Editing' : 'Emblem'} icon="edit-2" variant="secondary" style={{ flex: 1 }}
            onPress={() => { setTempEmoji(profile.avatarEmoji); setTempColor(profile.avatarFrameColor); setAvatarEditing(true); }} />
        </View>
        <PhotoSourceMenu open={photoMenu} onClose={closePhotoMenu} onChoose={choosePhotoSource} />
        {/* ── Avatar picker (expanded when editing) ── */}
        {avatarEditing && (
          <View style={[styles.section, { borderColor: tempColor + '55', backgroundColor: tempColor + '08' }]}>
            {avatarSaveError ? <Text accessibilityRole="alert">{avatarSaveError}</Text> : null}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>CUSTOMIZE AVATAR</Text>
            </View>

            {/* Emoji row */}
            <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>PICK YOUR ICON</Text>
            <View style={styles.emojiGrid}>
              {AVATAR_EMOJIS.map(e => (
                <Pressable key={e} onPress={() => setTempEmoji(e)} accessibilityRole="radio" accessibilityState={{ checked: tempEmoji === e }} aria-checked={tempEmoji === e} accessibilityLabel={`Avatar icon ${AVATAR_EMOJIS.indexOf(e) + 1}`}
                  style={[styles.emojiBtn, tempEmoji === e && { borderColor: tempColor, backgroundColor: tempColor + '22', transform: [{ scale: 1.15 }] }]}>
                  <Glyph style={styles.emojiBtnText} value={e} />
                </Pressable>
              ))}
            </View>

            {/* Color row */}
            <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>PICK YOUR COLOR</Text>
            <ColorPicker testID="profile-color-picker" value={tempColor} onChange={setTempColor} />

            <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>PHOTO</Text>
            {currentUsername ? <PhotoAvatarEditor testID="profile-photo" username={currentUsername} frameColor={tempColor} pickRequest={pickRequest} /> : null}
            <Text style={{ color: palette.supporting, fontFamily: 'SourceSans3_400Regular', fontSize: 14 }}>
              Photo changes save separately with Save photo. The controls below save or cancel only your emblem and frame.
            </Text>

            {/* Preview */}
            <View style={styles.avatarPreview}>
              <View style={[styles.previewCircle, { borderColor: tempColor, backgroundColor: tempColor + '33' }]}>
                <View style={{ width: 48, height: 48, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                  <AvatarPhoto username={currentUsername} size={48}>
                    <Glyph style={styles.previewEmoji} value={tempEmoji} />
                  </AvatarPhoto>
                </View>
              </View>
              <Text style={[styles.previewName, { color: palette.foreground }]}>{profile.name}</Text>
            </View>

            <View style={styles.row}>
              <Pressable onPress={handleSaveAvatar} accessibilityRole="button" accessibilityLabel="Save avatar" style={[styles.saveBtn, { backgroundColor: colors.primary, flex: 1 }]}>
                <Text style={[styles.saveBtnText, { color: palette.onAccent }]}>SAVE</Text>
              </Pressable>
              <Pressable onPress={() => setAvatarEditing(false)} accessibilityRole="button" accessibilityLabel="Cancel avatar edit" style={[styles.cancelBtn, { borderColor: colors.border, flex: 1 }]}>
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>CANCEL</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── XP bar ── */}
        <Panel tone="paper" style={[styles.xpSection, { borderRadius: 10 }]}>
          <View style={styles.xpHeader}>
            <Text style={[styles.xpTitle, { color: paperText.ink }]}>{profile.rank}</Text>
            <Text style={[styles.xpTotal, { color: paperText.muted }]}>{profile.xp} XP total</Text>
            {rankInfo.next && (
              <Text style={[styles.xpRemaining, { color: paperText.ink }]}>{rankInfo.remaining} to {rankInfo.next}</Text>
            )}
          </View>
          <View style={[styles.xpTrack, { backgroundColor: palette.surface, borderRadius: 10 }]}>
            <View style={[styles.xpFill, { width: `${rankInfo.progress * 100}%` as never, backgroundColor: palette.gold }]} />
          </View>
        </Panel>

        <View style={{ gap: 2, marginTop: 8 }} accessibilityRole="header">
          <Text style={{ fontFamily: 'BarlowCondensed_700Bold', fontSize: 24, letterSpacing: 1, color: palette.foreground }}>YOUR RECORD</Text>
          <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 14, color: palette.supporting }}>Stats, recent matches and achievements</Text>
        </View>
        {/* ── Stats grid ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: palette.foreground }}>STATISTICS</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: palette.border }} />
        </View>
        <View style={styles.statsGrid}>
          {[
            { label: 'WINS',        value: String(profile.wins) },
            { label: 'LOSSES',      value: String(profile.losses) },
            { label: 'WIN RATE',    value: `${winRate}%` },
            { label: 'BEST STREAK', value: String(profile.bestStreak) },
            { label: 'DEFLECTIONS', value: String(profile.totalDeflections) },
            { label: 'GAMES',       value: String(profile.totalGames) },
          ].map(stat => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, overflow: 'hidden' }]}>
              <Text style={[styles.statValue, { color: palette.foreground }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: palette.supporting }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Achievements ── */}
        <AchievementGrid items={ACHIEVEMENTS} unlockedIds={profile.achievements} />

        {/* ── Match history ── */}
        {profile.matchHistory.length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>RECENT MATCHES</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: palette.border }} />
            </View>
            <View style={styles.historyList}>
              {profile.matchHistory.slice(0, 8).map(match => (
                <View key={match.id} style={[styles.historyRow, { backgroundColor: colors.card, borderColor: match.won ? palette.gold : colors.border }]}>
                  <View style={[styles.histResult, { backgroundColor: match.won ? palette.gold : palette.primary }]}>
                    <Text style={[styles.histResultText, { color: palette.onAccent }]}>
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
                    <Text style={[styles.histXP, { color: palette.foreground }]}>+{match.xpEarned} XP</Text>
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
        <View style={{ backgroundColor: palette.surface, borderRadius: 8, borderWidth: 1, borderColor: palette.border, padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: palette.foreground }}>LIVES BANK</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {Array.from({ length: Math.min(profile.extraLivesInventory ?? 0, 8) }).map((_, i) => (
                <Feather key={i} name="heart" size={18} color={palette.primary} />
              ))}
              {(profile.extraLivesInventory ?? 0) > 8 && (
                <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 14, color: palette.foreground }}>+{(profile.extraLivesInventory ?? 0) - 8}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 22, color: palette.foreground }}>
                {profile.extraLivesInventory ?? 0}
              </Text>
              <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 12, color: palette.supporting }}>
                {getRankIndex(profile.rank) >= 15 ? 'Champion+ · max 2/match' : 'Up to 3 lives per match'}
              </Text>
            </View>
          </View>
          <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 12, color: palette.supporting, lineHeight: 17 }}>
            Bank lives are spare lives you can add at the start of a match, so one mistake does not end your run. Earn them from Gold Strikes, Premium Pass milestones, the Shop, or friend referrals.
          </Text>
        </View>

        <View style={{ gap: 2, marginTop: 8 }} accessibilityRole="header">
          <Text style={{ fontFamily: 'BarlowCondensed_700Bold', fontSize: 24, letterSpacing: 1, color: palette.foreground }}>FRIENDS AND CHALLENGES</Text>
          <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 14, color: palette.supporting }}>Share your rank, challenge friends, and refer new players</Text>
        </View>
        {/* ── Share stats card ── */}
        <Pressable onPress={handleShare} accessibilityRole="button" accessibilityLabel="Share your rank card" style={[styles.shareCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <View style={styles.shareLeft}>
            <Feather name="share-2" size={22} color={palette.foreground} />
            <View>
              <Text style={styles.shareTitle}>SHARE YOUR RANK</Text>
              <Text style={[styles.shareSub, { color: colors.mutedForeground }]}>Show off your stats to friends</Text>
            </View>
          </View>
          <View style={styles.shareMiniCard}>
            <Text style={[styles.shareMiniRank, { color: palette.foreground }]}>{profile.rank}</Text>
            <Text style={[styles.shareMiniWins, { color: colors.mutedForeground }]}>{profile.wins}W</Text>
          </View>
        </Pressable>

        {/* ── Challenge code ── */}
        <View style={[styles.codeSection, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Feather name="zap" size={14} color={palette.foreground} />
          <View style={{ flex: 1 }}>
            <Text style={styles.codeLabel}>YOUR CHALLENGE CODE</Text>
            <Text style={styles.codeSub}>Share with friends so they can find and challenge you!</Text>
          </View>
          <Pressable
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel={`Share challenge code ${code}`}
            style={[styles.codeBox, { minHeight: 44, justifyContent: 'center' }]}
          >
            <Text style={styles.codeText}>{code}</Text>
            <Feather name="share" size={12} color={palette.foreground} />
          </Pressable>
        </View>

        {/* ── Referral ── */}
        <View style={{ backgroundColor: palette.surface, borderRadius: 8, borderWidth: 1, borderColor: palette.border, padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: palette.foreground }}>REFER A FRIEND</Text>
          </View>

          {/* Pending reward claim */}
          {pendingReferrals > 0 && (
            <Pressable
              onPress={handleClaimReferralReward}
              accessibilityRole="button"
              accessibilityLabel="Claim referral reward"
              style={{ backgroundColor: palette.gold, borderRadius: 8, borderWidth: 1, borderColor: palette.edge, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Feather name="gift" size={18} color={palette.onAccent} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 13, color: palette.onAccent }}>
                  {pendingReferrals} Friend{pendingReferrals > 1 ? 's' : ''} Joined!
                </Text>
                <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 12, color: palette.supporting }}>Tap to claim your reward</Text>
              </View>
              <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: palette.foreground }}>CLAIM</Text>
            </Pressable>
          )}

          {/* Your referral code */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: palette.supporting, letterSpacing: 1.5 }}>YOUR CODE</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: palette.background, borderRadius: 8, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 20, color: palette.foreground, letterSpacing: 4 }}>
                  {myReferralCode ?? '···'}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  if (!myReferralCode) return;
                  Share.share({ message: `Join me on GoldRush Arena! Use my referral code: ${myReferralCode}\nWhen you sign up and enter my code, I get a bonus reward` });
                }}
                accessibilityRole="button"
                accessibilityLabel="Share referral code"
                accessibilityState={{ disabled: !myReferralCode }}
                style={{ backgroundColor: palette.gold, borderRadius: 8, borderWidth: 1, borderColor: palette.edge, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Feather name="share" size={18} color={palette.onAccent} />
              </Pressable>
            </View>
            <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 12, color: palette.supporting, lineHeight: 17 }}>
              Share this code with friends. When they enter it after signing up, you'll earn your choice of 10,000 Coins or 1 Bank Life.
            </Text>
          </View>

          {/* Enter a friend's referral code */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: palette.supporting, letterSpacing: 1.5 }}>ENTER A FRIEND'S CODE</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={referralInput}
                onChangeText={v => setReferralInput(v.toUpperCase().slice(0, 8))}
                placeholder="FRIEND'S CODE"
                placeholderTextColor={palette.supporting}
                autoCapitalize="characters"
                accessibilityLabel="Friend's referral code"
                style={{ flex: 1, minHeight: 44, backgroundColor: palette.background, borderRadius: 8, borderWidth: 1, borderColor: palette.border, color: palette.foreground, fontFamily: 'SourceSans3_700Bold', fontSize: 15, letterSpacing: 3, textAlign: 'center', paddingVertical: 10 }}
              />
              <Pressable
                onPress={handleRedeemReferral}
                disabled={loadingReferral || referralInput.length < 4}
                accessibilityRole="button"
                accessibilityLabel="Apply friend's code"
                accessibilityState={{ disabled: loadingReferral || referralInput.length < 4, busy: loadingReferral }}
                style={{ backgroundColor: palette.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center', opacity: referralInput.length < 4 ? 0.8 : 1 }}
              >
                <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: palette.onAccent }}>{loadingReferral ? '...' : 'APPLY'}</Text>
              </Pressable>
            </View>
            {referralStatus && (
              <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: referralStatus.startsWith('Code applied') ? palette.foreground : palette.supporting, textAlign: 'center' }}>
                {referralStatus}
              </Text>
            )}
          </View>
        </View>

        {/* ── Sign out ── */}
        <Pressable onPress={handleLogout} accessibilityRole="button" style={[styles.logoutBtn, { minHeight: 44 }]}>
          <Feather name="log-out" size={16} color={palette.foreground} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          GoldRush Arena · Account saved on this device
        </Text>
        </Shell>
      </ScrollView>
    </Reanimated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  identityBand:   { position: 'absolute', top: 0, left: 0, right: 0, height: 66, backgroundColor: palette.inset, borderBottomWidth: 2, borderBottomColor: palette.border },
  profileCard:    { borderRadius: 18, borderWidth: 2, borderBottomWidth: 6, paddingTop: 26, paddingBottom: 22, paddingHorizontal: 20, alignItems: 'center', gap: 14, overflow: 'hidden' },
  bigAvatar:      { width: 96, height: 96, borderRadius: 24, borderWidth: 4, borderBottomWidth: 6, alignItems: 'center', justifyContent: 'center' },
  bigAvatarEmoji: { fontSize: 36 },
  editBadge:      { position: 'absolute', bottom: -6, right: -6, width: 30, height: 30, borderRadius: 15, backgroundColor: palette.primary, borderWidth: 2, borderColor: palette.edge, alignItems: 'center', justifyContent: 'center' },
  profileInfo:    { gap: 5, width: '100%', minWidth: 0 },
  profileName:    { width: '100%', flexShrink: 1, fontFamily: 'BarlowCondensed_700Bold', fontSize: 34, textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },
  levelBadge:     { fontFamily: 'SourceSans3_600SemiBold', fontSize: 13, letterSpacing: 0.5 },
  loginStreakRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakIcon:     { fontSize: 12 },
  streakText:     { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12 },

  // Avatar editor
  section:      { borderRadius: 10, borderWidth: 2, borderBottomWidth: 5, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle:  { fontFamily: 'BarlowCondensed_700Bold', fontSize: 18, letterSpacing: 1.2, flex: 1, textTransform: 'uppercase' },
  sectionCount:  { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12 },
  pickerLabel:   { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, letterSpacing: 1.5 },
  emojiGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn:      { width: 44, height: 44, borderRadius: 10, borderWidth: 2, borderColor: palette.border, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' },
  emojiBtnText:  { fontSize: 22 },
  colorGrid:     { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot:      { width: 32, height: 32, borderRadius: 8, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  avatarPreview: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: palette.surface, borderRadius: 8, padding: 12 },
  previewCircle: { width: 52, height: 52, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  previewEmoji:  { fontSize: 26 },
  previewName:   { fontFamily: 'SourceSans3_700Bold', fontSize: 17 },
  row:           { flexDirection: 'row', gap: 8 },
  saveBtn:       { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  saveBtnText:   { fontFamily: 'SourceSans3_700Bold', fontSize: 13, letterSpacing: 0.5 },
  cancelBtn:     { borderRadius: 10, borderWidth: 2, paddingVertical: 11, alignItems: 'center' },
  cancelBtnText: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 13 },

  // XP
  xpSection: { borderRadius: 10, borderWidth: 2, borderBottomWidth: 5, padding: 14, gap: 8 },
  xpHeader:  { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  xpTitle:   { fontFamily: 'BarlowCondensed_700Bold', fontSize: 18, letterSpacing: 0.8, textTransform: 'uppercase', flex: 1 },
  xpTotal:   { fontFamily: 'SourceSans3_400Regular', fontSize: 12 },
  xpRemaining: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12 },
  xpTrack:   { height: 16, borderRadius: 10, borderWidth: 2, borderColor: palette.edge, padding: 2, overflow: 'hidden' },
  xpFill:    { height: '100%', borderRadius: 10 },

  // Share card
  shareCard:  { borderRadius: 10, borderWidth: 2, borderBottomWidth: 5, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  shareTitle: { color: palette.foreground, fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1 },
  shareSub:   { fontFamily: 'SourceSans3_400Regular', fontSize: 12, marginTop: 2 },
  shareMiniCard: { backgroundColor: palette.surface, borderRadius: 10, padding: 10, alignItems: 'center', gap: 2 },
  shareMiniRank: { fontFamily: 'SourceSans3_700Bold', fontSize: 13 },
  shareMiniWins: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12 },

  // Challenge code
  codeSection: { borderRadius: 10, borderWidth: 2, borderBottomWidth: 5, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeLabel:   { color: palette.foreground, fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1.5 },
  codeSub:     { color: palette.supporting, fontFamily: 'SourceSans3_400Regular', fontSize: 12, marginTop: 2 },
  codeBox:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: palette.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 2, borderColor: palette.border },
  codeText:    { color: palette.foreground, fontFamily: 'SourceSans3_700Bold', fontSize: 14, letterSpacing: 3 },

  // Stats
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard:   { width: '30%', flex: 1, minWidth: 90, alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, gap: 2 },
  statValue:  { fontFamily: 'BarlowCondensed_700Bold', fontSize: 30, fontVariant: ['tabular-nums'] },
  statLabel:  { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1.2 },

  // Achievements
  sectionWrap: { gap: 10 },
  achieveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achCard:     { width: '47%', flex: 1, minWidth: 140, borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, padding: 10, gap: 4 },
  achName:     { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12 },
  achDesc:     { fontFamily: 'SourceSans3_400Regular', fontSize: 12, lineHeight: 14 },

  // History
  historyList: { gap: 6 },
  historyRow:  { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 2, padding: 10, gap: 10 },
  histResult:  { width: 32, height: 32, borderRadius: 10, borderWidth: 2, borderColor: palette.edge, alignItems: 'center', justifyContent: 'center' },
  histResultText: { fontFamily: 'SourceSans3_700Bold', fontSize: 13 },
  histMain:    { fontFamily: 'SourceSans3_600SemiBold', fontSize: 13 },
  histSub:     { fontFamily: 'SourceSans3_400Regular', fontSize: 12 },
  histXP:      { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12 },
  histTime:    { fontFamily: 'SourceSans3_400Regular', fontSize: 12 },

  // Logout
  logoutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, minHeight: 48, borderRadius: 10, borderWidth: 2, borderBottomWidth: 5, borderColor: palette.border, backgroundColor: palette.surface },
  logoutText: { color: palette.foreground, fontFamily: 'SourceSans3_600SemiBold', fontSize: 14 },
  footer:     { fontFamily: 'SourceSans3_400Regular', fontSize: 12, textAlign: 'center' },
});
