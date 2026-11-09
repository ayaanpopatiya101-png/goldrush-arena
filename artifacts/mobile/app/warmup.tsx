import React, { useEffect, useMemo, useState } from "react";
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { PADDLE_FINISHES, THEME_FINISHES, STRIKE_FINISHES, artworkFor, type Artwork } from "@workspace/goldrush-catalog/cosmetics";
import { useCosmetics } from "@/hooks/useCosmetics";
import { sanitizeArtwork } from "@/components/cosmetics/PaddleArt";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { GameArena, type GameResult } from "@/components/GameArena";
import { usePlayer } from "@/context/PlayerContext";
import { useSettings } from "@/hooks/useSettings";
import { palette , PLAYER_COLORS } from "@/constants/colors";
import {useEquippedCosmetics} from '@/hooks/useEquippedCosmetics';

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
  // Trial: preview an item on court without equipping or granting it. Leaving unmounts it.
  const params = useLocalSearchParams<{ kind?: string; id?: string; design?: string }>();
  const cos = useCosmetics();
  const equipped=useEquippedCosmetics();
  const trial = useMemo(() => {
    const kind = typeof params.kind === "string" ? params.kind : undefined;
    const id = typeof params.id === "string" ? params.id : undefined;
    const designId = typeof params.design === "string" ? params.design : undefined;
    if (designId) {
      const d = cos.state?.designs.find((x) => x.id === designId);
      if (!d) return { label: "", missing: cos.loading ? "Loading your design" : "That design was not found", artwork: undefined as Artwork | undefined, theme: undefined as string | undefined, strike: undefined as string | undefined, kind: "skin" };
      return { label: d.name, missing: "", artwork: sanitizeArtwork(d as unknown as Artwork), theme: undefined, strike: undefined, kind: "skin" };
    }
    if (kind === "skin" && id && PADDLE_FINISHES.some((p) => p.id === id))
      return { label: PADDLE_FINISHES.find((p) => p.id === id)!.name, missing: "", artwork: artworkFor(id), theme: undefined, strike: undefined, kind };
    if (kind === "theme" && id && THEME_FINISHES.some((t) => t.id === id))
      return { label: THEME_FINISHES.find((t) => t.id === id)!.name, missing: "", artwork: undefined, theme: id, strike: undefined, kind };
    if (kind === "strike" && id && STRIKE_FINISHES.some((t) => t.id === id))
      return { label: STRIKE_FINISHES.find((t) => t.id === id)!.name, missing: "", artwork: undefined, theme: undefined, strike: id, kind };
    if (kind || id) return { label: "", missing: "That item is not in the catalog", artwork: undefined, theme: undefined, strike: undefined, kind: "skin" };
    return null;
  }, [params.kind, params.id, params.design, cos.state, cos.loading]);
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
          accessibilityRole="button"
          onPress={() => router.back()}
          style={s.back}
        >
          <Feather name="x" size={22} color={palette.foreground} />
        </Pressable>
        <Text style={s.heading}>{trial?.label ? "Try on court" : "Warm-up court"}</Text>
        <Text style={s.offline}>Offline</Text>
      </View>
      {trial && (
        <View style={s.trial} accessibilityLiveRegion="polite">
          <Text style={s.trialKicker}>Trial · ownership and equipped items unchanged</Text>
          <Text style={s.trialName}>{trial.missing || trial.label}</Text>
          {!trial.missing && (
            <Text style={s.trialBody}>
              {trial.kind === "strike"
                ? "Goal: block 3 shots. The hit mark appears on every paddle contact and when a goal lands."
                : trial.kind === "theme"
                  ? "Goal: hold the court for one rally. Only floor and markings change."
                  : "Goal: block 3 shots with this finish on your bottom paddle."}{" "}
              Size, speed and scoring are identical. Leave to return to your own setup.
            </Text>
          )}
        </View>
      )}
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
          playerColor={trial?.artwork?.base ?? PLAYER_COLORS[0]}
          artwork={trial?.artwork??equipped.artwork}
          arenaTheme={trial?.theme??equipped.arenaTheme}
          strikeEffect={trial?.strike??equipped.strikeEffect}
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
            <Pressable accessibilityRole="button" onPress={() => setPaused(false)} style={s.primary}>
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
            <Pressable accessibilityRole="button" onPress={restart} style={s.primary}>
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
            accessibilityRole="button"
            disabled={!!result}
            onPress={() => setPaused((v) => !v)}
            style={s.secondary}
          >
            <Text>{paused ? "Resume" : "Pause"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={restart} style={s.secondary}>
            <Text>Restart</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  trial: { width: "100%", maxWidth: 480, marginTop: 12, marginHorizontal: 16, padding: 12, gap: 4, backgroundColor: palette.inset, borderWidth: 2, borderColor: palette.edge },
  trialKicker: { fontFamily: "SourceSans3_700Bold", fontSize: 12, letterSpacing: 1.4, color: palette.gold, textTransform: "uppercase" },
  trialName: { fontFamily: "BarlowCondensed_700Bold", fontSize: 26, color: palette.foreground, textTransform: "uppercase" },
  trialBody: { fontFamily: "SourceSans3_400Regular", fontSize: 14, lineHeight: 19, color: palette.foreground },
  page: { flex: 1, backgroundColor: palette.background },
  header: {
    width: "100%",
    maxWidth: 512,
    flexDirection: "row",
    paddingHorizontal: 16,
    alignItems: "center",
  },
  back: { minHeight: 44, width: 44, justifyContent: "center" },
  heading: { flex: 1, fontSize: 20 },
  offline: { fontSize: 12, color: palette.supporting },
  scoreboard: {
    width: "100%",
    maxWidth: 512,
    flexDirection: "row",
    paddingHorizontal: 24,
    marginTop: 20,
    justifyContent: "space-between",
  },
  label: { color: palette.supporting, fontSize: 12 },
  score: { fontFamily: "BarlowCondensed_700Bold", fontSize: 40 },
  unchanged: { marginTop: 8, fontSize: 16 },
  instructions: { maxWidth: 512, width: "100%", padding: 24 },
  subheading: { fontSize: 24, fontFamily: "BarlowCondensed_700Bold" },
  body: { color: palette.supporting, fontSize: 14, lineHeight: 22, marginTop: 12 },
  controls: { flexDirection: "row", gap: 12, marginTop: 20 },
  secondary: {
    paddingHorizontal: 24,
    minHeight: 48,
    borderWidth: 1,
    borderColor: palette.border,
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${palette.stone}F5`,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  resultTitle: { fontSize: 32, fontFamily: "BarlowCondensed_700Bold" },
  resultDetail: { color: palette.supporting, fontSize: 14, marginTop: 12 },
  primary: { backgroundColor: palette.primary, padding: 16, marginTop: 24 },
  darkText: { color: palette.foreground, fontSize: 16 },
});
