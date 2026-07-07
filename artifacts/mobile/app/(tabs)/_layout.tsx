import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const TABS_CONFIG = [
  { name: 'index',       emoji: '🏠', label: 'HOME'  },
  { name: 'leaderboard', emoji: '🏆', label: 'RANKS' },
  { name: 'profile',     emoji: '👤', label: 'ME'    },
  { name: 'shop',        emoji: '🛒', label: 'SHOP'  },
  { name: 'inventory',   emoji: '📦', label: 'GEAR'  },
  { name: 'trophyroad',  emoji: '🗺️', label: 'ROAD'  },
];

function TabItem({ tab, active, onPress }: {
  tab: typeof TABS_CONFIG[0]; active: boolean; onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.78, duration: 80,  useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1,    friction: 4,   useNativeDriver: true }),
    ]).start();
    onPress();
  }

  return (
    <Pressable onPress={handlePress} style={T.item}>
      {active && <View style={T.activeBar} />}
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
        {active && <View style={T.glow} />}
        <Text style={[T.emoji, !active && T.dimEmoji]}>{tab.emoji}</Text>
        <Text style={[T.label, active ? T.labelActive : T.labelDim]}>{tab.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GameTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[T.bar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      <LinearGradient
        colors={['#100E20', '#0A0814']}
        style={[StyleSheet.absoluteFill, { borderTopWidth: 1, borderTopColor: '#FFFFFF0E' }]}
      />
      {/* Thin gold shimmer line at very top */}
      <View style={T.goldLine} />
      {state.routes.map((route: { key: string; name: string }, idx: number) => (
        <TabItem
          key={route.key}
          tab={TABS_CONFIG[idx] ?? { name: route.name, emoji: '📱', label: route.name.slice(0, 4).toUpperCase() }}
          active={state.index === idx}
          onPress={() => {
            const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!ev.defaultPrevented) navigation.navigate(route.name);
          }}
        />
      ))}
    </View>
  );
}

const T = StyleSheet.create({
  bar: { flexDirection: 'row', minHeight: 58, overflow: 'hidden' },
  goldLine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
    backgroundColor: '#E5A02033',
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 6, paddingBottom: 2 },
  activeBar: {
    position: 'absolute', top: 0, left: '20%', right: '20%', height: 2.5,
    backgroundColor: '#E5A020', borderRadius: 2,
    shadowColor: '#E5A020', shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  },
  glow: {
    position: 'absolute', width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#E5A020', opacity: 0.12,
  },
  emoji: { fontSize: 21 },
  dimEmoji: { opacity: 0.3 },
  label: { fontFamily: 'Inter_700Bold', fontSize: 7.5, letterSpacing: 1, marginTop: 1 },
  labelActive: { color: '#E5A020' },
  labelDim: { color: '#FFFFFF22' },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <GameTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {TABS_CONFIG.map(tab => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
    </Tabs>
  );
}
