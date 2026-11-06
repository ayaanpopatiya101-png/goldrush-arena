import { Feather } from '@expo/vector-icons';
import { LinearGradient } from '@/components/ui/Flat';
import React, { useRef, useState } from 'react';
import {
  Animated, KeyboardAvoidingView, Modal, Platform,
  Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { usePlayer } from '@/context/PlayerContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function RedeemCodeModal({ visible, onClose }: Props) {
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
          <LinearGradient colors={['#1F2125', '#16171A']} style={StyleSheet.absoluteFill} />
          <View style={s.topAccent} />

          {/* Header row */}
          <View style={s.headerRow}>
            <View style={s.giftIconWrap}>
              <Feather name="gift" size={18} color="#C99A2E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>REDEEM CODE</Text>
              <Text style={s.subtitle}>Enter your code to claim rewards</Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={14} style={s.closeBtn}>
              <Feather name="x" size={18} color="#ECE7DC55" />
            </Pressable>
          </View>

          {/* Code input */}
          <Animated.View style={[s.inputWrap, result?.success === false && { borderColor: '#B4533A88' }]}>
            <TextInput
              style={s.input}
              value={code}
              onChangeText={t => { setCode(t.toUpperCase()); setResult(null); }}
              placeholder="ENTER CODE"
              placeholderTextColor="#ECE7DC22"
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
                color={result.success ? '#C99A2E' : '#B4533A'}
              />
              <Text style={[s.resultText, { color: result.success ? '#C99A2E' : '#B4533A' }]}>
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
            <LinearGradient colors={['#C99A2E', '#9E7620']} style={s.btnGrad}>
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
    backgroundColor: '#16171A99',
    justifyContent: 'flex-end',
  },
  sheet: {
    overflow: 'hidden',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderWidth: 1,
    borderColor: '#C99A2E44',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 48 : 36,
    gap: 14,
  },
  topAccent: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    backgroundColor: '#C99A2E',
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
    backgroundColor: '#C99A2E18',
    borderWidth: 1,
    borderColor: '#C99A2E44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'SourceSans3_700Bold',
    fontSize: 16,
    letterSpacing: 2.5,
    color: '#C99A2E',
  },
  subtitle: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 12,
    color: '#ECE7DC44',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  inputWrap: {
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#ECE7DC22',
    backgroundColor: '#ECE7DC07',
    overflow: 'hidden',
  },
  input: {
    height: 58,
    paddingHorizontal: 20,
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 22,
    letterSpacing: 6,
    color: '#ECE7DC',
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
    backgroundColor: '#C99A2E12',
    borderColor: '#C99A2E55',
  },
  resultError: {
    backgroundColor: '#B4533A12',
    borderColor: '#B4533A55',
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
    color: '#16171A',
  },
});
