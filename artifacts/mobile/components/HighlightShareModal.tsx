import { Text } from '@/components/ui/Text';
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
import { ActivityIndicator, Animated, InteractionManager, Modal, Pressable, StyleSheet, View,  } from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
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
                <ActivityIndicator size="large" color="#BB7865" />
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
                  { backgroundColor: i < (MAX_DAILY_REWARDS - remainingToday) ? tier.color : '#EEE7D818' },
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
                { backgroundColor: rewarded ? '#222520' : tier.color },
                (!gifUri || encoding || sharing) && styles.shareBtnDisabled,
              ]}
              onPress={handleShare}
              disabled={!gifUri || encoding || sharing || capReached}
            >
              <Text style={[styles.shareBtnText, { color: rewarded ? '#98A581' : '#191B19' }]}>
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
    backgroundColor: '#191B19CC',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#191B19',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderWidth: 1,
    borderColor: '#BB786544',
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
    fontFamily: 'System',
    fontSize: 14,
    color: '#BB7865',
    letterSpacing: 1.2,
  },
  scoreLabel: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#EEE7D844',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  closeBtn: {
    fontSize: 18,
    color: '#EEE7D855',
    paddingHorizontal: 4,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 2,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  tierEmoji: { fontSize: 28 },
  tierLabel: {
    fontFamily: 'System',
    fontSize: 14,
    letterSpacing: 0.8,
  },
  tierSub: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#EEE7D855',
    marginTop: 2,
  },
  rewardBox: {
    backgroundColor: '#191B19',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#98A58155',
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  rewardTitle: {
    fontFamily: 'System',
    fontSize: 15,
    color: '#98A581',
  },
  rewardLine: {
    fontFamily: 'System',
    fontSize: 18,
    color: '#EEE7D8',
  },
  rewardRemain: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#EEE7D855',
    marginTop: 2,
  },
  previewArea: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 240,
    backgroundColor: '#191B19',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#EEE7D80A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  centred: { alignItems: 'center', gap: 10 },
  hintText: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#EEE7D855',
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
    borderRadius: 2,
  },
  capText: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#EEE7D833',
    marginLeft: 4,
  },
  actions: { gap: 8 },
  shareBtn: {
    borderRadius: 2,
    paddingVertical: 16,
    alignItems: 'center',
  },
  shareBtnDisabled: { opacity: 0.45 },
  shareBtnText: {
    fontFamily: 'System',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  earnHint: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#EEE7D844',
    textAlign: 'center',
  },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelText: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#EEE7D844',
  },
  caption: {
    fontFamily: 'System',
    fontSize: 10,
    color: '#EEE7D81A',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
});
