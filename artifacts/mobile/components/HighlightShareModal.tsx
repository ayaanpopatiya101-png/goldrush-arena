/**
 * HighlightShareModal
 *
 * Shown when the user taps "Share Highlight" on the post-game screen.
 * Encodes the buffered JPEG frames to an animated GIF in-thread (deferred
 * after interactions so the modal renders first), then shows a preview and
 * a native share sheet button.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

// ── Types ─────────────────────────────────────────────────────────────────────
export type HighlightType = 'multi_block' | 'near_death' | 'hot_streak';

const LABELS: Record<HighlightType, string> = {
  multi_block:  '🌊 MULTI-BALL BLOCK',
  near_death:   '❤️  NEAR-DEATH SAVE',
  hot_streak:   '🔥 HOT STREAK',
};

const GIF_W = 200;
const GIF_H = 200;
const GIF_FPS = 4;

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
  frames: string[];          // base64 JPEG strings from react-native-view-shot
  highlightType: HighlightType;
  score: number;
}

export function HighlightShareModal({ visible, onClose, frames, highlightType, score }: Props) {
  const [gifUri,     setGifUri]     = useState<string | null>(null);
  const [encoding,   setEncoding]   = useState(false);
  const [shareError, setShareError] = useState(false);
  const taskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);

  // Encode when the modal opens
  useEffect(() => {
    if (!visible || frames.length === 0) return;
    setGifUri(null);
    setShareError(false);
    setEncoding(true);

    // Wait for the modal open animation to complete before blocking the thread
    taskRef.current = InteractionManager.runAfterInteractions(async () => {
      try {
        const gifBytes = createHighlightGIF(frames, GIF_W, GIF_H, GIF_FPS);

        // Uint8Array → base64 string in 4 KB chunks to avoid call-stack overflow
        const CHUNK = 4096;
        let b64 = '';
        for (let i = 0; i < gifBytes.length; i += CHUNK) {
          b64 += String.fromCharCode(...gifBytes.slice(i, i + CHUNK));
        }
        const base64Str = btoa(b64);

        const uri = (FileSystem.cacheDirectory ?? '') + 'goldrush_highlight.gif';
        await FileSystem.writeAsStringAsync(uri, base64Str, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setGifUri(uri);
      } catch (e) {
        console.warn('[HighlightShareModal] GIF encode error:', e);
        setShareError(true);
      } finally {
        setEncoding(false);
      }
    });

    return () => { taskRef.current?.cancel(); };
  }, [visible, frames]);

  async function handleShare() {
    if (!gifUri) return;
    try {
      await Sharing.shareAsync(gifUri, {
        mimeType: 'image/gif',
        dialogTitle: 'Share your GoldRush highlight',
        UTI: 'com.compuserve.gif',
      });
    } catch (e) {
      console.warn('[HighlightShareModal] Share error:', e);
    }
  }

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
            <Text style={styles.tagline}>{LABELS[highlightType] ?? '🎬 HIGHLIGHT'}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>

          {/* Score line */}
          <Text style={styles.scoreLabel}>{score} DEFLECTIONS</Text>

          {/* Preview area */}
          <View style={styles.previewArea}>
            {encoding && (
              <View style={styles.spinnerWrap}>
                <ActivityIndicator size="large" color="#C8820A" />
                <Text style={styles.encodingText}>Encoding clip…</Text>
              </View>
            )}

            {shareError && !encoding && (
              <View style={styles.spinnerWrap}>
                <Text style={{ fontSize: 32 }}>⚠️</Text>
                <Text style={styles.encodingText}>Could not encode clip</Text>
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

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.shareBtn, (!gifUri || encoding) && styles.shareBtnDisabled]}
              onPress={handleShare}
              disabled={!gifUri || encoding}
            >
              <Text style={styles.shareBtnText}>
                {encoding ? 'Preparing…' : '📤 Share Clip'}
              </Text>
            </Pressable>

            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
          </View>

          {/* Caption */}
          <Text style={styles.caption}>GoldRush Arena • goldrush.app</Text>

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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tagline: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#C8820A',
    letterSpacing: 1.2,
  },
  closeBtn: {
    fontSize: 18,
    color: '#FFFFFF66',
    paddingHorizontal: 4,
  },
  scoreLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#FFFFFF44',
    letterSpacing: 1,
    marginBottom: 16,
  },
  previewArea: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 260,
    backgroundColor: '#0A0804',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF0A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  spinnerWrap: {
    alignItems: 'center',
    gap: 12,
  },
  encodingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#FFFFFF66',
  },
  gifPreview: {
    width: '100%',
    height: '100%',
  },
  actions: {
    gap: 10,
    marginBottom: 14,
  },
  shareBtn: {
    backgroundColor: '#C8820A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  shareBtnDisabled: {
    opacity: 0.45,
  },
  shareBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#000000',
    letterSpacing: 0.5,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#FFFFFF44',
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#FFFFFF22',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
});
