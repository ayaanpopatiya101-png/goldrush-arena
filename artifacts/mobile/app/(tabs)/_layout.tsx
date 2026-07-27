import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

function TabIcon({ name, color, label, focused }: {
  name: React.ComponentProps<typeof Feather>['name'];
  color: string;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={styles.tabItem}>
      <View style={[styles.iconWrap, focused && { backgroundColor: color + '1E' }]}>
        <Feather name={name} size={21} color={focused ? color : '#FFFFFF2E'} />
      </View>
      <Text style={[styles.tabLabel, {
        color: focused ? color : '#FFFFFF26',
        fontFamily: focused ? 'Inter_700Bold' : 'Inter_400Regular',
        fontSize: 9,
      }]}>
        {label}
      </Text>
      {focused && <View style={[styles.activePip, { backgroundColor: color }]} />}
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === 'ios';

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
  },
  tabLabel: {
    letterSpacing: 0.5,
  },
});
