import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { RANKS, usePlayer, xpForNextRank } from "@/context/PlayerContext";

export default function RankDesk() {
  const { profile } = usePlayer();
  const safe = useSafeAreaInsets();
  const progress = xpForNextRank(profile.xp);
  const rate = profile.totalGames
    ? Math.round((profile.wins / profile.totalGames) * 100)
    : 0;
  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={[s.content, { paddingTop: safe.top + 28 }]}
    >
      <Text style={s.kicker}>Your competition record</Text>
      <Text style={s.title}>The climb</Text>
      <View style={s.current}>
        <Text style={s.rank}>{progress.current}</Text>
        <Text style={s.xp}>{profile.xp.toLocaleString()} XP</Text>
      </View>
      <View style={s.track}>
        <View
          style={[
            s.fill,
            {
              width: `${Math.max(0, Math.min(100, progress.progress * 100))}%`,
            },
          ]}
        />
      </View>
      <Text style={s.detail}>
        {progress.next
          ? `${progress.remaining.toLocaleString()} XP to ${progress.next}`
          : "You have reached Champion 5"}
      </Text>
      <View style={s.recordRow}>
        <Text style={s.detail}>Matches played</Text>
        <Text style={s.figure}>{profile.totalGames}</Text>
      </View>
      <View style={s.recordRow}>
        <Text style={s.detail}>Wins</Text>
        <Text style={s.figure}>{profile.wins}</Text>
      </View>
      <View style={s.recordRow}>
        <Text style={s.detail}>Win rate</Text>
        <Text style={s.figure}>{rate}%</Text>
      </View>
      <Text style={s.note}>
        This record comes from your progress on this device. Warm-up matches do
        not count.
      </Text>
      <Pressable onPress={() => router.push("/challenge")} style={s.challenge}>
        <Text>Open daily challenge</Text>
      </Pressable>
      <Text style={s.section}>Rank ladder</Text>
      {RANKS.map((rank, index) => {
        const current = rank.name === progress.current;
        return (
          <View
            key={rank.name}
            accessibilityLabel={
              current ? `${rank.name}, your current rank` : rank.name
            }
            style={[s.ladderRow, current && s.active]}
          >
            <Text style={s.ordinal}>{String(index + 1).padStart(2, "0")}</Text>
            <Text style={[s.rankName, current && { color: "#D0AF66" }]}>
              {rank.name}
            </Text>
            <Text style={s.threshold}>{rank.minXP.toLocaleString()} XP</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#191B19" },
  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  kicker: { color: "#B9BDAF", fontSize: 13 },
  title: { fontFamily: "Rajdhani_600SemiBold", fontSize: 48, marginTop: 8 },
  current: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rank: { fontSize: 22, color: "#D0AF66" },
  xp: { fontSize: 16, fontVariant: ["tabular-nums"] },
  track: {
    height: 3,
    backgroundColor: "#34382F",
    marginTop: 16,
    marginBottom: 12,
  },
  fill: { height: 3, backgroundColor: "#D0AF66" },
  detail: { fontSize: 14, color: "#B9BDAF", lineHeight: 22 },
  recordRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#34382F",
  },
  figure: { fontSize: 20, fontVariant: ["tabular-nums"] },
  note: { fontSize: 13, color: "#B9BDAF", lineHeight: 21, marginTop: 20 },
  challenge: {
    minHeight: 48,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#666B5E",
    marginTop: 20,
  },
  section: {
    fontFamily: "Rajdhani_600SemiBold",
    fontSize: 28,
    marginTop: 32,
    marginBottom: 12,
  },
  ladderRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#34382F",
    gap: 16,
    paddingHorizontal: 8,
  },
  active: { backgroundColor: "#222520" },
  ordinal: { fontSize: 12, color: "#949A89", width: 24 },
  rankName: { flex: 1, fontSize: 15 },
  threshold: { fontSize: 12, color: "#B9BDAF", fontVariant: ["tabular-nums"] },
});
