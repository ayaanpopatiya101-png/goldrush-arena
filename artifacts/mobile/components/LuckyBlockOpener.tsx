import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Modal, Platform, Pressable, StyleSheet, Text, View,
} from 'react-native';
import {
  LUCKY_BLOCK_META, LuckyBlock, LuckyBlockReward, LuckyBlockTier,
  generateLuckyBlockReward, rollLuckyBlockUpgrade, usePlayer,
} from '@/context/PlayerContext';

type Phase = 'ready' | 'shaking' | 'upgraded' | 'opening' | 'revealed';

interface Props {
  block: LuckyBlock;
  onClose: () => void;
}

export function LuckyBlockOpener({ block, onClose }: Props) {
  const { openLuckyBlock } = usePlayer();

  const [currentTier, setCurrentTier] = useState<LuckyBlockTier>(block.tier);
  const [tapsLeft, setTapsLeft] = useState(4);
  const [phase, setPhase] = useState<Phase>('ready');
  const [reward, setReward] = useState<LuckyBlockReward | null>(null);
  const [upgradeLabel, setUpgradeLabel] = useState('');

  const tierRef    = useRef<LuckyBlockTier>(block.tier);
  const tapsRef    = useRef(4);
  const phaseRef   = useRef<Phase>('ready');
  const openedRef  = useRef(false);

  const overlayOp  = useRef(new Animated.Value(0)).current;
  const blockScale = useRef(new Animated.Value(0.6)).current;
  const blockOp    = useRef(new Animated.Value(0)).current;
  const floatY     = useRef(new Animated.Value(0)).current;
  const shakeX     = useRef(new Animated.Value(0)).current;
  const flashOp    = useRef(new Animated.Value(0)).current;
  const flashScale = useRef(new Animated.Value(0.3)).current;
  const upgradeOp  = useRef(new Animated.Value(0)).current;
  const upgradeScl = useRef(new Animated.Value(0.5)).current;
  const rewardOp   = useRef(new Animated.Value(0)).current;
  const rewardY    = useRef(new Animated.Value(80)).current;
  const rewardScl  = useRef(new Animated.Value(0.7)).current;
  const glowPulse  = useRef(new Animated.Value(0.7)).current;
  const floatLoop  = useRef<Animated.CompositeAnimation | null>(null);

  function startFloat() {
    floatLoop.current?.stop();
    floatLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -14, duration: 1100, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0,   duration: 1100, useNativeDriver: true }),
      ])
    );
    floatLoop.current.start();
  }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(overlayOp,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(blockScale, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
      Animated.timing(blockOp,    { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start(() => startFloat());

    Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
      Animated.timing(glowPulse, { toValue: 0.7, duration: 900, useNativeDriver: true }),
    ])).start();
  }, []);

  function handleTap() {
    if (phaseRef.current !== 'ready') return;
    phaseRef.current = 'shaking';
    setPhase('shaking');

    floatLoop.current?.stop();
    floatY.setValue(0);

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Animated.sequence([
      Animated.timing(shakeX, { toValue: -20, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  20, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -14, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  14, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  -6, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:   0, duration: 45, useNativeDriver: true }),
    ]).start(() => {
      const newTier    = rollLuckyBlockUpgrade(tierRef.current);
      const upgraded   = newTier !== tierRef.current;
      const newTapsLeft = tapsRef.current - 1;
      tapsRef.current = newTapsLeft;

      if (upgraded) {
        tierRef.current = newTier;
        setCurrentTier(newTier);
        setUpgradeLabel(`⬆ UPGRADED TO ${LUCKY_BLOCK_META[newTier].name.toUpperCase()}!`);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playUpgradeAnimation(() => {
          if (newTapsLeft === 0) { triggerOpen(); }
          else {
            setTapsLeft(newTapsLeft);
            phaseRef.current = 'ready';
            setPhase('ready');
            startFloat();
          }
        });
      } else {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (newTapsLeft === 0) { triggerOpen(); }
        else {
          setTapsLeft(newTapsLeft);
          phaseRef.current = 'ready';
          setPhase('ready');
          startFloat();
        }
      }
    });
  }

  function playUpgradeAnimation(onDone: () => void) {
    phaseRef.current = 'upgraded';
    setPhase('upgraded');
    flashScale.setValue(0.3);
    upgradeScl.setValue(0.5);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(blockScale, { toValue: 1.5, duration: 180, useNativeDriver: true }),
        Animated.spring(blockScale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.parallel([
          Animated.timing(flashOp,    { toValue: 0.9, duration: 120, useNativeDriver: true }),
          Animated.timing(flashScale, { toValue: 3.2, duration: 380, useNativeDriver: true }),
        ]),
        Animated.timing(flashOp, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.parallel([
          Animated.timing(upgradeOp,  { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.spring(upgradeScl, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
        ]),
        Animated.delay(900),
        Animated.timing(upgradeOp, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]),
    ]).start(onDone);
  }

  function triggerOpen() {
    if (openedRef.current) return;
    openedRef.current = true;
    phaseRef.current = 'opening';
    setPhase('opening');

    const finalTier = tierRef.current;
    const r = generateLuckyBlockReward(finalTier);
    setReward(r);

    floatLoop.current?.stop();
    flashScale.setValue(0.3);

    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.parallel([
      Animated.timing(blockScale, { toValue: 2.4, duration: 300, useNativeDriver: true }),
      Animated.timing(blockOp,    { toValue: 0,   duration: 300, useNativeDriver: true }),
      Animated.sequence([
        Animated.parallel([
          Animated.timing(flashOp,    { toValue: 1,   duration: 150, useNativeDriver: true }),
          Animated.timing(flashScale, { toValue: 5.0, duration: 500, useNativeDriver: true }),
        ]),
        Animated.timing(flashOp, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => {
      openLuckyBlock(block.id, r);
      phaseRef.current = 'revealed';
      setPhase('revealed');
      Animated.parallel([
        Animated.spring(rewardScl, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(rewardOp,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(rewardY,   { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
      ]).start();
    });
  }

  const meta = LUCKY_BLOCK_META[currentTier];

  return (
    <Modal animationType="none" transparent presentationStyle="overFullScreen">
      <Animated.View style={[s.overlay, { opacity: overlayOp }]}>
        <LinearGradient colors={['#05030D', '#090520']} style={StyleSheet.absoluteFill} />

        {/* Ambient stars */}
        {Array.from({ length: 14 }).map((_, i) => (
          <View key={i} style={[s.star, {
            top: `${(i * 7.3 + 5) % 100}%` as never,
            left: `${(i * 6.9 + 11) % 100}%` as never,
            opacity: 0.08 + (i % 4) * 0.07,
            width: 1 + (i % 3), height: 1 + (i % 3),
          }]} />
        ))}

        {/* Flash burst behind block */}
        <Animated.View style={[s.flashBurst, {
          backgroundColor: meta.color,
          opacity: flashOp,
          transform: [{ scale: flashScale }],
        }]} />

        {phase !== 'revealed' ? (
          <View style={s.center}>
            {/* Tier title */}
            <Animated.Text style={[s.tierLabel, { color: meta.color, opacity: blockOp }]}>
              {meta.name}
            </Animated.Text>

            {/* Tap pip counter (filled = already tapped) */}
            <View style={s.pips}>
              {[0, 1, 2, 3].map(i => (
                <View key={i} style={[s.pip, {
                  backgroundColor: i < 4 - tapsLeft ? meta.color : '#FFFFFF15',
                  borderColor:     i < 4 - tapsLeft ? meta.color : '#FFFFFF25',
                  shadowColor:     meta.color,
                  shadowOpacity:   i < 4 - tapsLeft ? 0.8 : 0,
                  shadowRadius:    6,
                }]} />
              ))}
            </View>

            {/* Upgrade banner */}
            <Animated.View style={[s.upgradeToast, {
              opacity: upgradeOp,
              transform: [{ scale: upgradeScl }],
              borderColor: meta.color + '88',
            }]}>
              <LinearGradient colors={[meta.color + '35', meta.color + '10']} style={StyleSheet.absoluteFill} />
              <Text style={[s.upgradeTxt, { color: meta.color }]}>{upgradeLabel}</Text>
            </Animated.View>

            {/* Outer glow ring */}
            <Animated.View style={[s.glowRing, {
              borderColor: meta.color,
              shadowColor: meta.color,
              opacity: glowPulse,
              transform: [{
                scale: glowPulse.interpolate({ inputRange: [0.7, 1], outputRange: [0.97, 1.1] }),
              }],
            }]} />

            {/* The Block */}
            <Pressable onPress={handleTap} disabled={phase !== 'ready'}>
              <Animated.View style={[s.blockWrap, {
                transform: [
                  { translateY: floatY },
                  { translateX: shakeX },
                  { scale: blockScale },
                ],
                opacity: blockOp,
              }]}>
                <View style={[s.block, { borderColor: meta.color + 'BB', shadowColor: meta.color }]}>
                  <LinearGradient
                    colors={[meta.color + '66', meta.color + '28', '#00000055']}
                    start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={s.blockHighlight} />
                  <Text style={s.blockEmoji}>{meta.emoji}</Text>
                </View>
              </Animated.View>
            </Pressable>

            {phase === 'ready' && (
              <View style={s.hintWrap}>
                <Text style={s.hintText}>TAP TO REVEAL</Text>
                <Text style={[s.tapsLeft, { color: meta.color }]}>
                  {tapsLeft} tap{tapsLeft !== 1 ? 's' : ''} remaining
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* ── Reward revealed ── */
          <Animated.View style={[s.rewardCard, {
            opacity: rewardOp,
            transform: [{ translateY: rewardY }, { scale: rewardScl }],
            borderColor: meta.color + '66',
          }]}>
            <LinearGradient
              colors={[meta.color + '30', meta.color + '10', '#00000000']}
              style={StyleSheet.absoluteFill}
            />
            <Text style={s.rewardEmoji}>{meta.emoji}</Text>
            <Text style={[s.rewardOpened, { color: meta.color }]}>
              {meta.name.toUpperCase()} OPENED!
            </Text>

            {reward && (
              <View style={s.rewardItems}>
                <View style={[s.rewardRow, { borderColor: '#FFD70033' }]}>
                  <Text style={s.rIcon}>🪙</Text>
                  <Text style={s.rLabel}>Coins</Text>
                  <Text style={[s.rValue, { color: '#FFD700' }]}>
                    +{reward.coins.toLocaleString()}
                  </Text>
                </View>
                {reward.xp > 0 && (
                  <View style={[s.rewardRow, { borderColor: meta.color + '33' }]}>
                    <Text style={s.rIcon}>✨</Text>
                    <Text style={s.rLabel}>XP Bonus</Text>
                    <Text style={[s.rValue, { color: meta.color }]}>
                      +{reward.xp.toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Pressable onPress={onClose} style={[s.collectBtn, { backgroundColor: meta.color }]}>
              <Text style={s.collectBtnTxt}>COLLECT!</Text>
            </Pressable>
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
}

const BLOCK_SIZE = 148;

const s = StyleSheet.create({
  overlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  star: {
    position: 'absolute', borderRadius: 99, backgroundColor: '#FFFFFF',
  },
  flashBurst: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    alignSelf: 'center',
  },
  center: {
    alignItems: 'center', gap: 0,
  },
  tierLabel: {
    fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: 2,
    textShadowColor: '#000', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
    marginBottom: 16,
  },
  pips: {
    flexDirection: 'row', gap: 10, marginBottom: 24,
  },
  pip: {
    width: 14, height: 14, borderRadius: 7, borderWidth: 1.5,
  },
  upgradeToast: {
    position: 'absolute', top: -60,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 9,
    overflow: 'hidden',
  },
  upgradeTxt: {
    fontSize: 15, fontFamily: 'Inter_700Bold', letterSpacing: 1,
  },
  glowRing: {
    position: 'absolute',
    width: BLOCK_SIZE + 56, height: BLOCK_SIZE + 56, borderRadius: (BLOCK_SIZE + 56) / 2,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 24,
  },
  blockWrap: {
    alignItems: 'center',
  },
  block: {
    width: BLOCK_SIZE, height: BLOCK_SIZE, borderRadius: 28,
    borderWidth: 2, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 32, shadowOpacity: 0.9,
    elevation: 24,
  },
  blockHighlight: {
    position: 'absolute', top: 10, left: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF18',
  },
  blockEmoji: {
    fontSize: 72,
  },
  hintWrap: {
    marginTop: 32, alignItems: 'center', gap: 6,
  },
  hintText: {
    fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 3, color: '#FFFFFF44',
  },
  tapsLeft: {
    fontSize: 13, fontFamily: 'Inter_600SemiBold', letterSpacing: 1,
  },
  rewardCard: {
    marginHorizontal: 32, padding: 32, borderRadius: 24, borderWidth: 1.5,
    alignItems: 'center', gap: 4, overflow: 'hidden',
  },
  rewardEmoji: {
    fontSize: 64, marginBottom: 4,
  },
  rewardOpened: {
    fontSize: 18, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginBottom: 20,
  },
  rewardItems: {
    width: '100%', gap: 10, marginBottom: 24,
  },
  rewardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF08', borderRadius: 12, padding: 14, borderWidth: 1,
  },
  rIcon: { fontSize: 20 },
  rLabel: { flex: 1, color: '#FFFFFF88', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  rValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  collectBtn: {
    paddingHorizontal: 40, paddingVertical: 16, borderRadius: 14,
    marginTop: 4,
  },
  collectBtnTxt: {
    color: '#FFF', fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 2,
  },
});
