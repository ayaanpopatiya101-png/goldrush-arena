import React, { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import {
  RANKS,
  SEASON_TIERS,
  SKINS,
  SUPERS,
  getRankIndex,
  usePlayer,
  xpForNextRank,
} from "@/context/PlayerContext";
import { useParty } from "@/context/PartyContext";
import {
  setGameConfig,
  type GameVariant,
  type MatchType,
} from "@/store/gameSession";
import { startGauntlet } from "@/store/gauntletSession";
import { DailyStreakModal } from "@/components/DailyStreakModal";
import { getApiBase } from "@/utils/api";
import { LoadingCourt } from "@/components/ui/LoadingCourt";

const modes: {
  variant: GameVariant;
  title: string;
  detail: string;
  minRank?: number;
  rankedOnly?: boolean;
}[] = [
  {
    variant: "classic",
    title: "Classic",
    detail: "Four sides. Five lives. Last player standing.",
  },
  { variant: "duos", title: "Doubles", detail: "Two teams share the court." },
  {
    variant: "blitz",
    title: "Blitz",
    detail: "One life. No room for a missed rebound.",
  },
  {
    variant: "chaos",
    title: "Chaos",
    detail: "Five balls in play from the start.",
  },
  {
    variant: "survival",
    title: "Survival",
    detail: "Twelve lives and a rising tempo.",
  },
  {
    variant: "sudden_death",
    title: "Sudden death",
    detail: "One life against the field.",
  },
  {
    variant: "turbo",
    title: "Turbo",
    detail: "Faster rallies from the first serve.",
  },
  {
    variant: "pinball",
    title: "Pinball",
    detail: "Keep track of every rebound.",
  },
  {
    variant: "six_player",
    title: "Six players",
    detail: "Six goals on one court.",
  },
  {
    variant: "storm_surge",
    title: "Storm surge",
    detail: "Three balls, one life, elite opponents.",
    minRank: 12,
    rankedOnly: true,
  },
  {
    variant: "ghost_protocol",
    title: "Ghost protocol",
    detail: "Read the flight of disappearing balls.",
    minRank: 15,
    rankedOnly: true,
  },
  {
    variant: "warlord",
    title: "Warlord",
    detail: "One player against five generals.",
    minRank: 17,
    rankedOnly: true,
  },
];
export default function ArenaHome() {
  const insets = useSafeAreaInsets();
  const {
    profile,
    isLoaded,
    showStreakModal,
    claimDailyStreak,
    dismissStreakModal,
    setSelectedSuper,
    claimSeasonTier,
  } = usePlayer();
  const party = useParty();
  const [ranked, setRanked] = useState(false);
  const [variant, setVariant] = useState<GameVariant>("classic");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showModes, setShowModes] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const [milestonesOpen, setMilestonesOpen] = useState(false);
  const rewardPending = useRef(false);
  const rank = xpForNextRank(profile.xp);
  const selected = modes.find((m) => m.variant === variant) ?? modes[0]!;
  function play(type: MatchType = ranked ? "ranked" : "casual") {
    if (party.isInParty && !party.isLeader) return;
    if (type === "gauntlet" && getRankIndex(profile.rank) < 9) {
      setError("Gauntlet opens at Diamond 1");
      return;
    }
    if (selected.rankedOnly && type !== "gauntlet") type = "ranked";
    const skin = SKINS.find((s) => s.id === profile.currentSkin) ?? SKINS[0]!;
    const mode = type === "gauntlet" ? startGauntlet() : variant;
    setGameConfig({
      playerName: profile.name,
      playerSkinId: skin.id,
      playerColor: skin.color,
      playerGlowColor: skin.glowColor,
      playerRelicId: "none",
      matchType: type,
      variant: mode,
    });
    if (party.isInParty) party.launchParty({ matchType: type, variant: mode });
    router.push("/lobby");
  }
  async function manageParty(join: boolean) {
    if (busy) return;
    if (!getApiBase()) {
      setError(
        "Party play needs a configured game server. You can still play warm-up and bot matches.",
      );
      return;
    }
    if (join && code.trim().length !== 6) {
      setError("Enter the six-character party code");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (join) {
        const result = await party.joinParty(code.trim().toUpperCase());
        if (result !== "ok")
          setError(
            result === "full"
              ? "That party is full"
              : result === "not_found"
                ? "No party found with that code"
                : "Could not reach the game server",
          );
      } else if (!(await party.createParty()))
        setError("Could not create a party. Please try again.");
    } catch {
      setError("Could not reach the game server");
    } finally {
      setBusy(false);
    }
  }
  if (!isLoaded) return <LoadingCourt />;
  return (
    <View style={s.page}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          <Text style={s.brand}>GoldRush Arena</Text>
          <Pressable
            accessibilityLabel="Settings"
            accessibilityRole="button"
            onPress={() => router.push("/settings")}
            style={s.iconButton}
          >
            <Feather name="settings" size={21} color="#B9BDAF" />
          </Pressable>
        </View>
        <View style={s.playerLine}>
          <Text style={s.name}>{profile.name}</Text>
          <Text style={s.rank}>{profile.rank}</Text>
        </View>
        <View style={s.progressTrack}>
          <View
            style={[
              s.progress,
              { width: `${Math.min(100, Math.max(0, rank.progress * 100))}%` },
            ]}
          />
        </View>
        <View style={s.progressLabels}>
          <Text style={s.meta}>{profile.xp.toLocaleString()} XP</Text>
          <Text style={s.meta}>
            {rank.next ? `${rank.next} next` : "Top rank"}
          </Text>
        </View>

        <View style={s.hero}>
          <View style={s.eyebrowRow}>
            <Text style={s.eyebrow}>The court is yours</Text>
            <Text style={s.issue}>4 / 3 / 2 / 1</Text>
          </View>
          <Text style={s.headline}>Hold your side.</Text>
          <Text style={s.summary}>
            Deflect the ball. Outlast the field. Every rebound changes the
            match.
          </Text>
          <View
            style={s.court}
            accessibilityLabel="Air hockey court with four paddles and one ball"
          >
            <View style={s.centerLine} />
            <View style={s.centerCircle} />
            <View
              style={[s.paddleH, { top: 16, backgroundColor: "#BB7865" }]}
            />
            <View
              style={[s.paddleH, { bottom: 16, backgroundColor: "#D0AF66" }]}
            />
            <View
              style={[s.paddleV, { left: 16, backgroundColor: "#A6AEA7" }]}
            />
            <View
              style={[s.paddleV, { right: 16, backgroundColor: "#98A581" }]}
            />
            <View style={s.ball} />
            <Text style={s.playerMarker}>You</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/warmup")}
            style={s.warmup}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.warmupTitle}>Play a warm-up</Text>
              <Text style={s.warmupDetail}>
                Real match controls. Offline. No rank at stake.
              </Text>
            </View>
            <Feather name="play" size={22} color="#191B19" />
          </Pressable>
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Match desk</Text>
          <Text style={s.meta}>Choose your rules</Text>
        </View>
        <View style={s.toggle}>
          {(["Casual", "Ranked"] as const).map((label, i) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityState={{ selected: ranked === Boolean(i) }}
              onPress={() => setRanked(Boolean(i))}
              style={[s.segment, ranked === Boolean(i) && s.selectedSegment]}
            >
              <Text
                style={ranked === Boolean(i) ? s.selectedText : s.secondaryText}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showModes }}
          onPress={() => setShowModes((v) => !v)}
          style={s.modeSelected}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.modeTitle}>{selected.title}</Text>
            <Text style={s.modeDetail}>{selected.detail}</Text>
          </View>
          <Feather
            name={showModes ? "minus" : "plus"}
            size={20}
            color="#B9BDAF"
          />
        </Pressable>
        {showModes &&
          modes.map((mode, index) => {
            const locked = getRankIndex(profile.rank) < (mode.minRank ?? 0);
            return (
              <Pressable
                accessibilityRole="button"
                disabled={locked}
                accessibilityState={{
                  selected: mode.variant === variant,
                  disabled: locked,
                }}
                key={mode.variant}
                onPress={() => {
                  setVariant(mode.variant);
                  setRanked(mode.rankedOnly ?? ranked);
                  setShowModes(false);
                }}
                style={[s.modeRow, locked && { opacity: 0.6 }]}
              >
                <Text style={s.modeNumber}>
                  {String(index + 1).padStart(2, "0")}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.modeTitle}>{mode.title}</Text>
                  <Text style={s.modeDetail}>
                    {locked
                      ? `Opens at ${RANKS[mode.minRank ?? 0]?.name}`
                      : mode.detail}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        <Pressable
          accessibilityRole="button"
          disabled={party.isInParty && !party.isLeader}
          onPress={() => play()}
          style={[
            s.playButton,
            party.isInParty && !party.isLeader && { opacity: 0.5 },
          ]}
        >
          <Text style={s.playLabel}>
            {party.isInParty && !party.isLeader
              ? "Waiting for party leader"
              : `Play ${selected.title.toLowerCase()}`}
          </Text>
          <Feather name="play" size={18} color="#EEE7D8" />
        </Pressable>
        <View style={s.modeLinks}>
          <Pressable
            style={s.textButton}
            onPress={() => router.push("/arcade")}
          >
            <Text style={s.secondaryText}>Solo arcade</Text>
          </Pressable>
          <Pressable style={s.textButton} onPress={() => play("gauntlet")}>
            <Text style={s.secondaryText}>Gauntlet</Text>
          </Pressable>
          <Pressable
            style={s.textButton}
            onPress={() => router.push("/challenge")}
          >
            <Text style={s.secondaryText}>Daily challenge</Text>
          </Pressable>
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Your super</Text>
          <Text style={s.meta}>Charge with 10 blocks</Text>
        </View>
        {SUPERS.map((superAbility) => {
          const locked = profile.level < superAbility.unlockLevel;
          const selected = (profile.selectedSuper ?? 1) === superAbility.id;
          return (
            <Pressable
              key={superAbility.id}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: locked }}
              disabled={locked}
              onPress={() =>
                setSelectedSuper(superAbility.id).catch(() =>
                  setError("Could not save your ability"),
                )
              }
              style={[s.modeRow, selected && { backgroundColor: "#222520" }]}
            >
              <Feather
                name={
                  locked
                    ? "lock"
                    : superAbility.id === 1
                      ? "shield"
                      : superAbility.id === 2
                        ? "clock"
                        : "crosshair"
                }
                size={20}
                color={selected ? "#D0AF66" : "#B9BDAF"}
              />
              <View style={{ flex: 1 }}>
                <Text style={s.modeTitle}>{superAbility.name}</Text>
                <Text style={s.modeDetail}>
                  {locked
                    ? `Available at level ${superAbility.unlockLevel}`
                    : superAbility.desc.replace(/\n/g, " ")}
                </Text>
              </View>
              {selected && <Text style={s.meta}>Equipped</Text>}
            </Pressable>
          );
        })}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Bring your team</Text>
          <Feather name="users" color="#B9BDAF" size={18} />
        </View>
        {party.isInParty ? (
          <View style={s.partyPanel}>
            <Text style={s.partyCode}>{party.partyCode}</Text>
            <Text style={s.modeDetail}>
              {party.members.map((m) => m.name).join(" · ")}
            </Text>
            <View style={s.modeLinks}>
              <Pressable
                style={s.textButton}
                onPress={() =>
                  Share.share({
                    message: `GoldRush Arena party code: ${party.partyCode}`,
                  }).catch(() => {})
                }
              >
                <Text style={s.secondaryText}>Share code</Text>
              </Pressable>
              <Pressable style={s.textButton} onPress={party.leaveParty}>
                <Text style={s.secondaryText}>Leave party</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <Pressable
              disabled={busy}
              style={s.partyCreate}
              onPress={() => manageParty(false)}
            >
              <Text style={s.secondaryText}>
                {busy ? "Connecting…" : "Create a party"}
              </Text>
              <Feather name="plus" size={18} color="#B9BDAF" />
            </Pressable>
            <View style={s.joinRow}>
              <TextInput
                value={code}
                onChangeText={setCode}
                maxLength={6}
                autoCapitalize="characters"
                placeholder="Party code"
                placeholderTextColor="#949A89"
                accessibilityLabel="Six-character party code"
                style={s.codeInput}
              />
              <Pressable
                disabled={busy}
                onPress={() => manageParty(true)}
                style={s.joinButton}
              >
                <Text style={s.secondaryText}>Join</Text>
              </Pressable>
            </View>
          </>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}

        {showStreakModal && (
          <Pressable
            accessibilityRole="button"
            style={s.partyCreate}
            onPress={() => setStreakOpen(true)}
          >
            <Text>Claim your daily reward</Text>
            <Feather name="gift" size={18} color="#D0AF66" />
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: milestonesOpen }}
          onPress={() => setMilestonesOpen((value) => !value)}
          style={s.sectionHeader}
        >
          <Text style={s.sectionTitle}>Season milestones</Text>
          <Feather
            name={milestonesOpen ? "minus" : "plus"}
            size={20}
            color="#B9BDAF"
          />
        </Pressable>
        {milestonesOpen &&
          SEASON_TIERS.map((tier, index) => {
            const claimed = profile.seasonPassClaimed.includes(index);
            const locked = profile.totalGames < tier.games;
            return (
              <Pressable
                key={tier.name}
                accessibilityRole="button"
                disabled={claimed || locked}
                onPress={async () => {
                  if (rewardPending.current) return;
                  rewardPending.current = true;
                  try {
                    await claimSeasonTier(index);
                  } catch {
                    setError("Could not save your reward");
                  } finally {
                    rewardPending.current = false;
                  }
                }}
                style={s.recordRow}
              >
                <View style={{ flex: 1 }}>
                  <Text>
                    {tier.name} · {tier.reward}
                  </Text>
                  <Text style={s.modeDetail}>{tier.games} matches</Text>
                </View>
                <Text style={s.meta}>
                  {claimed ? "Claimed" : locked ? "Not reached" : "Claim"}
                </Text>
              </Pressable>
            );
          })}
        <View style={s.record}>
          <Text style={s.sectionTitle}>Your record</Text>
          <View style={s.recordRow}>
            <Text style={s.recordLabel}>Matches played</Text>
            <Text style={s.figure}>{profile.totalGames.toLocaleString()}</Text>
          </View>
          <View style={s.recordRow}>
            <Text style={s.recordLabel}>Wins</Text>
            <Text style={s.figure}>{profile.wins.toLocaleString()}</Text>
          </View>
          <View style={s.recordRow}>
            <Text style={s.recordLabel}>Coins</Text>
            <Text style={s.figure}>{profile.coins.toLocaleString()}</Text>
          </View>
        </View>
        <View style={s.footer}>
          <Pressable onPress={() => router.push("/my-clips")}>
            <Text style={s.meta}>Match clips</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/legal")}>
            <Text style={s.meta}>Privacy & terms</Text>
          </Pressable>
        </View>
      </ScrollView>
      <DailyStreakModal
        visible={streakOpen && showStreakModal}
        streak={profile.loginStreak ?? 1}
        onClaim={async () => {
          await claimDailyStreak();
          dismissStreakModal();
          setStreakOpen(false);
        }}
        onDismiss={() => setStreakOpen(false)}
      />
    </View>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#191B19" },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  loading: { padding: 32, fontSize: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#34382F",
    paddingBottom: 16,
  },
  brand: { fontSize: 20, fontWeight: "600" },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  playerLine: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontSize: 16 },
  rank: { fontSize: 14, color: "#D0AF66" },
  progressTrack: { height: 3, backgroundColor: "#34382F", marginTop: 12 },
  progress: { height: 3, backgroundColor: "#D0AF66" },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  meta: { fontSize: 12, color: "#B9BDAF" },
  hero: { marginTop: 32 },
  eyebrowRow: { flexDirection: "row", justifyContent: "space-between" },
  eyebrow: { fontSize: 13, color: "#B9BDAF" },
  issue: { fontSize: 12, color: "#949A89", fontVariant: ["tabular-nums"] },
  headline: {
    fontFamily: "Rajdhani_600SemiBold",
    fontSize: 48,
    lineHeight: 52,
    marginTop: 12,
  },
  summary: {
    fontSize: 15,
    lineHeight: 23,
    color: "#B9BDAF",
    maxWidth: 400,
    marginTop: 8,
  },
  court: {
    height: 204,
    backgroundColor: "#222520",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#666B5E",
    justifyContent: "center",
    alignItems: "center",
  },
  centerLine: {
    position: "absolute",
    width: "100%",
    height: 1,
    backgroundColor: "#34382F",
  },
  centerCircle: {
    height: 80,
    width: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "#51564B",
  },
  paddleH: { position: "absolute", height: 6, width: 64 },
  paddleV: { position: "absolute", width: 6, height: 48 },
  ball: {
    position: "absolute",
    height: 12,
    width: 12,
    borderRadius: 6,
    backgroundColor: "#EEE7D8",
    transform: [{ translateX: 52 }, { translateY: -28 }],
  },
  playerMarker: {
    position: "absolute",
    bottom: 28,
    fontSize: 11,
    color: "#D0AF66",
  },
  warmup: {
    minHeight: 76,
    backgroundColor: "#D0AF66",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  warmupTitle: { color: "#191B19", fontSize: 18, fontWeight: "600" },
  warmupDetail: {
    color: "#303326",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 32,
    marginBottom: 16,
  },
  sectionTitle: { fontFamily: "Rajdhani_600SemiBold", fontSize: 26 },
  toggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#51564B",
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  selectedSegment: { backgroundColor: "#EEE7D8" },
  selectedText: { color: "#191B19", fontSize: 15 },
  secondaryText: { color: "#EEE7D8", fontSize: 14 },
  modeSelected: {
    flexDirection: "row",
    paddingVertical: 20,
    gap: 16,
    alignItems: "center",
  },
  modeTitle: { fontSize: 17 },
  modeDetail: { fontSize: 13, lineHeight: 20, color: "#B9BDAF", marginTop: 4 },
  modeRow: {
    flexDirection: "row",
    gap: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: "#34382F",
  },
  modeNumber: { fontSize: 13, color: "#949A89", width: 24, paddingTop: 4 },
  playButton: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#666B5E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  playLabel: { fontSize: 16 },
  modeLinks: { flexDirection: "row", flexWrap: "wrap", gap: 16, paddingTop: 8 },
  textButton: { minHeight: 44, justifyContent: "center" },
  partyCreate: {
    flexDirection: "row",
    minHeight: 52,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#51564B",
    paddingHorizontal: 16,
  },
  joinRow: { flexDirection: "row", marginTop: 12, gap: 12 },
  codeInput: {
    flex: 1,
    minHeight: 48,
    borderBottomWidth: 1,
    borderColor: "#666B5E",
    color: "#EEE7D8",
    fontSize: 15,
  },
  joinButton: {
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#34382F",
  },
  partyPanel: {
    padding: 16,
    backgroundColor: "#222520",
    borderWidth: 1,
    borderColor: "#51564B",
  },
  partyCode: { fontSize: 28, fontVariant: ["tabular-nums"] },
  error: { color: "#D79A85", marginTop: 12, lineHeight: 20 },
  record: { marginTop: 32 },
  recordRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#34382F",
  },
  recordLabel: { fontSize: 14, color: "#B9BDAF" },
  figure: { fontSize: 18, fontVariant: ["tabular-nums"] },
  footer: {
    marginTop: 32,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
