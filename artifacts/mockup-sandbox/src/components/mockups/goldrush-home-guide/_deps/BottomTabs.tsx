// Copied from mobile/app/(tabs)/_layout.tsx. Expo Tabs' navigator shell is replaced
// with a local row. This extraction explicitly keeps the requested bottom bar
// at every width (production uses a top bar at >=900px); narrow values unchanged.
import React from 'react';
import { Feather } from './icons';
import { Pressable, StyleSheet, Text, View } from './native';
import { palette } from './colors';
import { fonts } from './typography';
import { router } from './state';

type IconName = React.ComponentProps<typeof Feather>['name'];
function TabIcon({ name, label, focused, wide }: { name: IconName; label: string; focused: boolean; wide?: boolean }) {
  const c = focused ? palette.charcoal : palette.slate;
  return (
    <View style={wide ? styles.tabItemWide : styles.tabItem}>
      <Feather name={name} size={wide ? 18 : 20} color={c} />
      <Text style={[wide ? styles.tabLabelWide : styles.tabLabel, { color: c, fontFamily: focused ? fonts.bodyBold : fonts.body }]} numberOfLines={2}>
        {label}
      </Text>
      {wide ? null : <View style={[styles.pip, { backgroundColor: focused ? palette.orange : 'transparent' }]} />}
    </View>
  );
}
const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Play', icon: 'play-circle' },
  { name: 'events', label: 'Events', icon: 'calendar' },
  { name: 'inventory', label: 'Collection', icon: 'archive' },
  { name: 'shop', label: 'Shop', icon: 'shopping-bag' },
  { name: 'profile', label: 'Profile', icon: 'user' },
];
export function BottomTabs() {
  return (
    <View accessibilityRole="tablist" style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      flexDirection: 'row',
      backgroundColor: palette.ink, borderTopWidth: 2,
      borderTopColor: palette.lineStrong, height: 84, paddingBottom: 0,
    }}>
      {TABS.map(t => (
        <Pressable key={t.name} accessibilityRole="tab"
          accessibilityLabel={t.label} accessibilityState={{ selected: t.name === 'index' }}
          onPress={() => { if (t.name !== 'index') router.push(`/${t.name}`); }}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <TabIcon name={t.icon} label={t.label} focused={t.name === 'index'} />
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  tabItem: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingTop: 6, minWidth: 64, minHeight: 44 },
  tabLabel: { fontSize: 13, textAlign: 'center' },
  tabItemWide: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12 },
  tabLabelWide: { fontSize: 16 },
  pip: { width: 18, height: 2, borderRadius: 1, marginTop: 2 },
});
