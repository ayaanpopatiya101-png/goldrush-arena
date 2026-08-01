import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIVACY_POLICY = `Last updated: July 2026

GoldRush Arena ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we handle information when you use GoldRush Arena.

1. Information We Collect

GoldRush Arena does not collect, transmit, or store any personal information on external servers. All game data — including your chosen username, scores, achievements, unlocked items, and preferences — is stored exclusively on your device using local storage (AsyncStorage).

2. Data Storage

All player data lives only on your device. We have no access to any data stored on your device. Uninstalling the app will permanently delete all locally stored game data.

3. No Third-Party Services

GoldRush Arena does not integrate any third-party analytics platforms, advertising networks, social media trackers, crash-reporting SDKs, or data brokers. Your gameplay data is never transmitted anywhere.

4. No Account Registration

GoldRush Arena does not require an email address, phone number, or any personally identifiable information. Usernames are freely chosen by you and exist only on your device. There are no external user accounts.

5. Permissions

GoldRush Arena does not request access to your camera, microphone, location, contacts, or any other sensitive device permissions beyond what is required for gameplay.

6. Children's Privacy

Since GoldRush Arena collects no information from any user, it is safe for all ages, including children under 13. We fully comply with the Children's Online Privacy Protection Act (COPPA).

7. In-App Purchases

GoldRush Arena currently contains no in-app purchases. All game content is available through gameplay progression.

8. Changes to This Policy

We may update this Privacy Policy from time to time to reflect changes in the app. Any changes will be reflected with an updated "Last updated" date at the top of this policy.

9. Contact Us

If you have any questions about this Privacy Policy, please contact us at:
goldrush.arena@gmail.com`;

const TERMS_OF_SERVICE = `Last updated: July 2026

Please read these Terms of Service carefully before using GoldRush Arena. By downloading or using the app, you agree to be bound by these Terms.

1. License

GoldRush Arena grants you a personal, non-exclusive, non-transferable, revocable license to use the application on your mobile device solely for your personal, non-commercial entertainment purposes.

2. Acceptable Use

You agree not to:
• Reverse-engineer, decompile, or modify the app or its source code
• Use the app for any unlawful or harmful purpose
• Exploit bugs, glitches, or unintended mechanics for unfair advantage
• Attempt to interfere with or disrupt the operation of the app
• Create derivative works based on the app without prior written consent

3. Virtual Goods

All in-game items — including coins, skins, relics, and other virtual goods — are virtual game assets with no real-world monetary value. They cannot be sold, transferred, traded, or exchanged for real money or any other goods or services outside of the app.

4. Intellectual Property

All content within GoldRush Arena, including but not limited to graphics, game mechanics, sounds, and text, is the intellectual property of GoldRush Arena and is protected by applicable copyright and intellectual property laws.

5. Disclaimer of Warranties

GoldRush Arena is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the app will be uninterrupted, error-free, or free of viruses or other harmful components.

6. Limitation of Liability

To the maximum extent permitted by applicable law, GoldRush Arena and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the app.

7. Termination

We reserve the right to terminate or suspend your access to the app at any time, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.

8. Changes to Terms

We reserve the right to modify these Terms at any time. We will notify you of significant changes by updating the "Last updated" date. Continued use of the app after changes constitutes acceptance of the new Terms.

9. Governing Law

These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.

10. Contact

For questions or concerns about these Terms:
goldrush.arena@gmail.com`;

export default function LegalScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(
    params.tab === 'terms' ? 'terms' : 'privacy'
  );
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 44) : insets.top;
  const content = activeTab === 'privacy' ? PRIVACY_POLICY : TERMS_OF_SERVICE;

  return (
    <Reanimated.View entering={FadeIn.duration(350)} style={{ flex: 1 }}>
      <LinearGradient colors={['#07090F', '#0D1428', '#07090F']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Feather name="arrow-left" size={22} color="#F0F0FF" />
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
    </Reanimated.View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  back:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 16, letterSpacing: 2, color: '#F0F0FF' },

  tabRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#FFFFFF0C', borderRadius: 14, padding: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  tabBtnActive: { backgroundColor: '#C8820A22', borderWidth: 1, borderColor: '#C8820A55' },
  tabText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 0.5, color: '#FFFFFF44' },
  tabTextActive: { color: '#C8820A' },

  scrollContent: { paddingHorizontal: 20, gap: 16 },
  card: {
    backgroundColor: '#FFFFFF07', borderRadius: 16, borderWidth: 1,
    borderColor: '#FFFFFF11', padding: 18,
  },
  body: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: '#FFFFFF99',
    lineHeight: 22,
  },
  footer: {
    fontFamily: 'Inter_400Regular', fontSize: 10, color: '#FFFFFF22',
    textAlign: 'center',
  },
});
