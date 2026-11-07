/**
 * Match Highlights, full-screen reel of auto-detected exciting moments.
 *
 * Reads from the in-memory matchEvents store (populated during the game).
 * Each moment can be:
 *   • shared directly to any social platform via the OS share sheet
 *   • opened in clip-viewer for editing before sharing
 *   • saved to the My Clips library
 *
 * Rewards are claimed per-clip (daily cap applies).
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics    from 'expo-haptics';
import * as Sharing    from 'expo-sharing';
import { LinearGradient } from '@/components/ui/Flat';
import { router }           from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import Reanimated, {
  FadeIn, FadeInDown, ZoomIn,
  useAnimatedStyle, useSharedValue, withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlayer }          from '@/context/PlayerContext';
import { getBestMatchEvents, type MatchEvent } from '@/store/matchEvents';
import { setPendingClip }     from '@/store/highlightClip';
import { saveClipToLibrary, getClipLibrary, type SavedClip } from '@/store/clipLibrary';
import { getClipTier, getClipGrade, canClaimClipReward, consumeClipRewardSlot } from '@/utils/clipRewards';
import { createHighlightGIF } from '@/utils/gifEncoder';
import { uint8ToBase64 }      from '@/store/clipLibrary';
import { trackEvent }         from '@/utils/analytics';
import { Glyph } from '@/components/ui/Glyph';

// ─── Clip card component ─────────────────────────────────────────────────────

type CardState = 'idle' | 'encoding' | 'sharing' | 'saved' | 'claimed';

function ClipCard({
  event,
  index,
  deflections,
  onEdit,
}: {
  event:      MatchEvent;
  index:      number;
  deflections: number;
  onEdit:     (event: MatchEvent) => void;
}) {
  const { claimEventBonus } = usePlayer();
  const [cardState,   setCardState]   = useState<CardState>('idle');
  const [gifUri,      setGifUri]      = useState<string | null>(null);
  const [rewardDone,  setRewardDone]  = useState(false);

  const tier  = getClipTier(event.clipScore);
  const grade = getClipGrade(event.clipScore);
  const thumb = event.frames[0] ? `data:image/jpeg;base64,${event.frames[0]}` : null;

  // Spring animation for the save check
  const saveScale = useSharedValue(0);
  const saveStyle = useAnimatedStyle(() => ({ transform: [{ scale: saveScale.value }], opacity: saveScale.value }));

  // ── Encode GIF on demand ────────────────────────────────────────────────────
  async function ensureGif(): Promise<string | null> {
    if (gifUri) return gifUri;
    setCardState('encoding');
    try {
      const bytes  = await createHighlightGIF(event.frames);
      const base64 = uint8ToBase64(bytes);
      const path   = `${(FileSystem as any).cacheDirectory ?? ''}highlight_${event.id}.gif`;
      await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
      setGifUri(path);
      return path;
    } catch {
      return null;
    }
  }

  // ── Share ───────────────────────────────────────────────────────────────────
  async function handleShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const path = await ensureGif();
    if (!path) { setCardState('idle'); return; }
    setCardState('sharing');
    try {
      if (Platform.OS !== 'web' && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType:    'image/gif',
          dialogTitle: `${event.emoji} ${event.label}, GoldRush Arena`,
          UTI:         'com.compuserve.gif',
        });
      } else {
        Alert.alert('Sharing unavailable', 'Native sharing is not available here. Save the clip or try on a supported device. No share reward was claimed.');
        return;
      }
      // Claim reward if available
      let rewardClaimedForShare = rewardDone;
      if (!rewardDone) {
        const canClaim = await canClaimClipReward();
        if (canClaim) {
          const granted = await consumeClipRewardSlot();
          if (granted) {
            await claimEventBonus({ coins: tier.coins, xp: tier.xp, credits: 0 });
            setRewardDone(true);
            rewardClaimedForShare = true;
          }
        }
      }
      trackEvent('highlight_share_sheet_returned', {
        clip_type: event.type,
        tier: tier.label,
        clip_score: event.clipScore,
        reward_claimed: rewardClaimedForShare,
      });
    } catch {
      Alert.alert('Share failed', 'Could not open the share sheet. No share reward was claimed. Try again.');
    } finally {
      setCardState('idle');
    }
  }

  // ── Save to library ─────────────────────────────────────────────────────────
  async function handleSave() {
    if (cardState === 'saved') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Encode GIF if not done yet (skip await so we can still save frames)
    let b64 = '';
    try {
      const path = await ensureGif();
      if (path) {
        b64 = await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.Base64 });
      }
    } catch { /* save without GIF, viewer will re-encode */ }

    await saveClipToLibrary({
      frames:    event.frames,
      gifBase64: b64,
      type:      event.type,
      score:     deflections,
      clipScore: event.clipScore,
      tier:      tier.label,
      tierColor: tier.color,
      autoSaved: false,
    });
    setCardState('saved');
    trackEvent('highlight_saved', {
      clip_type: event.type,
      tier: tier.label,
      clip_score: event.clipScore,
      auto_saved: false,
    });
    saveScale.value = withSpring(1, { damping: 5, stiffness: 300 }, () => {
      saveScale.value = withSpring(1.15, { damping: 5, stiffness: 200 }, () => {
        saveScale.value = withSpring(1, { damping: 8, stiffness: 180 });
      });
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const busy = cardState === 'encoding' || cardState === 'sharing';

  return (
    <Reanimated.View entering={FadeInDown.delay(index * 120).springify()} style={mh.card}>
      <LinearGradient
        colors={[`${tier.color}22`, '#14231F', '#14231F']}
        style={StyleSheet.absoluteFill}
      />
      {/* Accent top bar */}
      <View style={[mh.cardAccent, { backgroundColor: tier.color }]} />

      <View style={mh.cardBody}>
        {/* Thumbnail */}
        <View style={mh.thumbWrap}>
          {thumb ? (
            <Image source={{ uri: thumb }} style={mh.thumb} resizeMode="cover" />
          ) : (
            <View style={[mh.thumb, mh.thumbPlaceholder]}>
              <Glyph style={{ fontSize: 28 }} value="🎬" />
            </View>
          )}
          {/* Grade badge */}
          <View style={[mh.gradeBadge, { backgroundColor: grade.color }]}>
            <Text style={mh.gradeText}>{grade.letter}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={mh.cardInfo}>
          <View style={mh.labelRow}>
            <Glyph style={mh.eventEmoji} value={event.emoji} />
            <Text style={mh.eventLabel}>{event.label}</Text>
          </View>
          <Text style={[mh.gradeName, { color: grade.color }]}>{grade.label}</Text>
          {/* Stars */}
          <View style={mh.starsRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Text key={i} style={[mh.star, i < grade.stars && { opacity: 1 }]}></Text>
            ))}
          </View>
          {/* Reward line */}
          <View style={mh.rewardRow}>
            <Text style={mh.rewardCoin}> +{tier.coins}</Text>
            <Text style={mh.rewardXp}> +{tier.xp} XP</Text>
          </View>
        </View>
      </View>

      {/* Action row */}
      <View style={mh.actions}>
        {/* Edit button */}
        <Pressable
          onPress={() => onEdit(event)}
          style={({ pressed }) => [mh.actionBtn, mh.editBtn, pressed && { opacity: 0.75 }]}
        >
          <Text style={mh.actionBtnText}>EDIT</Text>
        </Pressable>

        {/* Share button */}
        <Pressable
          onPress={handleShare}
          disabled={busy}
          style={({ pressed }) => [mh.actionBtn, mh.shareBtn, { backgroundColor: tier.color }, (pressed || busy) && { opacity: 0.75 }]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={mh.shareBtnText}>SHARE</Text>
          )}
        </Pressable>

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          disabled={cardState === 'saved'}
          style={({ pressed }) => [mh.actionBtn, mh.saveBtn, cardState === 'saved' && mh.saveBtnDone, pressed && { opacity: 0.75 }]}
        >
          <Reanimated.Text style={[mh.actionBtnText, saveStyle, cardState === 'saved' && { color: '#9BB77A' }]}>
            {cardState === 'saved' ? 'SAVED' : 'SAVE'}
          </Reanimated.Text>
        </Pressable>
      </View>
    </Reanimated.View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function MatchHighlightsScreen() {
  const insets      = useSafeAreaInsets();
  const { profile, claimEventBonus } = usePlayer();

  const [events,      setEvents]      = useState<MatchEvent[]>([]);
  const [deflections, setDeflections] = useState(0);
  const [claiming,    setClaiming]    = useState(false);
  const [allClaimed,  setAllClaimed]  = useState(false);

  // Load events from in-memory store on mount
  useEffect(() => {
    const best = getBestMatchEvents(5);
    setEvents(best.filter(e => Array.isArray(e.frames) && e.frames.length > 0));
  }, []);

  // ── Navigate to clip-viewer to edit one event ──────────────────────────────
  function handleEdit(event: MatchEvent) {
    const tier = getClipTier(event.clipScore);
    setPendingClip(event.frames, event.type, deflections, event.clipScore);
    router.push('/clip-viewer');
  }

  // ── Claim all rewards at once ──────────────────────────────────────────────
  async function handleClaimAll() {
    if (allClaimed || claiming) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setClaiming(true);
    let totalCoins = 0;
    let totalXp    = 0;
    for (const ev of events) {
      const canClaim = await canClaimClipReward();
      if (!canClaim) break;
      const granted = await consumeClipRewardSlot();
      if (granted) {
        const tier = getClipTier(ev.clipScore);
        totalCoins += tier.coins;
        totalXp    += tier.xp;
      }
    }
    if (totalCoins > 0 || totalXp > 0) {
      await claimEventBonus({ coins: totalCoins, xp: totalXp, credits: 0 });
    }
    setClaiming(false);
    setAllClaimed(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalCoins = events.reduce((s, e) => s + getClipTier(e.clipScore).coins, 0);
  const totalXp    = events.reduce((s, e) => s + getClipTier(e.clipScore).xp,    0);
  const bestGrade  = events.length > 0 ? getClipGrade(events[0].clipScore) : null;

  // ── Empty state ────────────────────────────────────────────────────────────
  if (events.length === 0) {
    return (
      <View style={[mh.root, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#14231F', '#20372F']} style={StyleSheet.absoluteFill} />
        <View style={mh.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={mh.backBtn}>
            <Text style={mh.backText}>‹ BACK</Text>
          </Pressable>
          <Text style={mh.headerTitle}>MATCH HIGHLIGHTS</Text>
          <View style={{ width: 64 }} />
        </View>
        <View style={mh.emptyState}>
          <Glyph style={{ fontSize: 48, marginBottom: 12 }} value="🎬" />
          <Text style={mh.emptyTitle}>No moments detected</Text>
          <Text style={mh.emptySub}>Highlights from the last match are kept in memory only, so they are gone after a refresh or a new match. Saved clips are in My Clips.</Text>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={mh.emptyBtn}>
            <Text style={mh.emptyBtnText}>Leave highlights</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[mh.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#14231F', '#20372F']} style={StyleSheet.absoluteFill} />

      {/* ── Header ── */}
      <View style={mh.header}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={mh.backBtn}>
          <Text style={mh.backText}>‹ BACK</Text>
        </Pressable>
        <View style={mh.headerCenter}>
          <Text style={mh.headerTitle}>MATCH HIGHLIGHTS</Text>
          <View style={mh.headerBadgeRow}>
            <View style={[mh.headerBadge, { backgroundColor: bestGrade?.color ?? '#D7A83B' }]}>
              <Text style={mh.headerBadgeText}>{bestGrade?.letter ?? 'C'}</Text>
            </View>
            <Text style={mh.headerSub}>{events.length} MOMENT{events.length > 1 ? 'S' : ''} DETECTED</Text>
          </View>
        </View>
        <Pressable onPress={() => router.push('/my-clips')} style={mh.libBtn}>
          <Glyph style={mh.libBtnText} value="📁" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[mh.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Clip cards ── */}
        {events.map((ev, i) => (
          <ClipCard
            key={ev.id}
            event={ev}
            index={i}
            deflections={deflections}
            onEdit={handleEdit}
          />
        ))}

        {/* ── Total reward summary ── */}
        <Reanimated.View entering={FadeInDown.delay(events.length * 120 + 100).springify()} style={mh.totalCard}>
          <LinearGradient colors={['#14231F', '#14231F']} style={StyleSheet.absoluteFill} />
          <View style={[mh.cardAccent, { backgroundColor: '#D7A83B' }]} />
          <Text style={mh.totalTitle}>TOTAL MATCH REWARDS</Text>
          <View style={mh.totalRow}>
            <View style={mh.totalPill}>
              <Text style={mh.totalPillText}> {totalCoins} COINS</Text>
            </View>
            <View style={mh.totalPill}>
              <Text style={mh.totalPillText}> {totalXp} XP</Text>
            </View>
          </View>
          <Text style={mh.totalNote}>Open the supported share sheet to claim a clip reward (daily cap applies). The game cannot verify external publication.</Text>
        </Reanimated.View>

        {/* ── Go to library ── */}
        <Pressable
          onPress={() => router.push('/my-clips')}
          style={({ pressed }) => [mh.libraryBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={mh.libraryBtnText}>VIEW MY CLIPS LIBRARY</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const mh = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#14231F' },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE7D70A' },
  backBtn:      { width: 64, justifyContent: 'center' },
  backText:     { fontFamily: 'BarlowCondensed_700Bold', fontSize: 18, color: '#EEE7D788', letterSpacing: 0.5 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontFamily: 'BarlowCondensed_700Bold', fontSize: 18, color: '#D7A83B', letterSpacing: 2 },
  headerBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  headerBadge:    { width: 22, height: 22, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  headerBadgeText:{ fontFamily: 'BarlowCondensed_700Bold', fontSize: 11, color: '#EEE7D7' },
  headerSub:      { fontFamily: 'SourceSans3_400Regular', fontSize: 10, color: '#EEE7D755', letterSpacing: 1 },
  libBtn:         { width: 64, alignItems: 'flex-end', justifyContent: 'center' },
  libBtnText:     { fontSize: 22 },

  scroll: { padding: 16, gap: 14 },

  // Clip card
  card:       { borderRadius: 3, overflow: 'hidden', borderWidth: 1, borderColor: '#EEE7D70A' },
  cardAccent: { height: 3, width: '100%' },
  cardBody:   { flexDirection: 'row', padding: 14, gap: 14 },

  // Thumbnail
  thumbWrap:       { position: 'relative', width: 90, height: 90 },
  thumb:           { width: 90, height: 90, borderRadius: 3 },
  thumbPlaceholder:{ backgroundColor: '#1E4A3F', alignItems: 'center', justifyContent: 'center' },
  gradeBadge:      { position: 'absolute', top: -6, right: -6, width: 28, height: 28, borderRadius: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#14231F' },
  gradeText:       { fontFamily: 'BarlowCondensed_700Bold', fontSize: 12, color: '#EEE7D7' },

  // Card info
  cardInfo:   { flex: 1, justifyContent: 'space-between' },
  labelRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventEmoji: { fontSize: 18 },
  eventLabel: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 15, color: '#EEE7D7', letterSpacing: 1 },
  gradeName:  { fontFamily: 'SourceSans3_700Bold', fontSize: 11, letterSpacing: 0.5, marginTop: 2 },
  starsRow:   { flexDirection: 'row', gap: 2, marginTop: 4 },
  star:       { fontSize: 12, color: '#D7A83B', opacity: 0.2 },
  rewardRow:  { flexDirection: 'row', gap: 10, marginTop: 6 },
  rewardCoin: { fontFamily: 'SourceSans3_700Bold', fontSize: 11, color: '#D7A83B' },
  rewardXp:   { fontFamily: 'SourceSans3_700Bold', fontSize: 11, color: '#EDE3CC' },

  // Action row
  actions:       { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  actionBtn:     { flex: 1, paddingVertical: 9, borderRadius: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  actionBtnText: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 12, letterSpacing: 0.5, color: '#EEE7D7' },
  editBtn:       { borderColor: '#EEE7D720', backgroundColor: '#EEE7D708' },
  shareBtn:      { borderColor: 'transparent' },
  shareBtnText:  { fontFamily: 'BarlowCondensed_700Bold', fontSize: 12, letterSpacing: 0.5, color: '#EEE7D7' },
  saveBtn:       { borderColor: '#EEE7D720', backgroundColor: '#EEE7D708' },
  saveBtnDone:   { borderColor: '#9BB77A40', backgroundColor: '#9BB77A15' },

  // Total card
  totalCard:  { borderRadius: 3, overflow: 'hidden', borderWidth: 1, borderColor: '#D7A83B22', padding: 18, alignItems: 'center', gap: 12 },
  totalTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 14, color: '#D7A83B', letterSpacing: 2 },
  totalRow:   { flexDirection: 'row', gap: 12 },
  totalPill:  { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 3, backgroundColor: '#D7A83B15', borderWidth: 1, borderColor: '#D7A83B30' },
  totalPillText: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 15, color: '#D7A83B', letterSpacing: 1 },
  totalNote:  { fontFamily: 'SourceSans3_400Regular', fontSize: 10, color: '#EEE7D744', textAlign: 'center' },

  // Library button
  libraryBtn:     { borderRadius: 3, borderWidth: 1, borderColor: '#EEE7D715', paddingVertical: 14, alignItems: 'center', backgroundColor: '#EEE7D705' },
  libraryBtnText: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 13, color: '#EEE7D766', letterSpacing: 1 },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 22, color: '#EEE7D7', marginBottom: 8 },
  emptySub:   { fontFamily: 'SourceSans3_400Regular', fontSize: 13, color: '#EEE7D766', textAlign: 'center', lineHeight: 20 },
  emptyBtn:   { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 3, borderWidth: 1, borderColor: '#D7A83B40', backgroundColor: '#D7A83B10' },
  emptyBtnText: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 14, color: '#D7A83B', letterSpacing: 1 },
});
