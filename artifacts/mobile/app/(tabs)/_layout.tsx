// Primary navigation: Play, Events, Collection, Shop, Profile.
// Ranks (leaderboard) and Pass (trophyroad) stay registered as hidden routes,
// reached from contextual entry points on Home and Profile.
import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';

type IconName = React.ComponentProps<typeof Feather>['name'];

function TabIcon({ name, label, focused, wide }: { name: IconName; label: string; focused: boolean; wide?: boolean }) {
  const c = focused ? palette.ochre : palette.paperDim;
  return (
    <View style={wide ? styles.tabItemWide : styles.tabItem}>
      <Feather name={name} size={wide ? 18 : 20} color={c} />
      <Text style={[wide ? styles.tabLabelWide : styles.tabLabel, { color: c, fontFamily: focused ? fonts.bodyBold : fonts.body }]} numberOfLines={2}>
        {label}
      </Text>
      {wide ? null : <View style={[styles.pip, { backgroundColor: focused ? palette.ochre : 'transparent' }]} />}
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

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarPosition: wide ? 'top' : 'bottom',
        tabBarStyle: wide ? {
          backgroundColor: palette.ink,
          borderBottomWidth: 1,
          borderBottomColor: palette.line,
          borderTopWidth: 0,
          elevation: 0,
          height: 60 + insets.top,
          paddingTop: insets.top,
          paddingHorizontal: Math.max(18, (width - 1160) / 2),
        } : {
          position: 'absolute',
          backgroundColor: palette.ink,
           borderTopWidth: 2,
           borderTopColor: palette.lineStrong,
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
        />
      ))}
      <Tabs.Screen name="leaderboard" options={{ href: null, title: 'Ranks' }} />
      <Tabs.Screen name="trophyroad" options={{ href: null, title: 'Pass' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingTop: 6, minWidth: 64, minHeight: 44 },
  tabLabel: { fontSize: 13, textAlign: 'center' },
  tabItemWide: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12 },
  tabLabelWide: { fontSize: 16 },
  pip: { width: 18, height: 2, borderRadius: 1, marginTop: 2 },
});
