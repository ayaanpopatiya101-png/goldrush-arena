import React, { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export default function TabLayout() {
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem("@onboarding_flow_done")
      .then((value) => {
        if (active && !value) router.push("/onboarding-flow");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const tabs = [
    ["index", "Arena", "target"],
    ["leaderboard", "Ranks", "award"],
    ["profile", "Player", "user"],
    ["shop", "Shop", "shopping-bag"],
    ["inventory", "Gear", "archive"],
    ["trophyroad", "Pass", "flag"],
    ["events", "Events", "calendar"],
  ] as const;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#D0AF66",
        tabBarInactiveTintColor: "#B9BDAF",
        tabBarStyle: {
          backgroundColor: "#191B19",
          borderTopColor: "#34382F",
          elevation: 0,
          height: Platform.OS === "web" ? 72 : 88,
          paddingBottom: Platform.OS === "web" ? 8 : 24,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
      }}
    >
      {tabs.map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color }) => (
              <Feather name={icon} color={color} size={20} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
