import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  { name: 'index',       icon: '⚡', label: 'HOME'    },
  { name: 'leaderboard', icon: '🏆', label: 'RANKS'   },
  { name: 'profile',     icon: '👤', label: 'PROFILE' },
  { name: 'shop',        icon: '🛒', label: 'SHOP'    },
  { name: 'inventory',   icon: '📦', label: 'GEAR'    },
  { name: 'trophyroad',  icon: '🗺️', label: 'TROPHY'  },
];

const GOLD  = '#F0B429';
const DARK  = '#0C0A1C';

function Tab({ cfg, active, onPress }: { cfg: typeof TABS[0]; active: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  function press() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.82, duration: 70,  useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1,    friction: 5,   useNativeDriver: true }),
    ]).start();
    onPress();
  }
  return (
    <Pressable onPress={press} style={S.tab}>
      {active && <View style={S.activeLine} />}
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center', gap: 2 }}>
        <Text style={[S.icon, { opacity: active ? 1 : 0.3 }]}>{cfg.icon}</Text>
        <Text style={[S.label, { color: active ? GOLD : '#FFFFFF22' }]}>{cfg.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GameTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[S.bar, { paddingBottom: Math.max(insets.bottom, 4) }]}>
      <LinearGradient colors={[DARK + 'EE', '#080616EE']} style={StyleSheet.absoluteFill} />
      <View style={S.topBorder} />
      {state.routes.map((route: { key: string; name: string }, idx: number) => (
        <Tab
          key={route.key}
          cfg={TABS[idx] ?? { name: route.name, icon: '📱', label: route.name.toUpperCase().slice(0, 5) }}
          active={state.index === idx}
          onPress={() => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!e.defaultPrevented) navigation.navigate(route.name);
          }}
        />
      ))}
    </View>
  );
}

const S = StyleSheet.create({
  bar:      { flexDirection: 'row', minHeight: 56, overflow: 'hidden' },
  topBorder:{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: GOLD + '30' },
  tab:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 8, paddingBottom: 4 },
  activeLine: {
    position: 'absolute', top: 0, left: '30%', right: '30%', height: 2,
    backgroundColor: GOLD, borderRadius: 1,
    shadowColor: GOLD, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  icon:  { fontSize: 18 },
  label: { fontFamily: 'Exo2_700Bold', fontSize: 7.5, letterSpacing: 0.8 },
});

export default function TabLayout() {
  return (
    <Tabs tabBar={(p) => <GameTabBar {...p} />} screenOptions={{ headerShown: false }}>
      {TABS.map(t => <Tabs.Screen key={t.name} name={t.name} />)}
    </Tabs>
  );
}
