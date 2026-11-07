import { Feather } from '@expo/vector-icons';
import { LinearGradient } from '@/components/ui/Flat';
import React, { useRef, useState } from 'react';
import {
  Animated, KeyboardAvoidingView, Modal, Platform,
  Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { usePlayer } from '@/context/PlayerContext';
import { useBlockingOverlay } from '@/context/OverlayQueue';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function RedeemCodeModal({ visible: requested, onClose }: Props) {
  const visible = useBlockingOverlay(requested);
  const { redeemCode } = usePlayer();
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<{ success: boolean; message: string } | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  function triggerShake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 7, duration: 38, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7, duration: 38, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 28, useNativeDriver: true }),
    ]).start();
  }

  function triggerEntrance() {
    scaleAnim.setValue(0.92);
    Animated.spring(scaleAnim, { toValue: 1, tension: 160, friction: 10, useNativeDriver: true }).start();
  }

  async function handleRedeem() {
    if (!code.trim() || loading) return;
    setLoading(true);
    setResult(null);
    const res = await redeemCode(code);
    setResult(res);
    setLoading(false);
    if (!res.success) triggerShake();
    if (res.success) setCode('');
  }

  function handleClose() {
    setCode('');
    setResult(null);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      onShow={triggerEntrance}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View style={[s.sheet, { transform: [{ translateX: shakeAnim }, { scale: scaleAnim }] }]}>
          <LinearGradient colors={['#294C44', '#213D39']} style={StyleSheet.absoluteFill} />
          <View style={s.topAccent} />

          {/* Header row */}
          <View style={s.headerRow}>
            <View style={s.giftIconWrap}>
              <Feather name="gift" size={18} color="#EFBD3C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>REDEEM CODE</Text>
              <Text style={s.subtitle}>Enter your code to claim rewards</Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={14} style={s.closeBtn}>
              <Feather name="x" size={18} color="#F5E7C455" />
            </Pressable>
          </View>

          {/* Code input */}
          <Animated.View style={[s.inputWrap, result?.success === false && { borderColor: '#CE786388' }]}>
            <TextInput
              style={s.input}
              value={code}
              onChangeText={t => { setCode(t.toUpperCase()); setResult(null); }}
              placeholder="ENTER CODE"
              placeholderTextColor="#F5E7C422"
              autoCapitalize="characters"
              maxLength={12}
              returnKeyType="done"
              onSubmitEditing={handleRedeem}
              editable={!loading}
            />
          </Animated.View>

          {/* Result banner */}
          {result && (
            <View style={[s.resultBox, result.success ? s.resultSuccess : s.resultError]}>
              <Feather
                name={result.success ? 'check-circle' : 'alert-circle'}
                size={15}
                color={result.success ? '#EFBD3C' : '#CE7863'}
              />
              <Text style={[s.resultText, { color: result.success ? '#EFBD3C' : '#CE7863' }]}>
                {result.message}
              </Text>
            </View>
          )}

          {/* Redeem button */}
          <Pressable
            onPress={handleRedeem}
            disabled={loading || !code.trim()}
            style={({ pressed }) => [s.btn, { opacity: loading || !code.trim() ? 0.4 : pressed ? 0.82 : 1 }]}
          >
            <LinearGradient colors={['#EFBD3C', '#C98E12']} style={s.btnGrad}>
              <Text style={s.btnText}>{loading ? 'CHECKING…' : 'REDEEM'}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#172E2AEE',
    justifyContent: 'flex-end',
  },
  sheet: {
    overflow: 'hidden',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 3,
    borderColor: '#CCAD6A',
    backgroundColor: '#294942',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 48 : 36,
    gap: 14,
  },
  topAccent: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    backgroundColor: '#EFBD3C',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 2,
  },
  giftIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 3,
    backgroundColor: '#EFBD3C18',
    borderWidth: 1,
    borderColor: '#EFBD3C44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'SourceSans3_700Bold',
    fontSize: 16,
    letterSpacing: 2.5,
    color: '#EFBD3C',
  },
  subtitle: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 12,
    color: '#F5E7C444',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  inputWrap: {
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#F5E7C422',
    backgroundColor: '#F5E7C407',
    overflow: 'hidden',
  },
  input: {
    height: 58,
    paddingHorizontal: 20,
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 22,
    letterSpacing: 6,
    color: '#F5E7C4',
    textAlign: 'center',
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  resultSuccess: {
    backgroundColor: '#EFBD3C12',
    borderColor: '#EFBD3C55',
  },
  resultError: {
    backgroundColor: '#CE786312',
    borderColor: '#CE786355',
  },
  resultText: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 13,
    flex: 1,
  },
  btn: {
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 2,
  },
  btnGrad: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontFamily: 'SourceSans3_700Bold',
    fontSize: 15,
    letterSpacing: 2.5,
    color: '#213D39',
  },
});
