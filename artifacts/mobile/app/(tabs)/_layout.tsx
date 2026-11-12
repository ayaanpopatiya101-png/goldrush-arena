// Primary navigation: Play, Events, Collection, Shop, Profile.
// Road (trophyroad: pass + Trophy Road entry) is a primary tab; Ranks stays hidden,
// reached from contextual entry points on Home and Profile.
import { Feather } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type IconName = React.ComponentProps<typeof Feather>['name'];

function TabIcon({ name, label, focused, wide }: { name: IconName; label: string; focused: boolean; wide?: boolean }) {
  const c = focused ? palette.onAccent : palette.supporting;
  return (
    <View style={wide ? styles.tabItemWide : styles.tabItem}>
      <View style={[styles.iconPlate, focused && styles.iconPlateOn]}>
        <Feather name={name} size={wide ? 18 : 20} color={c} />
      </View>
      <Text style={[wide ? styles.tabLabelWide : styles.tabLabel, { color: focused ? palette.foreground : palette.supporting, fontFamily: focused ? fonts.bodyBold : fonts.body }]} numberOfLines={2}>
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
  // Road opens Trophy Road directly; the Battle Pass (this route) stays reachable from Home and Trophy Road.
  { name: 'trophyroad', label: 'Road', icon: 'map' },
  { name: 'shop', label: 'Shop', icon: 'shopping-bag' },
  { name: 'profile', label: 'Profile', icon: 'user' },
];

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const reduced = useReducedMotion();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: reduced ? 'none' : 'fade',
        tabBarShowLabel: false,
        tabBarPosition: wide ? 'top' : 'bottom',
        tabBarStyle: wide ? {
          backgroundColor: palette.surface,
          borderBottomWidth: 2,
          borderBottomColor: palette.edge,
          borderTopWidth: 0,
          elevation: 0,
          height: 60 + insets.top,
          paddingTop: insets.top,
          paddingHorizontal: Math.max(18, (width - 1160) / 2),
        } : {
          position: 'absolute',
          backgroundColor: palette.surface,
           borderTopWidth: 2,
           borderTopColor: palette.edge,
          elevation: 0,
          height: isWeb ? 84 : 60 + insets.bottom,
          paddingBottom: isWeb ? 0 : insets.bottom,
        },
      }}
    >
      {TABS.map(t => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.label,
            tabBarAccessibilityLabel: t.label,
            tabBarIcon: ({ focused }) => <TabIcon name={t.icon} label={t.label} focused={focused} wide={wide} />,
          }}
          listeners={t.name === 'trophyroad' ? { tabPress: e => { e.preventDefault(); router.push('/trophyroad-map'); } } : undefined}
        />
      ))}
      <Tabs.Screen name="leaderboard" options={{ href: null, title: 'Ranks' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingTop: 6, minWidth: 52, minHeight: 44 },
  tabLabel: { fontSize: 13, textAlign: 'center' },
  tabItemWide: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12 },
  tabLabelWide: { fontSize: 16 },
  pip: { width: 18, height: 3, marginTop: 1 },
  iconPlate: { width: 44, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  iconPlateOn: { backgroundColor: palette.primary, borderColor: '#4E9A2A', borderBottomWidth: 3 },
});
