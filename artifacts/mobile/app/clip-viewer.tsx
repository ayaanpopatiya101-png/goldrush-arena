import { Text } from '@/components/ui/Text';
/**
 * Full-screen clip viewer, editor, and share screen.
 *
 * Entry points:
 *   • After game, postgame.tsx pushes here when a pending clip exists.
 *   • From library, my-clips.tsx pushes here with ?savedClipId=<id>.
 *
 * Features:
 *   • GIF playback (auto-encoded on mount, re-encoded after trim)
 *   • Trim tool, frame strip + start/end picker
 *   • Caption tool, text overlay below the clip
 *   • Sticker tool, emoji overlay pinned to the clip card
 *   • Save to My Clips (AsyncStorage library, max 10)
 *   • Share via native share sheet (writes temp GIF to cache)
 *   • Claim reward XP + coins after sharing (new clips only)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated,
  Dimensions, InteractionManager, Keyboard,
  Platform, Pressable, ScrollView, StyleSheet,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { trackEvent } from '@/utils/analytics';
import { Glyph } from '@/components/ui/Glyph';
import { Button, ScreenTitle, paperText } from '@/components/ui/Primitives';
import { tactile } from '@/constants/colors';
import { palette } from '@/constants/colors';

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
}: { icon: React.ComponentProps<typeof Feather>['name']; label: string; active: boolean; onPress: () => void; accent: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: active }}
      style={[
        cv.toolPill,
        active && { backgroundColor: palette.graphite2, borderColor: accent },
      ]}
    >
      <Feather name={icon} size={16} color={active ? accent : palette.paperDim} />
      <Text style={[cv.toolPillTxt, active && { color: accent }]}>{label}</Text>
    </Pressable>
  );
}

function FrameStrip({
  frames, selectedIdx, onSelect,
}: { frames: string[]; selectedIdx: number; onSelect: (i: number) => void }) {
  // Sample evenly, show up to 12 thumbnails
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
              style={[cv.thumb, active && { borderColor: palette.ochre, borderWidth: 2 }]}
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

  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const shareSupported = Platform.OS !== 'web';

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
        if (!c || !Array.isArray(c.frames) || c.frames.length === 0) { setLoadState('missing'); return; }
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
        setLoadState('ready');
      }).catch(() => setLoadState('missing'));
    } else {
      // Fresh clip from game
      const pending = getPendingClip();
      if (!pending || pending.frames.length === 0) { setLoadState('missing'); return; }
      setSourceFrames(pending.frames);
      setSourceType(pending.type);
      setSourceScore(pending.score);
      setSourceClipScore(pending.clipScore);
      setTrimStart(0); setTrimEnd(pending.frames.length - 1);
      setPendingStart(0); setPendingEnd(pending.frames.length - 1);
      setLoadState('ready');
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
    trackEvent('clip_saved', {
      source: sourceSavedId ? 'library_update' : 'new_clip',
      clip_type: sourceType,
      tier: tier.label,
      has_caption: Boolean(caption),
      has_sticker: Boolean(sticker),
    });
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
      if (!await Sharing.isAvailableAsync()) {
        Alert.alert('Sharing unavailable', 'Use a supported device to open the share sheet. No share reward was claimed.');
        return;
      }
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
      let rewardClaimedForShare = rewardClaimed;
      if (canReward && !rewardClaimed) {
        const granted = await consumeClipRewardSlot();
        if (granted) {
          await claimEventBonus({ xp: tier.xp, coins: tier.coins, credits: 0 });
          setRewardClaimed(true);
          rewardClaimedForShare = true;
        }
      }
      trackEvent('clip_share_sheet_returned', {
        source: isFromLibrary ? 'library' : 'new_clip',
        clip_type: sourceType,
        tier: tier.label,
        reward_claimed: rewardClaimedForShare,
      });
    } catch {
      Alert.alert('Share failed', 'Could not open the share sheet. Try again.');
    } finally {
      setSharing(false);
    }
  }, [gifBase64, sharing, canReward, rewardClaimed, tier, claimEventBonus]);

  // ── GIF data URI ─────────────────────────────────────────────────────────
  const gifUri = gifBase64 ? `data:image/gif;base64,${gifBase64}` : null;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/my-clips'));

  if (loadState !== 'ready') {
    return (
      <View style={[cv.root, { paddingTop: insets.top + 24, paddingHorizontal: 20, alignItems: 'center' }]}>
        <View style={{ width: '100%', maxWidth: 520, gap: 14 }}>
          {loadState === 'loading' ? (
            <>
              <View style={[cv.skel, { height: 28, width: 160 }]} />
              <View style={[cv.skel, { aspectRatio: 4 / 3, width: '100%' }]} />
              <Text style={cv.stateBody}>Loading clip from this device.</Text>
            </>
          ) : (
            <>
              <ScreenTitle kicker="Clip viewer" title="No clip" />
              <View style={{ backgroundColor: tactile.paperPanel, borderWidth: 2, borderColor: tactile.brassEdge, padding: 14 }}>
              <Text style={[cv.stateBody, { color: paperText.ink }]}>
                {savedClipId
                  ? 'This clip is not in your library on this device. It may have been deleted or the link is out of date.'
                  : 'There is no fresh match clip waiting. Clips are kept in memory only until you save them, so they are lost after a refresh.'}
              </Text>
              </View>
              <Button label="Open My Clips" size="lg" onPress={() => router.replace('/my-clips')} />
              <Button label="Return home" variant="ghost" onPress={() => router.replace('/')} />
            </>
          )}
        </View>
      </View>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={cv.root}>
      {/* ── Header ── */}
      <View style={[cv.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={close} style={cv.headerBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close clip">
          <Feather name="x" size={20} color={palette.paper} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={cv.headerTitle}>YOUR CLIP</Text>
          <Text style={cv.headerSub}>{TYPE_LABEL[sourceType]}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/my-clips')}
          style={cv.headerBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="My clips library"
        >
          <Feather name="grid" size={18} color={palette.paperDim} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 48, alignItems: 'center' }}
      >
      <View style={cv.column}>

        {/* ── Clip card ── */}
        <Reanimated.View entering={FadeInDown.duration(500).springify()} style={cv.clipCardWrap}>

          <View style={cv.clipCard}>
            {/* Top strip, tier accent */}
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
                  <Feather name="alert-triangle" size={30} color={palette.clay} />
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
                  <Glyph style={{ fontSize: 44 }} value={sticker} />
                </View>
              )}

              {/* Tier badge top-right */}
              <View style={[cv.tierBadge, { backgroundColor: tier.color + '25', borderColor: tier.color + '66' }]}>
                <Glyph style={{ fontSize: 11 }} value={tier.emoji} />
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
              <Text style={cv.scoreLabel}>{sourceScore} deflections</Text>
              <Text style={cv.scoreLabel}>
                {isFromLibrary ? 'Saved on this device' : 'Not saved yet'}
              </Text>
            </View>
          </View>
        </Reanimated.View>

        {/* ── Tool bar ── */}
        <Reanimated.View entering={FadeInUp.delay(200).duration(400)} style={cv.toolBar}>
          <ToolPill icon="scissors" label="Trim"    active={activeTool === 'trim'}    accent={palette.ochre} onPress={() => toggleTool('trim')}    />
          <ToolPill icon="type" label="Caption" active={activeTool === 'caption'} accent={palette.ochre} onPress={() => toggleTool('caption')} />
          <ToolPill icon="smile" label="Sticker" active={activeTool === 'sticker'} accent={palette.ochre} onPress={() => toggleTool('sticker')} />
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
              {Platform.OS !== 'web' ? ` · ${((pendingEnd - pendingStart + 1) / 3).toFixed(1)}s at 3 frames per second` : ''}
            </Text>
            <Pressable onPress={applyTrim} style={cv.applyBtn}>
              <View style={cv.applyBtnGrad}>
                <Text style={cv.applyBtnTxt}>Apply trim</Text>
              </View>
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
              placeholder="Add a caption"
              placeholderTextColor={palette.muted}
              maxLength={80}
              multiline
              autoFocus
            />
            <Text style={cv.charCount}>{caption.length} / 80</Text>
            <Pressable onPress={() => setActiveTool(null)} style={cv.applyBtn}>
              <View style={cv.applyBtnGrad}>
                <Text style={cv.applyBtnTxt}>Done</Text>
              </View>
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
                  accessibilityRole="button" accessibilityState={{ selected: sticker === s }}
                  style={[cv.stickerCell, sticker === s && { backgroundColor: palette.graphite2, borderColor: palette.ochre, borderWidth: 2 }]}
                >
                  <Glyph style={{ fontSize: 30 }} value={s} />
                </Pressable>
              ))}
            </View>
          </Reanimated.View>
        )}

        {/* ── Reward preview (new clips only) ── */}
        {!shareSupported && (
          <View style={[cv.rewardCard, { borderColor: palette.line }]}>
            <Text style={cv.stateBody}>Sharing clips needs the iOS or Android app. In the browser you can trim, caption and save to this device only.</Text>
          </View>
        )}
        {shareSupported && !isFromLibrary && !rewardClaimed && canReward && (
          <Reanimated.View entering={ZoomIn.delay(400).duration(500).springify()} style={cv.rewardCard}>
            <Text style={cv.rewardTitle}>Share reward: granted after the share sheet closes, whether or not you send it</Text>
            <View style={cv.rewardRow}>
              <View style={cv.rewardPill}>
                <Feather name="disc" size={15} color={palette.ochre} />
                <Text style={[cv.rewardVal, { color: palette.charcoal }]}>+{tier.coins}</Text>
              </View>
              <View style={cv.rewardPill}>
                <Feather name="star" size={15} color={palette.paper} />
                <Text style={[cv.rewardVal, { color: palette.paper }]}>+{tier.xp} XP</Text>
              </View>
              <View style={[cv.rewardPill, { borderColor: tier.color + '66' }]}>
                <Glyph style={{ fontSize: 14 }} value={tier.emoji} />
                <Text style={[cv.rewardVal, { color: tier.color }]}>{tier.label}</Text>
              </View>
            </View>
          </Reanimated.View>
        )}
        {rewardClaimed && (
          <Reanimated.View entering={ZoomIn.duration(400).springify()} style={[cv.rewardCard, { borderColor: palette.moss }]}>
            <Text style={[cv.rewardTitle, { color: palette.charcoal }]}>Share reward claimed</Text>
            <Text style={cv.rewardSub}>+{tier.coins} coins · +{tier.xp} XP added to your account</Text>
          </Reanimated.View>
        )}

        {/* ── Action buttons ── */}
        <View style={cv.actionRow}>
          <Animated.View style={[{ flex: 1 }, { transform: [{ scale: saveAnim }] }]}>
            <Pressable
              onPress={handleSave}
              disabled={!gifBase64}
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Saved to this device' : 'Save clip to this device'}
              style={({ pressed }) => [cv.saveBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={cv.saveBtnGrad}>
                <Feather name={saved ? 'check-circle' : 'bookmark'} size={18} color={saved ? palette.moss : palette.paper} />
                <Text style={[cv.saveBtnTxt, saved && { color: palette.charcoal }]}>
                  {saved ? 'Saved on this device' : 'Save to this device'}
                </Text>
              </View>
            </Pressable>
          </Animated.View>

          {shareSupported ? <Pressable
            onPress={handleShare}
            disabled={!gifBase64 || sharing}
            accessibilityRole="button"
            accessibilityState={{ disabled: !gifBase64 || sharing, busy: sharing }}
            style={({ pressed }) => [cv.shareBtn, { opacity: (pressed || sharing || !gifBase64) ? 0.75 : 1 }]}
          >
            <View style={cv.shareBtnGrad}>
              {sharing
                ? <ActivityIndicator size="small" color={palette.ochreInk} />
                : <Feather name="share-2" size={18} color={palette.ochreInk} />}
              <Text style={cv.shareBtnTxt}>
                {gifBase64 ? 'Open share sheet' : 'Preparing'}
              </Text>
            </View>
          </Pressable> : null}
        </View>

        {/* View library link */}
        <Pressable onPress={() => router.push('/my-clips')} style={cv.libraryLink}>
          <Feather name="grid" size={14} color={palette.paperDim} />
          <Text style={cv.libraryLinkTxt}>My Clips Library</Text>
          <Feather name="chevron-right" size={14} color={palette.paperDim} />
        </Pressable>

      </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_W = Math.min(SW - 32, 720);

const cv = StyleSheet.create({
  root:   { flex: 1, backgroundColor: palette.ink },
  column: { width: '100%', maxWidth: 720, paddingHorizontal: 16, gap: 12 },
  skel:   { backgroundColor: palette.graphite, borderRadius: 2 },
  stateTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 32, color: palette.paper },
  stateBody:  { fontFamily: 'SourceSans3_400Regular', fontSize: 16, lineHeight: 23, color: palette.paperDim },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: palette.line, marginBottom: 12 },
  headerBtn:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 0, borderWidth: 2, borderColor: palette.line },
  headerTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 24, color: palette.paper, letterSpacing: 1 },
  headerSub:   { fontFamily: 'SourceSans3_600SemiBold', fontSize: 13, color: palette.muted },

  clipCardWrap: { width: '100%' },
  cardGlow: { position: 'absolute' },
  clipCard: { width: '100%', borderRadius: 0, overflow: 'hidden', backgroundColor: palette.graphite, borderWidth: 2, borderColor: palette.line },
  cardStripe:   { height: 3, width: '100%' },
  gifArea:      { width: '100%', aspectRatio: 4 / 3, maxHeight: CARD_W * 0.75, backgroundColor: palette.ink, position: 'relative' },
  gif:          { width: '100%', height: '100%' },
  gifPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  encodingTxt:  { fontFamily: 'SourceSans3_600SemiBold', fontSize: 15 },
  errorTxt:     { fontFamily: 'SourceSans3_700Bold', fontSize: 16, color: palette.clay },
  retryBtn:     { borderRadius: 0, borderWidth: 2, borderColor: palette.clay, paddingHorizontal: 18, minHeight: 44, justifyContent: 'center', marginTop: 4 },
  retryTxt:     { fontFamily: 'SourceSans3_700Bold', fontSize: 15, color: palette.clay },
  stickerOverlay: { position: 'absolute', bottom: 10, right: 10 },
  tierBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 0, borderWidth: 2, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: palette.ink },
  tierBadgeTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 0.5 },
  captionBar:   { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: palette.graphite2 },
  captionTxt:   { fontFamily: 'SourceSans3_600SemiBold', fontSize: 16, color: palette.paper, textAlign: 'center' },
  scoreRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  scoreLabel:   { fontFamily: 'SourceSans3_600SemiBold', fontSize: 14, color: palette.paperDim },

  toolBar:    { flexDirection: 'row', gap: 8 },
  toolPill:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 0, borderWidth: 2, borderColor: palette.line, minHeight: 46 },
  toolPillTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 15, color: palette.paper },

  panel:        { backgroundColor: palette.graphite, borderRadius: 0, borderWidth: 2, borderColor: palette.line, padding: 14, gap: 6 },
  panelTitle:   { fontFamily: 'SourceSans3_700Bold', fontSize: 14, color: palette.muted, letterSpacing: 0.5 },
  panelSubLabel:{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 14, color: palette.paperDim, marginTop: 6 },
  trimInfo:     { fontFamily: 'SourceSans3_400Regular', fontSize: 14, color: palette.paperDim, marginTop: 4 },
  thumb:        { width: 60, height: 46, borderRadius: 2, overflow: 'hidden', backgroundColor: palette.ink, borderWidth: 1, borderColor: palette.line },
  thumbActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.ochre, alignSelf: 'center', marginTop: 2 },
  applyBtn:     { borderRadius: 0, overflow: 'hidden', marginTop: 8 },
  applyBtnGrad: { minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ochre },
  applyBtnTxt:  { fontFamily: 'SourceSans3_700Bold', fontSize: 16, color: palette.ochreInk },
  captionInput: { backgroundColor: palette.graphite2, borderRadius: 3, borderWidth: 1, borderColor: palette.line, color: palette.paper, fontFamily: 'SourceSans3_400Regular', fontSize: 16, paddingHorizontal: 14, paddingVertical: 10, minHeight: 64, textAlignVertical: 'top' },
  charCount:    { fontFamily: 'SourceSans3_400Regular', fontSize: 13, color: palette.muted, textAlign: 'right' },
  stickerGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
  stickerCell:  { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 0, borderWidth: 2, borderColor: palette.line },

  rewardCard: { borderRadius: 0, borderWidth: 2, borderColor: palette.ochre, backgroundColor: palette.graphite, padding: 14, gap: 10 },
  rewardTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 15, color: palette.charcoal },
  rewardSub:   { fontFamily: 'SourceSans3_400Regular', fontSize: 14, color: palette.paperDim },
  rewardRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rewardPill:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 0, borderWidth: 2, borderColor: palette.line, paddingHorizontal: 12, paddingVertical: 6 },
  rewardVal:   { fontFamily: 'SourceSans3_700Bold', fontSize: 15 },

  actionRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  saveBtn:     { flexGrow: 1, flexBasis: 200, borderRadius: 0, overflow: 'hidden', borderWidth: 2, borderColor: palette.line },
  saveBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, backgroundColor: palette.graphite },
  saveBtnTxt:  { fontFamily: 'SourceSans3_700Bold', fontSize: 16, color: palette.paper },
  shareBtn:    { flexGrow: 1, flexBasis: 200, borderRadius: 0, overflow: 'hidden' },
  shareBtnGrad:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, backgroundColor: palette.ochre },
  shareBtnTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 16, color: palette.ochreInk },

  libraryLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 },
  libraryLinkTxt: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 15, color: palette.paperDim },
});
