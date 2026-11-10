import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/ui/BrandMark';
import { Button, Panel, ScreenTitle, Shell, paperText } from '@/components/ui/Primitives';
import { palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Page not found' }} />
      <View style={s.root}>
        <Shell variant="prose" style={s.box}>
          <BrandMark size={56} />
          <ScreenTitle kicker="Not found" title="Off the court" style={{ alignSelf: 'stretch' }} />
          <Panel tone="paper" style={{ padding: 16, alignSelf: 'stretch' }}>
            <Text style={[s.body, { color: paperText.ink }]}>The link may be old or mistyped. Your saved progress is unaffected.</Text>
          </Panel>
          <Button label="Return home" size="lg" onPress={() => router.replace('/')} style={{ alignSelf: 'stretch' }} />
        </Shell>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background, justifyContent: 'center' },
  box: { alignItems: 'center', gap: 16, maxWidth: 420 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: palette.supporting, textAlign: 'center' },
});
