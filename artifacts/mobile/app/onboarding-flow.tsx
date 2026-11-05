import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
export const ONBOARDING_FLOW_KEY = "@onboarding_flow_done";
export default function FirstCourt() {
  const insets = useSafeAreaInsets();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function finish(practice: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      await AsyncStorage.setItem(ONBOARDING_FLOW_KEY, "1");
      router.replace(practice ? "/warmup" : "/(tabs)");
    } catch {
      setError("Could not save your preference. Please try again.");
      setBusy(false);
    }
  }
  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 48 }]}
    >
      <Text style={s.eyebrow}>Before the first serve</Text>
      <Text style={s.title}>Learn it{"\n"}on the court.</Text>
      {[
        [
          "01",
          "Move your paddle",
          "Drag along the bottom edge. Meet the ball before it reaches your goal.",
        ],
        [
          "02",
          "Build your super",
          "Every successful block fills your super meter. Tap the full meter to activate your ability.",
        ],
        [
          "03",
          "Stay in play",
          "Miss a ball and lose a life. The court changes as opponents fall. Be the last one standing.",
        ],
      ].map(([number, title, body]) => (
        <View key={number} style={s.row}>
          <Text style={s.number}>{number}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.rowTitle}>{title}</Text>
            <Text style={s.body}>{body}</Text>
          </View>
        </View>
      ))}
      <Pressable disabled={busy} onPress={() => finish(true)} style={s.primary}>
        <Text style={s.primaryText}>
          {busy ? "Opening court…" : "Try a warm-up"}
        </Text>
      </Pressable>
      <Pressable
        disabled={busy}
        onPress={() => finish(false)}
        style={s.secondary}
      >
        <Text>Go to match desk</Text>
      </Pressable>
      <Text style={s.note}>
        Warm-up is offline and never changes your rank, coins, or lives
        inventory.
      </Text>
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#191B19" },
  content: { padding: 24, maxWidth: 560, alignSelf: "center", width: "100%" },
  eyebrow: { color: "#D0AF66", fontSize: 14 },
  title: {
    fontFamily: "Rajdhani_600SemiBold",
    fontSize: 52,
    lineHeight: 52,
    marginTop: 16,
    marginBottom: 32,
  },
  row: {
    flexDirection: "row",
    gap: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderColor: "#34382F",
  },
  number: { color: "#D0AF66", fontSize: 16, width: 24 },
  rowTitle: { fontSize: 19 },
  body: { marginTop: 8, fontSize: 15, lineHeight: 23, color: "#B9BDAF" },
  primary: {
    marginTop: 24,
    backgroundColor: "#D0AF66",
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#191B19", fontSize: 16, fontWeight: "600" },
  secondary: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#666B5E",
  },
  note: { color: "#B9BDAF", fontSize: 12, lineHeight: 20, marginTop: 20 },
});
