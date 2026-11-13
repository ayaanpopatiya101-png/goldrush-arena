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
   Dimensions, Keyboard, Linking,
  Platform, Pressable, ScrollView, StyleSheet,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { Image } from 'expo-image';
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
import { getClipTier, canClaimClipReward, consumeClipRewardSlot, clipRewardIdentity } from '@/utils/clipRewards';
import { exportClip, exportErrorMessage, WEB_PHOTOS_HELP } from '@/utils/clipExport';
import { usePlayer } from '@/context/PlayerContext';
import { trackEvent } from '@/utils/analytics';
import { Glyph } from '@/components/ui/Glyph';
import { Button, ScreenTitle, paperText } from '@/components/ui/Primitives';
import { tactile } from '@/constants/colors';
import { palette } from '@/constants/colors';

import { fonts } from '@/constants/typography';
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
        active && { backgroundColor: palette.raised, borderColor: accent },
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
              style={[cv.thumb, active && { borderColor: palette.ochre, borderRadius: 10, borderWidth: 2 }]}
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
  const shareSupported = true;
  const [notice, setNotice] = useState('');
  const [operation, setOperation] = useState<string | null>(null);
  const operationLock = useRef(false);
  const encodeVersion = useRef(0);
  useEffect(() => () => { encodeVersion.current++; }, []);

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
    canClaimClipReward().then(setCanReward).catch(() => setCanReward(false));
  }, [isFromLibrary]);

  // ── Load source (pending clip OR library clip) ────────────────────────────
  useEffect(() => {
    let alive = true;
    setLoadState('loading');
    setGifBase64(null);
    setSourceFrames([]);
    setSaved(false);
    setSourceSavedId(null);
    setIsFromLibrary(false);
    encodeVersion.current++;
    if (savedClipId) {
      // Load from library
      getClipLibrary().then(lib => {
        if (!alive) return;
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
        // Re-encode recorded frames, repairing absent or corrupt legacy GIF caches.
        setLoadState('ready');
      }).catch(() => { if (alive) setLoadState('missing'); });
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
    return () => { alive = false; };
  }, [savedClipId]);

  // ── Encode GIF when frames load (and when trim is applied) ───────────────
  useEffect(() => {
    if (sourceFrames.length === 0) return;
    encode(sourceFrames);
  }, [sourceFrames]);

  function encode(frames: string[]) {
    const version = ++encodeVersion.current;
    setGifBase64(null);
    setEncoding(true);
    setEncodeError(false);
    setTimeout(() => {
      if (version !== encodeVersion.current) return;
      encodeFrames(frames)
        .then(b64 => { if (version === encodeVersion.current) setGifBase64(b64); })
        .catch(() => { if (version === encodeVersion.current) setEncodeError(true); })
        .finally(() => { if (version === encodeVersion.current) setEncoding(false); });
    }, 50);
  }
  useEffect(() => { setSaved(false); }, [trimStart, trimEnd, caption, sticker]);

  // ── Tool handlers ─────────────────────────────────────────────────────────
  function toggleTool(t: 'trim' | 'caption' | 'sticker') {
    Keyboard.dismiss();
    setActiveTool(prev => (prev === t ? null : t));
  }

  function applyTrim() {
    if (operationLock.current || encoding || pendingEnd <= pendingStart) return;
    const trimmed = sourceFrames.slice(pendingStart, pendingEnd + 1);
    setTrimStart(pendingStart);
    setTrimEnd(pendingEnd);
    setGifBase64(null); // triggers re-encode
    encode(trimmed);
    setActiveTool(null);
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!gifBase64 || encoding || operationLock.current) return;
    operationLock.current = true;
    setOperation('Saving to My Clips…');
    setNotice('');
    try {
    const frames = sourceFrames.slice(trimStart, trimEnd + 1);
    const clipData: Omit<SavedClip, 'id' | 'timestamp'> = {
      frames, gifBase64, type: sourceType, score: sourceScore,
      clipScore: sourceClipScore, tier: tier.label, tierColor: tier.color,
      caption: caption || undefined, sticker: sticker || undefined,
    };
    if (sourceSavedId) {
      // Update existing
      await updateClipInLibrary(sourceSavedId, { frames, gifBase64, caption: caption || undefined, sticker: sticker || undefined });
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
    setNotice('Saved to My Clips on this device. This is not a Photos save.');
    } catch (error) {
      setNotice(`My Clips save failed. ${error instanceof Error ? error.message : 'Check device storage and retry.'}`);
    } finally {
      operationLock.current = false;
      setOperation(null);
    }
  }, [gifBase64, encoding, sourceFrames, trimStart, trimEnd, sourceType, sourceScore, sourceClipScore, caption, sticker, sourceSavedId, tier]);

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async (action: 'share' | 'download' | 'photos') => {
    if (!gifBase64 || encoding || operationLock.current) return;
    operationLock.current = true;
    setSharing(true);
    setOperation(action === 'photos' ? 'Saving GIF to Photos…' : 'Exporting GIF…');
    setNotice('');
    try {
      const result = await exportClip(gifBase64, action);
      setNotice(result);
      // Preserve the existing native share-sheet bonus, NOT a social-post claim.
      // Photos saves and browser exports never grant progression rewards.
      let rewardClaimedForShare = rewardClaimed;
      if (Platform.OS !== 'web' && action === 'share' && !isFromLibrary && canReward && !rewardClaimed) {
        const granted = await consumeClipRewardSlot(clipRewardIdentity(sourceFrames));
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
    } catch (error) {
      setNotice(exportErrorMessage(error));
    } finally {
      operationLock.current = false;
      setOperation(null);
      setSharing(false);
    }
  }, [gifBase64, encoding, isFromLibrary, sourceFrames, canReward, rewardClaimed, tier, claimEventBonus]);

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
              <View style={{ backgroundColor: palette.surface, borderRadius: 10, borderWidth: 2, borderColor: palette.edge, padding: 14 }}>
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
          <Feather name="x" size={20} color={palette.foreground} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={cv.headerTitle}>YOUR CLIP</Text>
          <Text style={cv.headerSub}>{TYPE_LABEL[sourceType]}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/my-clips')}
          style={cv.headerBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="My clips library"
        >
          <Feather name="grid" size={18} color={palette.supporting} />
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
                  <Feather name="alert-triangle" size={30} color={palette.supporting} />
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
                  onError={() => { setGifBase64(null); setEncodeError(true); }}
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
            <Pressable onPress={applyTrim} disabled={encoding || !!operation} style={cv.applyBtn}>
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
                  style={[cv.stickerCell, sticker === s && { backgroundColor: palette.raised, borderColor: palette.ochre, borderRadius: 10, borderWidth: 2 }]}
                >
                  <Glyph style={{ fontSize: 30 }} value={s} />
                </Pressable>
              ))}
            </View>
          </Reanimated.View>
        )}

        {/* ── Reward preview (new clips only) ── */}
        {Platform.OS === 'web' && (
          <View style={[cv.rewardCard, { borderColor: palette.border }]}>
            <Text style={cv.stateBody}>{WEB_PHOTOS_HELP}</Text>
          </View>
        )}
        {Platform.OS !== 'web' && !isFromLibrary && !rewardClaimed && canReward && (
          <Reanimated.View entering={ZoomIn.delay(400).duration(500).springify()} style={cv.rewardCard}>
            <Text style={cv.rewardTitle}>Share reward: granted after the share sheet closes, whether or not you send it</Text>
            <View style={cv.rewardRow}>
              <View style={cv.rewardPill}>
                <Feather name="disc" size={15} color={palette.ochre} />
                <Text style={[cv.rewardVal, { color: palette.foreground }]}>+{tier.coins}</Text>
              </View>
              <View style={cv.rewardPill}>
                <Feather name="star" size={15} color={palette.foreground} />
                <Text style={[cv.rewardVal, { color: palette.foreground }]}>+{tier.xp} XP</Text>
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
            <Text style={[cv.rewardTitle, { color: palette.foreground }]}>Share reward claimed</Text>
            <Text style={cv.rewardSub}>+{tier.coins} coins · +{tier.xp} XP added to your account</Text>
          </Reanimated.View>
        )}

        {/* ── Action buttons ── */}
        <View style={cv.actionRow}>
          <Animated.View style={[{ flex: 1 }, { transform: [{ scale: saveAnim }] }]}>
            <Pressable
              onPress={handleSave}
              disabled={!gifBase64 || encoding || !!operation}
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Saved to this device' : 'Save clip to this device'}
              style={({ pressed }) => [cv.saveBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={cv.saveBtnGrad}>
                <Feather name={saved ? 'check-circle' : 'bookmark'} size={18} color={saved ? palette.moss : palette.paper} />
                <Text style={[cv.saveBtnTxt, saved && { color: palette.foreground }]}>
                  {saved ? 'Saved to My Clips' : 'Save to My Clips'}
                </Text>
              </View>
            </Pressable>
          </Animated.View>

          {shareSupported ? <Pressable
            onPress={() => void handleExport('share')}
            disabled={!gifBase64 || encoding || !!operation}
            accessibilityRole="button"
            accessibilityState={{ disabled: !gifBase64 || sharing, busy: sharing }}
            style={({ pressed }) => [cv.shareBtn, { opacity: (pressed || sharing || !gifBase64) ? 0.75 : 1 }]}
          >
            <View style={cv.shareBtnGrad}>
              {sharing
                ? <ActivityIndicator size="small" color={palette.onAccent} />
                : <Feather name="share-2" size={18} color={palette.onAccent} />}
              <Text style={cv.shareBtnTxt}>
                {gifBase64 ? 'Share GIF' : 'Preparing'}
              </Text>
            </View>
          </Pressable> : null}
        </View>
        <Button
          label={Platform.OS === 'web' ? 'Download GIF' : 'Save to Photos'}
          icon="download"
          disabled={!gifBase64 || encoding || !!operation}
          onPress={() => void handleExport(Platform.OS === 'web' ? 'download' : 'photos')}
        />
        {Platform.OS !== 'web' && <Text style={cv.stateBody}>Animated GIF, not MP4. Photos saving only adds this GIF; it does not need access to your existing library. Caption and sticker are library decorations, not included in the GIF.</Text>}
        {operation && <Text accessibilityLiveRegion="polite" style={cv.stateBody}>{operation}</Text>}
        {!!notice && <Text accessibilityRole="alert" style={cv.stateBody}>{notice}</Text>}
        {Platform.OS !== 'web' && /permission|access/i.test(notice) && <Button label="Open device Settings" variant="ghost" onPress={() => { void Linking.openSettings().catch(() => setNotice('Open Settings manually and allow GoldRush to add photos.')); }} />}

        {/* View library link */}
        <Pressable onPress={() => router.push('/my-clips')} style={cv.libraryLink}>
          <Feather name="grid" size={14} color={palette.supporting} />
          <Text style={cv.libraryLinkTxt}>My Clips Library</Text>
          <Feather name="chevron-right" size={14} color={palette.supporting} />
        </Pressable>

      </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_W = Math.min(SW - 32, 720);

const cv = StyleSheet.create({
  root:   { flex: 1, backgroundColor: palette.background },
  column: { width: '100%', maxWidth: 720, paddingHorizontal: 16, gap: 12 },
  skel:   { backgroundColor: palette.surface, borderRadius: 8 },
  stateTitle: { fontFamily: fonts.display, fontSize: 27, color: palette.foreground },
  stateBody:  { fontFamily: 'SourceSans3_400Regular', fontSize: 16, lineHeight: 23, color: palette.supporting },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: palette.border, marginBottom: 12 },
  headerBtn:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 2, borderColor: palette.border },
  headerTitle: { fontFamily: fonts.display, fontSize: 24, color: palette.foreground, letterSpacing: 1 },
  headerSub:   { fontFamily: 'SourceSans3_600SemiBold', fontSize: 13, color: palette.muted },

  clipCardWrap: { width: '100%' },
  cardGlow: { position: 'absolute' },
  clipCard: { width: '100%', borderRadius: 10, overflow: 'hidden', backgroundColor: palette.surface, borderWidth: 2, borderColor: palette.border },
  cardStripe:   { height: 3, width: '100%' },
  gifArea:      { width: '100%', aspectRatio: 4 / 3, maxHeight: CARD_W * 0.75, backgroundColor: palette.background, position: 'relative' },
  gif:          { width: '100%', height: '100%' },
  gifPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  encodingTxt:  { fontFamily: 'SourceSans3_600SemiBold', fontSize: 15 },
  errorTxt:     { fontFamily: 'SourceSans3_700Bold', fontSize: 16, color: palette.supporting },
  retryBtn:     { borderRadius: 10, borderWidth: 2, borderColor: palette.border, paddingHorizontal: 18, minHeight: 44, justifyContent: 'center', marginTop: 4 },
  retryTxt:     { fontFamily: 'SourceSans3_700Bold', fontSize: 15, color: palette.supporting },
  stickerOverlay: { position: 'absolute', bottom: 10, right: 10 },
  tierBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, borderWidth: 2, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: palette.background },
  tierBadgeTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 0.5 },
  captionBar:   { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: palette.raised },
  captionTxt:   { fontFamily: 'SourceSans3_600SemiBold', fontSize: 16, color: palette.foreground, textAlign: 'center' },
  scoreRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  scoreLabel:   { fontFamily: 'SourceSans3_600SemiBold', fontSize: 14, color: palette.supporting },

  toolBar:    { flexDirection: 'row', gap: 8 },
  toolPill:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, borderWidth: 2, borderColor: palette.border, minHeight: 46 },
  toolPillTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 15, color: palette.foreground },

  panel:        { backgroundColor: palette.surface, borderRadius: 10, borderWidth: 2, borderColor: palette.border, padding: 14, gap: 6 },
  panelTitle:   { fontFamily: 'SourceSans3_700Bold', fontSize: 14, color: palette.muted, letterSpacing: 0.5 },
  panelSubLabel:{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 14, color: palette.supporting, marginTop: 6 },
  trimInfo:     { fontFamily: 'SourceSans3_400Regular', fontSize: 14, color: palette.supporting, marginTop: 4 },
  thumb:        { width: 60, height: 46, borderRadius: 8, overflow: 'hidden', backgroundColor: palette.background, borderWidth: 1, borderColor: palette.border },
  thumbActiveDot: { width: 6, height: 6, borderRadius: 8, backgroundColor: palette.ochre, alignSelf: 'center', marginTop: 2 },
  applyBtn:     { borderRadius: 10, overflow: 'hidden', marginTop: 8 },
  applyBtnGrad: { minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ochre },
  applyBtnTxt:  { fontFamily: 'SourceSans3_700Bold', fontSize: 16, color: palette.onAccent },
  captionInput: { backgroundColor: palette.raised, borderRadius: 8, borderWidth: 1, borderColor: palette.border, color: palette.foreground, fontFamily: 'SourceSans3_400Regular', fontSize: 16, paddingHorizontal: 14, paddingVertical: 10, minHeight: 64, textAlignVertical: 'top' },
  charCount:    { fontFamily: 'SourceSans3_400Regular', fontSize: 13, color: palette.muted, textAlign: 'right' },
  stickerGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
  stickerCell:  { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 2, borderColor: palette.border },

  rewardCard: { borderRadius: 10, borderWidth: 2, borderColor: palette.ochre, backgroundColor: palette.surface, padding: 14, gap: 10 },
  rewardTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 15, color: palette.foreground },
  rewardSub:   { fontFamily: 'SourceSans3_400Regular', fontSize: 14, color: palette.supporting },
  rewardRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rewardPill:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, borderWidth: 2, borderColor: palette.border, paddingHorizontal: 12, paddingVertical: 6 },
  rewardVal:   { fontFamily: 'SourceSans3_700Bold', fontSize: 15 },

  actionRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  saveBtn:     { flexGrow: 1, flexBasis: 200, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: palette.border },
  saveBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, backgroundColor: palette.surface },
  saveBtnTxt:  { fontFamily: 'SourceSans3_700Bold', fontSize: 16, color: palette.foreground },
  shareBtn:    { flexGrow: 1, flexBasis: 200, borderRadius: 10, overflow: 'hidden' },
  shareBtnGrad:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, backgroundColor: palette.ochre },
  shareBtnTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 16, color: palette.onAccent },

  libraryLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 },
  libraryLinkTxt: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 15, color: palette.supporting },
});
