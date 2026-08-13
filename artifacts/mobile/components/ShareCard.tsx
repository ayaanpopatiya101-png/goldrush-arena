/**
 * ShareCard — viral post-game share overlay.
 *
 * Shows a beautiful card the player can screenshot, plus a native Share sheet
 * with a pre-written message and deep-link URL for challenging friends.
 *
 * No new native packages required — uses Share API + styled React Native Views.
 */

import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
  Animated, Modal, Platform, Pressable, Share, StyleSheet, Text, View,
} from 'react-native';
import Reanimated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { GlowText } from '@/components/effects';
import { buildChallengeLink } from '@/utils/dailyChallenge';

interface ShareCardProps {
  visible:       boolean;
  score:         number;        // deflections / hits
  personalBest:  number;        // all-time personal best
  playerName:    string;
  dailyRank:     number | null; // null = not yet submitted or server unavailable
  totalPlayers:  number;
  seed:          string;        // daily challenge seed
  onClose:       () => void;
}

export function ShareCard({
  visible, score, personalBest, playerName, dailyRank, totalPlayers, seed, onClose,
}: ShareCardProps) {
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(backdropAnim, {
      toValue: visible ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const isNewPB = score >= personalBest && score > 0;
  const link    = buildChallengeLink(seed, score, playerName);

  async function handleShare() {
    const pbNote = isNewPB ? ' 🏆 NEW PERSONAL BEST!' : personalBest > 0 ? ` (best: ${personalBest})` : '';
    const rankNote = dailyRank ? ` · #${dailyRank} globally today` : '';

    const message =
      `🎮 GoldRush Arena\n` +
      `⚡ I survived ${score} hit${score !== 1 ? 's' : ''}!${pbNote}${rankNote}\n\n` +
      `Can you beat ${score}? Challenge me:\n${link}`;

    try {
      await Share.share({ message, url: Platform.OS === 'ios' ? link : undefined });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { /* user cancelled */ }
  }

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <View style={styles.centerer} pointerEvents="box-none">
        <Reanimated.View entering={ZoomIn.springify().damping(14).stiffness(180)} style={styles.cardWrap}>
          {/* Card body — screenshot-able */}
          <View style={styles.card}>
            <LinearGradient
              colors={['#0A0F20', '#0D1830', '#080C18']}
              style={StyleSheet.absoluteFill}
            />
            {/* Gold top border */}
            <LinearGradient
              colors={['#C8820A', '#FFD700', '#C8820A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.topBorder}
            />

            {/* Logo */}
            <View style={styles.logoRow}>
              <Text style={styles.logoEmoji}>👑</Text>
              <Text style={styles.logoText}>GOLDRUSH ARENA</Text>
            </View>

            {/* Score hero */}
            <View style={styles.scoreSection}>
              <Text style={styles.survivedLabel}>I SURVIVED</Text>
              <GlowText intensity="strong" color="#FFD700" style={styles.scoreNumber}>
                {score}
              </GlowText>
              <Text style={styles.hitsLabel}>HIT{score !== 1 ? 'S' : ''}</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Stats row */}
            <View style={styles.statsRow}>
              {personalBest > 0 && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {isNewPB ? '🏆 ' : ''}{personalBest}
                  </Text>
                  <Text style={styles.statLabel}>PERSONAL BEST</Text>
                </View>
              )}
              {dailyRank && totalPlayers > 1 && (
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#C8820A' }]}>
                    #{dailyRank}
                  </Text>
                  <Text style={styles.statLabel}>OF {totalPlayers} TODAY</Text>
                </View>
              )}
            </View>

            {/* CTA */}
            <View style={styles.ctaRow}>
              <Text style={styles.ctaText}>Can you beat {score}?</Text>
            </View>

            {/* Player name */}
            <Text style={styles.playerTag}>— {playerName}</Text>
          </View>

          {/* Action buttons */}
          <Pressable onPress={handleShare} style={styles.shareBtn}>
            <LinearGradient colors={['#F0A428', '#C8820A']} style={styles.shareBtnGrad}>
              <Text style={styles.shareBtnText}>📤  SHARE &amp; CHALLENGE</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </Reanimated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:     { backgroundColor: '#000000CC' },
  centerer:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  cardWrap:     { width: '100%', maxWidth: 360, gap: 10 },

  card: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1.5, borderColor: '#C8820A44',
    paddingHorizontal: 24, paddingBottom: 24, paddingTop: 0,
    alignItems: 'center', gap: 0,
  },
  topBorder:    { height: 3, width: '100%', marginBottom: 20 },

  logoRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  logoEmoji:  { fontSize: 20 },
  logoText:   { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 3, color: '#C8820A' },

  scoreSection: { alignItems: 'center', gap: 0 },
  survivedLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 4, color: '#FFFFFF55', marginBottom: 4 },
  scoreNumber: {
    fontFamily: 'Rajdhani_700Bold', fontSize: 96, lineHeight: 96,
    color: '#FFD700',
    textShadowColor: '#C8820A', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24,
  },
  hitsLabel:  { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: 5, color: '#FFFFFF88', marginTop: -8 },

  divider: { width: '80%', height: 1, backgroundColor: '#FFFFFF11', marginVertical: 16 },

  statsRow:   { flexDirection: 'row', gap: 32, justifyContent: 'center', marginBottom: 16 },
  statItem:   { alignItems: 'center', gap: 4 },
  statValue:  { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#00FF88' },
  statLabel:  { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 2, color: '#FFFFFF44' },

  ctaRow:     { backgroundColor: '#C8820A15', borderRadius: 10, borderWidth: 1, borderColor: '#C8820A33', paddingHorizontal: 20, paddingVertical: 10, marginBottom: 12 },
  ctaText:    { fontFamily: 'Rajdhani_700Bold', fontSize: 18, color: '#FFD700', letterSpacing: 1 },

  playerTag:  { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#FFFFFF44', fontStyle: 'italic' },

  shareBtn:     { borderRadius: 14, overflow: 'hidden', elevation: 8, shadowColor: '#C8820A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.6, shadowRadius: 18 },
  shareBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  shareBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#07090F', letterSpacing: 1 },

  closeBtn:     { alignItems: 'center', paddingVertical: 10 },
  closeBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#FFFFFF44' },
});
