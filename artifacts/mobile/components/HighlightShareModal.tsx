/**
 * HighlightShareModal
 *
 * Bottom-sheet shown from the post-game results screen when a highlight clip
 * was captured.  Encodes the JPEG frames to an animated GIF (deferred after
 * the open animation so the spinner renders first), then shows:
 *   • the clip tier badge + reward breakdown (coins + XP)
 *   • an animated GIF preview via expo-image
 *   • a "Share & Earn" button — shares via native share sheet then grants
 *     the coin/XP reward (up to MAX_DAILY_REWARDS clips rewarded per day)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  InteractionManager,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { createHighlightGIF } from '@/utils/gifEncoder';
import {
  getClipTier,
  consumeClipRewardSlot,
  getRemainingClipRewards,
  MAX_DAILY_REWARDS,
  type ClipTier,
} from '@/utils/clipRewards';
import { usePlayer } from '@/context/PlayerContext';

// ── Types ─────────────────────────────────────────────────────────────────────
export type HighlightType = 'multi_block' | 'near_death' | 'hot_streak' | 'manual';

const TYPE_LABELS: Record<HighlightType, string> = {
  multi_block: '🌊 MULTI-BALL BLOCK',
  near_death:  '❤️  NEAR-DEATH SAVE',
  hot_streak:  '🔥 HOT STREAK',
  manual:      '📹 YOUR CLIP',
};

const GIF_W   = 200;
const GIF_H   = 200;
const GIF_FPS = 4;

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  visible:       boolean;
  onClose:       () => void;
  frames:        string[];         // base64 JPEG strings
  highlightType: HighlightType;
  score:         number;           // deflection count
  clipScore:     number;           // quality score → tier
}

export function HighlightShareModal({
  visible, onClose, frames, highlightType, score, clipScore,
}: Props) {
  const { claimEventBonus } = usePlayer();

  const [gifUri,         setGifUri]         = useState<string | null>(null);
  const [encoding,       setEncoding]       = useState(false);
  const [shareError,     setShareError]     = useState(false);
  const [rewarded,       setRewarded]       = useState(false);
  const [rewardGranted,  setRewardGranted]  = useState<{ coins: number; xp: number } | null>(null);
  const [remainingToday, setRemainingToday] = useState<number>(MAX_DAILY_REWARDS);
  const [sharing,        setSharing]        = useState(false);

  const tier     = getClipTier(clipScore);
  const taskRef  = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);
  const rewardPulse = useRef(new Animated.Value(1)).current;

  // ── Encode GIF when modal opens ───────────────────────────────────────────
  useEffect(() => {
    if (!visible || frames.length === 0) return;
    setGifUri(null);
    setShareError(false);
    setRewarded(false);
    setRewardGranted(null);
    setEncoding(true);

    // Check remaining rewards while encoding
    getRemainingClipRewards().then(setRemainingToday);

    taskRef.current = InteractionManager.runAfterInteractions(async () => {
      try {
        const gifBytes = createHighlightGIF(frames, GIF_W, GIF_H, GIF_FPS);

        // Uint8Array → base64 (4 KB chunks to avoid call-stack overflow)
        const CHUNK = 4096;
        let b64 = '';
        for (let i = 0; i < gifBytes.length; i += CHUNK) {
          b64 += String.fromCharCode(...gifBytes.slice(i, i + CHUNK));
        }

        const uri = (FileSystem.cacheDirectory ?? '') + 'goldrush_highlight.gif';
        await FileSystem.writeAsStringAsync(uri, btoa(b64), {
          encoding: FileSystem.EncodingType.Base64,
        });
        setGifUri(uri);
      } catch (e) {
        console.warn('[HighlightShareModal] encode error:', e);
        setShareError(true);
      } finally {
        setEncoding(false);
      }
    });

    return () => { taskRef.current?.cancel(); };
  }, [visible, frames]);

  // ── Share + grant reward ──────────────────────────────────────────────────
  async function handleShare() {
    if (!gifUri || sharing) return;
    setSharing(true);
    try {
      await Sharing.shareAsync(gifUri, {
        mimeType:    'image/gif',
        dialogTitle: 'Share your GoldRush highlight',
        UTI:         'com.compuserve.gif',
      });

      if (!rewarded) {
        const granted = await consumeClipRewardSlot();
        if (granted) {
          await claimEventBonus({ xp: tier.xp, coins: tier.coins, credits: 0 });
          setRewarded(true);
          setRewardGranted({ coins: tier.coins, xp: tier.xp });
          setRemainingToday(r => Math.max(0, r - 1));
          // Pulse animation on reward reveal
          Animated.sequence([
            Animated.timing(rewardPulse, { toValue: 1.15, duration: 200, useNativeDriver: true }),
            Animated.timing(rewardPulse, { toValue: 1,    duration: 300, useNativeDriver: true }),
          ]).start();
        }
      }
    } catch {
      // Share dismissed or failed — silent
    } finally {
      setSharing(false);
    }
  }

  const capReached = remainingToday === 0;

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.typeLabel}>{TYPE_LABELS[highlightType] ?? '🎬 HIGHLIGHT'}</Text>
              <Text style={styles.scoreLabel}>{score} DEFLECTIONS</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>

          {/* Tier badge */}
          <View style={[styles.tierBadge, { borderColor: tier.color + '66', backgroundColor: tier.color + '18' }]}>
            <Text style={styles.tierEmoji}>{tier.emoji}</Text>
            <View>
              <Text style={[styles.tierLabel, { color: tier.color }]}>{tier.label} CLIP</Text>
              <Text style={styles.tierSub}>
                {capReached
                  ? `Daily cap reached (${MAX_DAILY_REWARDS}/${MAX_DAILY_REWARDS})`
                  : rewarded
                    ? 'Reward claimed!'
                    : `+${tier.coins} coins · +${tier.xp} XP on share`}
              </Text>
            </View>
          </View>

          {/* Reward confirmation (shown after sharing) */}
          {rewardGranted && (
            <Animated.View style={[styles.rewardBox, { transform: [{ scale: rewardPulse }] }]}>
              <Text style={styles.rewardTitle}>🎉 Reward Earned!</Text>
              <Text style={styles.rewardLine}>+{rewardGranted.coins} coins · +{rewardGranted.xp} XP</Text>
              <Text style={styles.rewardRemain}>
                {remainingToday > 0
                  ? `${remainingToday} more reward${remainingToday !== 1 ? 's' : ''} available today`
                  : `Daily cap reached — back tomorrow!`}
              </Text>
            </Animated.View>
          )}

          {/* GIF preview */}
          <View style={styles.previewArea}>
            {encoding && (
              <View style={styles.centred}>
                <ActivityIndicator size="large" color="#C8820A" />
                <Text style={styles.hintText}>Encoding clip…</Text>
              </View>
            )}
            {shareError && !encoding && (
              <View style={styles.centred}>
                <Text style={{ fontSize: 32 }}>⚠️</Text>
                <Text style={styles.hintText}>Could not encode clip</Text>
              </View>
            )}
            {gifUri && !encoding && (
              <Image
                source={{ uri: gifUri }}
                style={styles.gifPreview}
                contentFit="contain"
                autoplay
              />
            )}
          </View>

          {/* Daily cap progress */}
          <View style={styles.capRow}>
            {Array.from({ length: MAX_DAILY_REWARDS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.capDot,
                  { backgroundColor: i < (MAX_DAILY_REWARDS - remainingToday) ? tier.color : '#FFFFFF18' },
                ]}
              />
            ))}
            <Text style={styles.capText}>
              {remainingToday}/{MAX_DAILY_REWARDS} rewards left today
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={[
                styles.shareBtn,
                { backgroundColor: rewarded ? '#1A3A1A' : tier.color },
                (!gifUri || encoding || sharing) && styles.shareBtnDisabled,
              ]}
              onPress={handleShare}
              disabled={!gifUri || encoding || sharing || capReached}
            >
              <Text style={[styles.shareBtnText, { color: rewarded ? '#4CAF50' : '#000000' }]}>
                {sharing ? 'Opening share sheet…' : rewarded ? '✅ Shared & Rewarded' : capReached ? '📤 Share (cap reached)' : '📤 Share & Earn'}
              </Text>
            </Pressable>
            {!rewarded && !capReached && (
              <Text style={styles.earnHint}>
                Share to earn {tier.emoji} {tier.coins} coins + {tier.xp} XP
              </Text>
            )}
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
          </View>

          <Text style={styles.caption}>GoldRush Arena · goldrush.app</Text>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000CC',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#111008',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#C8820A44',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 44,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  typeLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#C8820A',
    letterSpacing: 1.2,
  },
  scoreLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#FFFFFF44',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  closeBtn: {
    fontSize: 18,
    color: '#FFFFFF55',
    paddingHorizontal: 4,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  tierEmoji: { fontSize: 28 },
  tierLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: 0.8,
  },
  tierSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#FFFFFF55',
    marginTop: 2,
  },
  rewardBox: {
    backgroundColor: '#0E2A0E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF5055',
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  rewardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#4CAF50',
  },
  rewardLine: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  rewardRemain: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#FFFFFF55',
    marginTop: 2,
  },
  previewArea: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 240,
    backgroundColor: '#0A0804',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF0A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  centred: { alignItems: 'center', gap: 10 },
  hintText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#FFFFFF55',
  },
  gifPreview: { width: '100%', height: '100%' },
  capRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  capText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#FFFFFF33',
    marginLeft: 4,
  },
  actions: { gap: 8 },
  shareBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  shareBtnDisabled: { opacity: 0.45 },
  shareBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  earnHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#FFFFFF44',
    textAlign: 'center',
  },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#FFFFFF44',
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#FFFFFF1A',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
});
