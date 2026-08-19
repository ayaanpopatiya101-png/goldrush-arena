/**
 * Full-screen clip viewer, editor, and share screen.
 *
 * Entry points:
 *   • After game — postgame.tsx pushes here when a pending clip exists.
 *   • From library — my-clips.tsx pushes here with ?savedClipId=<id>.
 *
 * Features:
 *   • GIF playback (auto-encoded on mount, re-encoded after trim)
 *   • Trim tool — frame strip + start/end picker
 *   • Caption tool — text overlay below the clip
 *   • Sticker tool — emoji overlay pinned to the clip card
 *   • Save to My Clips (AsyncStorage library, max 10)
 *   • Share via native share sheet (writes temp GIF to cache)
 *   • Claim reward XP + coins after sharing (new clips only)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated,
  Dimensions, InteractionManager, Keyboard,
  Pressable, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Reanimated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';

import { getPendingClip, type HighlightType } from '@/store/highlightClip';
import {
  getClipLibrary, saveClipToLibrary, updateClipInLibrary,
  uint8ToBase64, type SavedClip,
} from '@/store/clipLibrary';
import { createHighlightGIF } from '@/utils/gifEncoder';
import { getClipTier, canClaimClipReward, consumeClipRewardSlot, type ClipTier } from '@/utils/clipRewards';
import { usePlayer } from '@/context/PlayerContext';

const { width: SW } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────

const STICKERS = ['🔥','⚡','💎','👑','🎯','💥','🌟','🏆','🎮','😤'];

const TYPE_LABEL: Record<HighlightType, string> = {
  multi_block: 'MULTI-BLOCK',
  near_death:  'NEAR-DEATH SAVE',
  hot_streak:  'HOT STREAK',
  manual:      'SAVED MOMENT',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function encodeFrames(frames: string[]): Promise<string> {
  const gif = await createHighlightGIF(frames);
  return uint8ToBase64(gif);
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToolPill({
  icon, label, active, onPress, accent,
}: { icon: string; label: string; active: boolean; onPress: () => void; accent: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        cv.toolPill,
        active && { backgroundColor: accent + '30', borderColor: accent },
      ]}
    >
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text style={[cv.toolPillTxt, active && { color: accent }]}>{label}</Text>
    </Pressable>
  );
}

function FrameStrip({
  frames, selectedIdx, onSelect,
}: { frames: string[]; selectedIdx: number; onSelect: (i: number) => void }) {
  // Sample evenly — show up to 12 thumbnails
  const step    = Math.max(1, Math.floor(frames.length / 12));
  const samples = frames.filter((_, i) => i % step === 0).slice(0, 12);
  const indices = samples.map((_, i) => i * step);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 5, paddingHorizontal: 16, paddingVertical: 6 }}>
      {samples.map((frame, si) => {
        const realIdx = indices[si];
        const active  = realIdx === selectedIdx;
        return (
          <Pressable key={si} onPress={() => onSelect(realIdx)}>
            <Image
              source={{ uri: 'data:image/jpeg;base64,' + frame }}
              style={[cv.thumb, active && { borderColor: '#FFD700', borderWidth: 2 }]}
            />
            {active && (
              <View style={cv.thumbActiveDot} />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ClipViewer() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { profile, claimEventBonus } = usePlayer();
  const { savedClipId } = useLocalSearchParams<{ savedClipId?: string }>();

  // ── Source data ──────────────────────────────────────────────────────────
  const [sourceFrames,    setSourceFrames]    = useState<string[]>([]);
  const [sourceType,      setSourceType]      = useState<HighlightType>('manual');
  const [sourceScore,     setSourceScore]     = useState(0);
  const [sourceClipScore, setSourceClipScore] = useState(0);
  const [sourceSavedId,   setSourceSavedId]   = useState<string | null>(null);
  const [isFromLibrary,   setIsFromLibrary]   = useState(false);

  // ── GIF state ────────────────────────────────────────────────────────────
  const [gifBase64,    setGifBase64]    = useState<string | null>(null);
  const [encoding,     setEncoding]     = useState(false);
  const [encodeError,  setEncodeError]  = useState(false);

  // ── Edit state ───────────────────────────────────────────────────────────
  const [activeTool,   setActiveTool]   = useState<'trim' | 'caption' | 'sticker' | null>(null);
  const [trimStart,    setTrimStart]    = useState(0);
  const [trimEnd,      setTrimEnd]      = useState(0);
  const [pendingStart, setPendingStart] = useState(0);
  const [pendingEnd,   setPendingEnd]   = useState(0);
  const [caption,      setCaption]      = useState('');
  const [sticker,      setSticker]      = useState<string | null>(null);

  // ── Save / share state ───────────────────────────────────────────────────
  const [saved,        setSaved]        = useState(false);
  const [sharing,      setSharing]      = useState(false);
  const [rewardClaimed,setRewardClaimed]= useState(false);
  const saveAnim = useRef(new Animated.Value(1)).current;

  // ── Derived ──────────────────────────────────────────────────────────────
  const tier      = getClipTier(sourceClipScore);
  const [canReward, setCanReward] = useState(false);
  useEffect(() => {
    if (isFromLibrary) { setCanReward(false); return; }
    canClaimClipReward().then(setCanReward);
  }, [isFromLibrary]);

  // ── Load source (pending clip OR library clip) ────────────────────────────
  useEffect(() => {
    if (savedClipId) {
      // Load from library
      getClipLibrary().then(lib => {
        const c = lib.find(x => x.id === savedClipId);
        if (!c) { router.back(); return; }
        setSourceFrames(c.frames);
        setSourceType(c.type);
        setSourceScore(c.score);
        setSourceClipScore(c.clipScore);
        setSourceSavedId(c.id);
        setIsFromLibrary(true);
        setCaption(c.caption ?? '');
        setSticker(c.sticker ?? null);
        setTrimStart(0); setTrimEnd(c.frames.length - 1);
        setPendingStart(0); setPendingEnd(c.frames.length - 1);
        setGifBase64(c.gifBase64 ?? null); // instant display (gifBase64 may be absent on auto-saved clips)
      });
    } else {
      // Fresh clip from game
      const pending = getPendingClip();
      if (!pending || pending.frames.length === 0) { router.back(); return; }
      setSourceFrames(pending.frames);
      setSourceType(pending.type);
      setSourceScore(pending.score);
      setSourceClipScore(pending.clipScore);
      setTrimStart(0); setTrimEnd(pending.frames.length - 1);
      setPendingStart(0); setPendingEnd(pending.frames.length - 1);
    }
  }, [savedClipId]);

  // ── Encode GIF when frames load (and when trim is applied) ───────────────
  useEffect(() => {
    if (sourceFrames.length === 0 || gifBase64 !== null) return;
    encode(sourceFrames);
  }, [sourceFrames]);

  function encode(frames: string[]) {
    setEncoding(true);
    setEncodeError(false);
    InteractionManager.runAfterInteractions(() => {
      encodeFrames(frames)
        .then(b64 => setGifBase64(b64))
        .catch(() => setEncodeError(true))
        .finally(() => setEncoding(false));
    });
  }

  // ── Tool handlers ─────────────────────────────────────────────────────────
  function toggleTool(t: 'trim' | 'caption' | 'sticker') {
    Keyboard.dismiss();
    setActiveTool(prev => (prev === t ? null : t));
  }

  function applyTrim() {
    const trimmed = sourceFrames.slice(pendingStart, pendingEnd + 1);
    setTrimStart(pendingStart);
    setTrimEnd(pendingEnd);
    setGifBase64(null); // triggers re-encode
    encode(trimmed);
    setActiveTool(null);
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!gifBase64) return;
    const frames = sourceFrames.slice(trimStart, trimEnd + 1);
    const clipData: Omit<SavedClip, 'id' | 'timestamp'> = {
      frames, gifBase64, type: sourceType, score: sourceScore,
      clipScore: sourceClipScore, tier: tier.label, tierColor: tier.color,
      caption: caption || undefined, sticker: sticker || undefined,
    };
    if (sourceSavedId) {
      // Update existing
      await updateClipInLibrary(sourceSavedId, { gifBase64, caption: caption || undefined, sticker: sticker || undefined });
    } else {
      const saved = await saveClipToLibrary(clipData);
      setSourceSavedId(saved.id);
      setIsFromLibrary(true);
    }
    setSaved(true);
    Animated.sequence([
      Animated.spring(saveAnim, { toValue: 1.15, useNativeDriver: true, bounciness: 12 }),
      Animated.spring(saveAnim, { toValue: 1,    useNativeDriver: true, bounciness: 6  }),
    ]).start();
  }, [gifBase64, sourceFrames, trimStart, trimEnd, sourceType, sourceScore, sourceClipScore, caption, sticker, sourceSavedId, tier]);

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (!gifBase64 || sharing) return;
    setSharing(true);
    try {
      const path = (FileSystem.cacheDirectory ?? '') + 'goldrush_clip.gif';
      await FileSystem.writeAsStringAsync(path, gifBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Sharing.shareAsync(path, {
        mimeType: 'image/gif',
        dialogTitle: 'Share your GoldRush highlight!',
        UTI: 'com.compuserve.gif',
      });
      // Claim reward on first share of a new clip
      if (canReward && !rewardClaimed) {
        const granted = await consumeClipRewardSlot();
        if (granted) {
          await claimEventBonus({ xp: tier.xp, coins: tier.coins, credits: 0 });
          setRewardClaimed(true);
        }
      }
    } catch {
      Alert.alert('Share failed', 'Could not open the share sheet. Try again.');
    } finally {
      setSharing(false);
    }
  }, [gifBase64, sharing, canReward, rewardClaimed, tier, claimEventBonus]);

  // ── GIF data URI ─────────────────────────────────────────────────────────
  const gifUri = gifBase64 ? `data:image/gif;base64,${gifBase64}` : null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={cv.root}>
      <LinearGradient colors={['#080410', '#030208', '#050112']} style={StyleSheet.absoluteFill} />

      {/* ── Header ── */}
      <View style={[cv.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} style={cv.headerBtn} hitSlop={12}>
          <Feather name="x" size={20} color="#FFFFFF88" />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={cv.headerTitle}>YOUR CLIP</Text>
          <Text style={cv.headerSub}>{TYPE_LABEL[sourceType]}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/my-clips')}
          style={cv.headerBtn} hitSlop={12}
        >
          <Feather name="grid" size={18} color="#FFFFFF66" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >

        {/* ── Clip card ── */}
        <Reanimated.View entering={FadeInDown.duration(500).springify()} style={cv.clipCardWrap}>
          {/* Tier colour glow behind the card */}
          <View style={[cv.cardGlow, { shadowColor: tier.color }]} />

          <View style={cv.clipCard}>
            <LinearGradient
              colors={[tier.color + '18', '#00000000']}
              style={StyleSheet.absoluteFill}
            />
            {/* Top strip — tier accent */}
            <View style={[cv.cardStripe, { backgroundColor: tier.color }]} />

            {/* GIF area */}
            <View style={cv.gifArea}>
              {encoding && (
                <View style={cv.gifPlaceholder}>
                  <ActivityIndicator size="large" color={tier.color} />
                  <Text style={[cv.encodingTxt, { color: tier.color + 'CC' }]}>
                    Encoding clip…
                  </Text>
                </View>
              )}
              {encodeError && !encoding && (
                <View style={cv.gifPlaceholder}>
                  <Text style={{ fontSize: 36 }}>⚠️</Text>
                  <Text style={cv.errorTxt}>Encoding failed</Text>
                  <Pressable onPress={() => encode(sourceFrames.slice(trimStart, trimEnd + 1))}
                    style={cv.retryBtn}>
                    <Text style={cv.retryTxt}>Try again</Text>
                  </Pressable>
                </View>
              )}
              {gifUri && !encoding && (
                <Image
                  source={{ uri: gifUri }}
                  style={cv.gif}
                  contentFit="contain"
                  autoplay
                />
              )}

              {/* Sticker overlay */}
              {sticker && (
                <View style={cv.stickerOverlay} pointerEvents="none">
                  <Text style={{ fontSize: 44 }}>{sticker}</Text>
                </View>
              )}

              {/* Tier badge top-right */}
              <View style={[cv.tierBadge, { backgroundColor: tier.color + '25', borderColor: tier.color + '66' }]}>
                <Text style={{ fontSize: 11 }}>{tier.emoji}</Text>
                <Text style={[cv.tierBadgeTxt, { color: tier.color }]}>{tier.label.toUpperCase()}</Text>
              </View>
            </View>

            {/* Caption overlay */}
            {caption.length > 0 && (
              <View style={cv.captionBar}>
                <Text style={cv.captionTxt} numberOfLines={2}>{caption}</Text>
              </View>
            )}

            {/* Score row */}
            <View style={cv.scoreRow}>
              <Text style={cv.scoreLabel}>🎯  {sourceScore} deflections</Text>
              <Text style={[cv.scoreLabel, { color: '#FFFFFF44' }]}>
                {isFromLibrary ? '📁 Saved' : '🎮 Fresh clip'}
              </Text>
            </View>
          </View>
        </Reanimated.View>

        {/* ── Tool bar ── */}
        <Reanimated.View entering={FadeInUp.delay(200).duration(400)} style={cv.toolBar}>
          <ToolPill icon="✂️" label="TRIM"    active={activeTool === 'trim'}    accent="#FF8C00" onPress={() => toggleTool('trim')}    />
          <ToolPill icon="✏️" label="CAPTION" active={activeTool === 'caption'} accent="#00E5FF" onPress={() => toggleTool('caption')} />
          <ToolPill icon="😀" label="STICKER" active={activeTool === 'sticker'} accent="#C084FC" onPress={() => toggleTool('sticker')} />
        </Reanimated.View>

        {/* ── Trim panel ── */}
        {activeTool === 'trim' && (
          <Reanimated.View entering={FadeIn.duration(250)} style={cv.panel}>
            <Text style={cv.panelTitle}>SELECT CLIP RANGE</Text>
            {/* Start frame strip */}
            <Text style={cv.panelSubLabel}>START FRAME ({pendingStart + 1})</Text>
            <FrameStrip frames={sourceFrames} selectedIdx={pendingStart} onSelect={i => {
              if (i < pendingEnd) setPendingStart(i);
            }} />
            <Text style={[cv.panelSubLabel, { marginTop: 8 }]}>END FRAME ({pendingEnd + 1})</Text>
            <FrameStrip frames={sourceFrames} selectedIdx={pendingEnd} onSelect={i => {
              if (i > pendingStart) setPendingEnd(i);
            }} />
            <Text style={cv.trimInfo}>
              {pendingEnd - pendingStart + 1} frames selected
              {' '}(~{((pendingEnd - pendingStart + 1) / 4).toFixed(1)}s)
            </Text>
            <Pressable onPress={applyTrim} style={cv.applyBtn}>
              <LinearGradient colors={['#FF8C00', '#C85E00']} style={cv.applyBtnGrad}>
                <Text style={cv.applyBtnTxt}>APPLY TRIM</Text>
              </LinearGradient>
            </Pressable>
          </Reanimated.View>
        )}

        {/* ── Caption panel ── */}
        {activeTool === 'caption' && (
          <Reanimated.View entering={FadeIn.duration(250)} style={cv.panel}>
            <Text style={cv.panelTitle}>ADD A CAPTION</Text>
            <TextInput
              style={cv.captionInput}
              value={caption}
              onChangeText={setCaption}
              placeholder="Write something epic…"
              placeholderTextColor="#FFFFFF33"
              maxLength={80}
              multiline
              autoFocus
            />
            <Text style={cv.charCount}>{caption.length} / 80</Text>
            <Pressable onPress={() => setActiveTool(null)} style={cv.applyBtn}>
              <LinearGradient colors={['#00A0C8', '#006E8A']} style={cv.applyBtnGrad}>
                <Text style={cv.applyBtnTxt}>DONE</Text>
              </LinearGradient>
            </Pressable>
          </Reanimated.View>
        )}

        {/* ── Sticker panel ── */}
        {activeTool === 'sticker' && (
          <Reanimated.View entering={FadeIn.duration(250)} style={cv.panel}>
            <Text style={cv.panelTitle}>ADD A STICKER</Text>
            <View style={cv.stickerGrid}>
              {STICKERS.map(s => (
                <Pressable
                  key={s}
                  onPress={() => { setSticker(prev => (prev === s ? null : s)); setActiveTool(null); }}
                  style={[cv.stickerCell, sticker === s && { backgroundColor: '#C084FC30', borderColor: '#C084FC88' }]}
                >
                  <Text style={{ fontSize: 30 }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </Reanimated.View>
        )}

        {/* ── Reward preview (new clips only) ── */}
        {!isFromLibrary && !rewardClaimed && canReward && (
          <Reanimated.View entering={ZoomIn.delay(400).duration(500).springify()} style={cv.rewardCard}>
            <LinearGradient colors={[tier.color + '22', '#00000000']} style={StyleSheet.absoluteFill} />
            <Text style={cv.rewardTitle}>SHARE TO EARN</Text>
            <View style={cv.rewardRow}>
              <View style={cv.rewardPill}>
                <Text style={{ fontSize: 16 }}>🪙</Text>
                <Text style={[cv.rewardVal, { color: '#FFD700' }]}>+{tier.coins}</Text>
              </View>
              <View style={cv.rewardPill}>
                <Text style={{ fontSize: 16 }}>⭐</Text>
                <Text style={[cv.rewardVal, { color: '#C084FC' }]}>+{tier.xp} XP</Text>
              </View>
              <View style={[cv.rewardPill, { borderColor: tier.color + '66' }]}>
                <Text style={{ fontSize: 14 }}>{tier.emoji}</Text>
                <Text style={[cv.rewardVal, { color: tier.color }]}>{tier.label}</Text>
              </View>
            </View>
          </Reanimated.View>
        )}
        {rewardClaimed && (
          <Reanimated.View entering={ZoomIn.duration(400).springify()} style={[cv.rewardCard, { borderColor: '#00CC5544' }]}>
            <Text style={[cv.rewardTitle, { color: '#00CC55' }]}>✓ REWARD CLAIMED</Text>
            <Text style={cv.rewardSub}>+{tier.coins} coins · +{tier.xp} XP added to your account</Text>
          </Reanimated.View>
        )}

        {/* ── Action buttons ── */}
        <View style={cv.actionRow}>
          <Animated.View style={[{ flex: 1 }, { transform: [{ scale: saveAnim }] }]}>
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [cv.saveBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <LinearGradient
                colors={saved ? ['#00553A', '#003828'] : ['#1A1030', '#0E0820']}
                style={cv.saveBtnGrad}
              >
                <Feather name={saved ? 'check-circle' : 'bookmark'} size={18} color={saved ? '#00CC55' : '#FFFFFF88'} />
                <Text style={[cv.saveBtnTxt, saved && { color: '#00CC55' }]}>
                  {saved ? 'SAVED' : 'SAVE CLIP'}
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Pressable
            onPress={handleShare}
            disabled={!gifBase64 || sharing}
            style={({ pressed }) => [cv.shareBtn, { opacity: (pressed || sharing || !gifBase64) ? 0.75 : 1 }]}
          >
            <LinearGradient colors={[tier.color, tier.color + 'AA']} style={cv.shareBtnGrad}>
              {sharing
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Feather name="share-2" size={18} color="#FFF" />}
              <Text style={cv.shareBtnTxt}>
                {canReward && !rewardClaimed ? 'SHARE & EARN' : 'SHARE'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* View library link */}
        <Pressable onPress={() => router.push('/my-clips')} style={cv.libraryLink}>
          <Feather name="grid" size={14} color="#FFFFFF33" />
          <Text style={cv.libraryLinkTxt}>My Clips Library</Text>
          <Feather name="chevron-right" size={14} color="#FFFFFF33" />
        </Pressable>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_W = SW - 32;
const GIF_H  = CARD_W * 0.75;

const cv = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#050112' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 10, gap: 10 },
  headerBtn:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Rajdhani_700Bold', fontSize: 20, color: '#FFFFFF', letterSpacing: 2 },
  headerSub:   { fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#FFFFFF44', letterSpacing: 2 },

  // Clip card
  clipCardWrap: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  cardGlow: {
    position: 'absolute', width: CARD_W + 20, height: GIF_H + 120,
    borderRadius: 28, shadowRadius: 30, shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 }, elevation: 16,
  },
  clipCard: {
    width: CARD_W, borderRadius: 22, overflow: 'hidden',
    backgroundColor: '#0A0816', borderWidth: 1, borderColor: '#FFFFFF12',
  },
  cardStripe:   { height: 3, width: '100%' },
  gifArea:      { height: GIF_H, backgroundColor: '#000000', position: 'relative' },
  gif:          { width: '100%', height: '100%' },
  gifPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  encodingTxt:  { fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 0.5 },
  errorTxt:     { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FF5520' },
  retryBtn:     { borderRadius: 8, borderWidth: 1, borderColor: '#FF552055', paddingHorizontal: 16, paddingVertical: 6, marginTop: 4 },
  retryTxt:     { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#FF5520' },
  stickerOverlay: { position: 'absolute', bottom: 10, right: 10 },
  tierBadge: {
    position: 'absolute', top: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4,
  },
  tierBadgeTxt: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  captionBar:   { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#000000AA' },
  captionTxt:   { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#FFFFFF', textAlign: 'center', letterSpacing: 0.3 },
  scoreRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  scoreLabel:   { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#FFFFFF66', letterSpacing: 0.3 },

  // Tool bar
  toolBar:    { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  toolPill:   {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#FFFFFF18',
    backgroundColor: '#FFFFFF08', paddingVertical: 10,
  },
  toolPillTxt: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5, color: '#FFFFFF44' },

  // Panels
  panel:        { marginHorizontal: 16, marginTop: 12, backgroundColor: '#0C0A18', borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF0D', padding: 14, gap: 6 },
  panelTitle:   { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#FFFFFF44', letterSpacing: 2 },
  panelSubLabel:{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#FFFFFF33', letterSpacing: 1, marginTop: 6 },
  trimInfo:     { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#FFFFFF55', textAlign: 'center', marginTop: 4 },
  thumb:        { width: 54, height: 42, borderRadius: 7, overflow: 'hidden', backgroundColor: '#111', borderWidth: 1, borderColor: '#FFFFFF14' },
  thumbActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFD700', alignSelf: 'center', marginTop: 2 },
  applyBtn:     { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  applyBtnGrad: { paddingVertical: 12, alignItems: 'center' },
  applyBtnTxt:  { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FFFFFF', letterSpacing: 1.5 },
  captionInput: {
    backgroundColor: '#FFFFFF08', borderRadius: 10, borderWidth: 1, borderColor: '#FFFFFF18',
    color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 14,
    paddingHorizontal: 14, paddingVertical: 10, minHeight: 60, textAlignVertical: 'top',
  },
  charCount:    { fontFamily: 'Inter_400Regular', fontSize: 9, color: '#FFFFFF33', textAlign: 'right' },
  stickerGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingTop: 4 },
  stickerCell:  { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF14', backgroundColor: '#FFFFFF08' },

  // Reward card
  rewardCard: {
    marginHorizontal: 16, marginTop: 14, borderRadius: 16,
    borderWidth: 1, borderColor: '#FFD70033', overflow: 'hidden',
    padding: 14, gap: 8,
  },
  rewardTitle: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#FFD700', letterSpacing: 2 },
  rewardSub:   { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#FFFFFF55', textAlign: 'center' },
  rewardRow:   { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  rewardPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, borderWidth: 1, borderColor: '#FFFFFF1A', backgroundColor: '#FFFFFF08', paddingHorizontal: 12, paddingVertical: 6 },
  rewardVal:   { fontFamily: 'Inter_700Bold', fontSize: 13 },

  // Actions
  actionRow:   { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 16 },
  saveBtn:     { flex: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF18' },
  saveBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  saveBtnTxt:  { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FFFFFF88', letterSpacing: 1 },
  shareBtn:    { flex: 1.4, borderRadius: 14, overflow: 'hidden' },
  shareBtnGrad:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  shareBtnTxt: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FFFFFF', letterSpacing: 1 },

  // Library link
  libraryLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18, paddingVertical: 6 },
  libraryLinkTxt: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#FFFFFF33', letterSpacing: 0.5 },
});
