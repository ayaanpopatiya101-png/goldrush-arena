import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/ui/BrandMark';
import { Button, Shell } from '@/components/ui/Primitives';
import { palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Page not found' }} />
      <View style={s.root}>
        <Shell variant="prose" style={s.box}>
          <BrandMark size={56} />
          <Text style={s.title} accessibilityRole="header">This page is off the court</Text>
          <Text style={s.body}>The link may be old or mistyped. Your saved progress is unaffected.</Text>
          <Button label="Return home" size="lg" onPress={() => router.replace('/')} style={{ alignSelf: 'stretch' }} />
        </Shell>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink, justifyContent: 'center' },
  box: { alignItems: 'center', gap: 16, maxWidth: 420 },
  title: { fontFamily: fonts.display, fontSize: 32, color: palette.paper, textAlign: 'center' },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: palette.paperDim, textAlign: 'center' },
});
