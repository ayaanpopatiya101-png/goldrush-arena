import React, { useEffect, useState } from "react";
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { GameArena, type GameResult } from "@/components/GameArena";
import { usePlayer } from "@/context/PlayerContext";
import { useSettings } from "@/hooks/useSettings";

/** Uses the production physics and input loop, with no reward or inventory side effects. */
export default function Warmup() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile } = usePlayer();
  const { settings } = useSettings();
  const [round, setRound] = useState(0);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [lives, setLives] = useState(5);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") setPaused(true);
    });
    return () => sub.remove();
  }, []);
  function restart() {
    setResult(null);
    setLives(5);
    setPaused(false);
    setRound((v) => v + 1);
  }
  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 24,
        alignItems: "center",
      }}
    >
      <View style={s.header}>
        <Pressable
          accessibilityLabel="Back to arena"
          onPress={() => router.back()}
          style={s.back}
        >
          <Feather name="x" size={22} color="#EEE7D8" />
        </Pressable>
        <Text style={s.heading}>Warm-up court</Text>
        <Text style={s.offline}>Offline</Text>
      </View>
      <View style={s.scoreboard}>
        <View>
          <Text style={s.label}>Your lives</Text>
          <Text style={s.score}>{lives}</Text>
        </View>
        <View>
          <Text style={s.label}>Rank & rewards</Text>
          <Text style={s.unchanged}>Unchanged</Text>
        </View>
      </View>
      <View style={{ marginTop: 16 }}>
        <GameArena
          key={round}
          arenaSize={Math.min(width - 32, 480)}
          playerName={profile.name}
          playerColor="#D0AF66"
          playerGlowColor="transparent"
          botNames={["North", "West", "East"]}
          botRanks={["Bronze 1", "Bronze 1", "Bronze 1"]}
          botDifficulty="easy"
          botSkill={0.2}
          initialLives={5}
          practice
          colorBoard={false}
          soundEnabled={settings.soundEnabled}
          sensitivity={settings.sensitivity}
          paused={paused || !!result}
          onPlayerLivesChange={setLives}
          onGameOver={setResult}
        />
        {paused && !result && (
          <View style={s.overlay}>
            <Text style={s.resultTitle}>Paused</Text>
            <Pressable onPress={() => setPaused(false)} style={s.primary}>
              <Text style={s.darkText}>Resume warm-up</Text>
            </Pressable>
          </View>
        )}
        {!!result && (
          <View style={s.overlay}>
            <Text style={s.resultTitle}>
              {result.won ? "Court held" : "One more rally?"}
            </Text>
            <Text style={s.resultDetail}>
              {result.deflections} deflections · {result.goalsAgainst} goals
              conceded
            </Text>
            <Pressable onPress={restart} style={s.primary}>
              <Text style={s.darkText}>Play again</Text>
            </Pressable>
          </View>
        )}
      </View>
      <View style={s.instructions}>
        <Text style={s.subheading}>Read the rebound</Text>
        <Text style={s.body}>
          Drag along your bottom edge to move the paddle. Keep it between the
          ball and your goal. Successful blocks fill your super meter; tap it
          when full to activate.
        </Text>
        <Text style={s.body}>
          The court changes shape as players are eliminated. This is the same
          engine used in regular matches.
        </Text>
        <View style={s.controls}>
          <Pressable
            disabled={!!result}
            onPress={() => setPaused((v) => !v)}
            style={s.secondary}
          >
            <Text>{paused ? "Resume" : "Pause"}</Text>
          </Pressable>
          <Pressable onPress={restart} style={s.secondary}>
            <Text>Restart</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#191B19" },
  header: {
    width: "100%",
    maxWidth: 512,
    flexDirection: "row",
    paddingHorizontal: 16,
    alignItems: "center",
  },
  back: { minHeight: 44, width: 44, justifyContent: "center" },
  heading: { flex: 1, fontSize: 20 },
  offline: { fontSize: 12, color: "#B9BDAF" },
  scoreboard: {
    width: "100%",
    maxWidth: 512,
    flexDirection: "row",
    paddingHorizontal: 24,
    marginTop: 20,
    justifyContent: "space-between",
  },
  label: { color: "#B9BDAF", fontSize: 12 },
  score: { fontFamily: "Rajdhani_600SemiBold", fontSize: 40 },
  unchanged: { marginTop: 8, fontSize: 16 },
  instructions: { maxWidth: 512, width: "100%", padding: 24 },
  subheading: { fontSize: 24, fontFamily: "Rajdhani_600SemiBold" },
  body: { color: "#B9BDAF", fontSize: 14, lineHeight: 22, marginTop: 12 },
  controls: { flexDirection: "row", gap: 12, marginTop: 20 },
  secondary: {
    paddingHorizontal: 24,
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#666B5E",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#191B19F5",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  resultTitle: { fontSize: 32, fontFamily: "Rajdhani_600SemiBold" },
  resultDetail: { color: "#B9BDAF", fontSize: 14, marginTop: 12 },
  primary: { backgroundColor: "#D0AF66", padding: 16, marginTop: 24 },
  darkText: { color: "#191B19", fontSize: 16 },
});
