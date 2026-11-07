import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '@/lib/legalContent';

export default function LegalScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(
    params.tab === 'terms' ? 'terms' : 'privacy'
  );
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const content = activeTab === 'privacy' ? PRIVACY_POLICY : TERMS_OF_SERVICE;

  return (
    <View style={{ flex: 1, backgroundColor: '#0E2621' }}>

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.back} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="arrow-left" size={22} color="#F3EAD3" />
        </Pressable>
        <Text style={s.title}>LEGAL</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab selector */}
      <View style={s.tabRow}>
        <Pressable
          onPress={() => setActiveTab('privacy')}
          style={[s.tabBtn, activeTab === 'privacy' && s.tabBtnActive]}
        >
          <Text style={[s.tabText, activeTab === 'privacy' && s.tabTextActive]}>
            Privacy Policy
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('terms')}
          style={[s.tabBtn, activeTab === 'terms' && s.tabBtnActive]}
        >
          <Text style={[s.tabText, activeTab === 'terms' && s.tabTextActive]}>
            Terms of Service
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          <Text style={s.body}>{content}</Text>
        </View>
        <Text style={s.footer}>GoldRush Arena · Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  back:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'SourceSans3_700Bold', fontSize: 16, letterSpacing: 2, color: '#F3EAD3' },

  tabRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#F3EAD30C', borderRadius: 3, padding: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 3 },
  tabBtnActive: { backgroundColor: '#F0B42922', borderWidth: 1, borderColor: '#F0B42955' },
  tabText: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, letterSpacing: 0.5, color: '#F3EAD344' },
  tabTextActive: { color: '#F0B429' },

  scrollContent: { paddingHorizontal: 20, gap: 16 },
  card: {
    backgroundColor: '#F3EAD307', borderRadius: 3, borderWidth: 1,
    borderColor: '#F3EAD311', padding: 18,
  },
  body: {
    fontFamily: 'SourceSans3_400Regular', fontSize: 13, color: '#F3EAD399',
    lineHeight: 22,
  },
  footer: {
    fontFamily: 'SourceSans3_400Regular', fontSize: 10, color: '#F3EAD322',
    textAlign: 'center',
  },
});
