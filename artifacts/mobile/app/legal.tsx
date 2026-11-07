import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Panel, ScreenTitle, Shell, paperText } from '@/components/ui/Primitives';
import { palette, tactile } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '@/lib/legalContent';

export type LegalDoc = 'terms' | 'privacy';

// Readable legal document. Used by the /legal route and inline from the entry screen
// (which renders before the router stack exists).
export function LegalDocument({ doc, onDocChange, onBack, backLabel = 'Back' }: {
  doc: LegalDoc; onDocChange: (d: LegalDoc) => void; onBack: () => void; backLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 24) : insets.top;
  const content = doc === 'privacy' ? PRIVACY_POLICY : TERMS_OF_SERVICE;
  const paragraphs = content.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

  return (
    <View style={s.root}>
      <Shell variant="prose" style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={onBack} style={s.back} accessibilityRole="button" accessibilityLabel={backLabel}>
          <Feather name="arrow-left" size={20} color={palette.paper} />
          <Text style={s.backText}>{backLabel}</Text>
        </Pressable>
        <View style={s.tabRow} accessibilityRole="tablist">
          {(['terms', 'privacy'] as const).map(d => {
            const on = d === doc;
            return (
              <Pressable
                key={d}
                onPress={() => onDocChange(d)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[s.tab, on && s.tabOn]}
              >
                <Text style={[s.tabText, on && s.tabTextOn]}>{d === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</Text>
              </Pressable>
            );
          })}
        </View>
      </Shell>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <Shell variant="prose" style={{ gap: 14, paddingTop: 16 }}>
          <ScreenTitle kicker="Legal" title={doc === 'terms' ? 'Terms' : 'Privacy'} />
          <Panel tone="paper" style={{ padding: 16, gap: 14 }}>
            {paragraphs.map((p, i) => <Text key={i} style={[s.body, { color: paperText.ink }]}>{p}</Text>)}
          </Panel>
          <Text style={s.footer}>Pre-release documents. Publisher identity and support contact are not configured yet.</Text>
        </Shell>
      </ScrollView>
    </View>
  );
}

export default function LegalScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [doc, setDoc] = useState<LegalDoc>(params.tab === 'terms' ? 'terms' : 'privacy');
  return (
    <LegalDocument
      doc={doc}
      onDocChange={setDoc}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  header: { gap: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: palette.line },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'flex-start', paddingRight: 12 },
  backText: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: palette.paper },
  tabRow: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.line, borderRadius: 3 },
  tabOn: { borderColor: tactile.brassEdge, backgroundColor: palette.ochre },
  tabText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: palette.paperDim },
  tabTextOn: { color: tactile.paperInk },
  title: { fontFamily: fonts.display, fontSize: 32, color: palette.paper },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25, color: palette.paper },
  footer: { fontFamily: fonts.body, fontSize: 14, color: palette.muted, marginTop: 12 },
});
