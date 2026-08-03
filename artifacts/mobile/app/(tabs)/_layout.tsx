import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { router, Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

function TabIcon({ name, color, label, focused }: {
  name: React.ComponentProps<typeof Feather>['name'];
  color: string;
  label: string;
  focused: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const pipScaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      // Spring-bounce icon + fade in glow + slide-in pip
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1.18, useNativeDriver: true, bounciness: 14, speed: 16 }),
        Animated.timing(glowAnim,  { toValue: 1,    duration: 200, useNativeDriver: true }),
        Animated.spring(pipScaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 10, speed: 14 }),
      ]).start(() => {
        // Gentle idle pulse
        Animated.loop(Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.13, duration: 1400, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1.18, duration: 1400, useNativeDriver: true }),
        ])).start();
      });
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim,    { toValue: 1,  useNativeDriver: true, bounciness: 6 }),
        Animated.timing(glowAnim,     { toValue: 0,  duration: 180, useNativeDriver: true }),
        Animated.timing(pipScaleAnim, { toValue: 0,  duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [focused]);

  return (
    <View style={styles.tabItem}>
      {/* Glow halo behind icon */}
      <Animated.View style={[
        styles.glowHalo,
        { backgroundColor: color + '18', shadowColor: color, opacity: glowAnim },
      ]} />

      <Animated.View style={[
        styles.iconWrap,
        focused && { backgroundColor: color + '22' },
        { transform: [{ scale: scaleAnim }] },
      ]}>
        <Feather name={name} size={21} color={focused ? color : '#FFFFFF2E'} />
      </Animated.View>

      <Text style={[styles.tabLabel, {
        color: focused ? color : '#FFFFFF26',
        fontFamily: focused ? 'Inter_700Bold' : 'Inter_400Regular',
        fontSize: 9,
      }]}>
        {label}
      </Text>

      {/* Animated active pip */}
      <Animated.View style={[
        styles.activePip,
        { backgroundColor: color, shadowColor: color, transform: [{ scaleX: pipScaleAnim }] },
      ]} />
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === 'ios';

  // Show onboarding flow once on first launch after login
  useEffect(() => {
    AsyncStorage.getItem('@onboarding_flow_done').then(val => {
      if (!val) router.push('/onboarding-flow' as never);
    });
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#3A4255',
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'web' ? 74 : 66,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            {isIOS ? (
              <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.tabBg]} />
            )}
            <View style={styles.tabBorder} />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="award" color={color} label="Ranks" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="user" color={color} label="Profile" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="shopping-bag" color={color} label="Shop" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="archive" color={color} label="Gear" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="trophyroad"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="gift" color={color} label="Pass" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="zap" color={color} label="Events" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBg: {
    backgroundColor: '#04060CF2',
  },
  tabBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#FFFFFF14',
  },
  tabItem: {
    alignItems: 'center',
    gap: 2,
    paddingTop: 6,
  },
  glowHalo: {
    position: 'absolute',
    top: 2,
    width: 48,
    height: 36,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  iconWrap: {
    width: 44,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePip: {
    width: 18,
    height: 2.5,
    borderRadius: 2,
    marginTop: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  tabLabel: {
    letterSpacing: 0.5,
  },
});
