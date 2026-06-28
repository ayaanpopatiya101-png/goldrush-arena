import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlayerCard } from '@/components/PlayerCard';
import { RANKS, SKINS, MAPS, getRankIndex, getRelic, usePlayer } from '@/context/PlayerContext';
import { getGameConfig, updateGameConfig } from '@/store/gameSession';
import { useColors } from '@/hooks/useColors';

const BOT_POOL = [
  { name: 'Blaze_99', rank: 'Platinum', color: '#FF4757' },
  { name: 'IceQueen', rank: 'Diamond', color: '#00BFFF' },
  { name: 'Venom_X', rank: 'Master', color: '#00FF88' },
  { name: 'ShadowFX', rank: 'Gold', color: '#9B59B6' },
  { name: 'NeonBlitz', rank: 'Platinum', color: '#FF6B35' },
  { name: 'DarkMatter', rank: 'Silver', color: '#C0C0C0' },
  { name: 'PulseWave', rank: 'Diamond', color: '#FF00FF' },
  { name: 'GhostPing', rank: 'Bronze', color: '#CD7F32' },
];

const VARIANT_META: Record<string, { emoji: string; name: string; color: string }> = {
  duos:         { emoji: '👥', name: 'DUOS',         color: '#1E8AAA' },
  blitz:        { emoji: '⚡', name: 'BLITZ',        color: '#C8820A' },
  chaos:        { emoji: '🌪️', name: 'CHAOS',        color: '#D04818' },
  survival:     { emoji: '🛡️', name: 'SURVIVAL',     color: '#4A8A38' },
  sudden_death: { emoji: '💀', name: 'SUDDEN DEATH', color: '#C03820' },
  turbo:        { emoji: '🚀', name: 'TURBO',        color: '#7A50A0' },
  pinball:      { emoji: '🎰', name: 'PINBALL',      color: '#D07018' },
  six_player:   { emoji: '6️⃣', name: '6-PLAYER',     color: '#D07018' },
};

const VARIANT_RULES: Record<string, string[]> = {
  classic: [
    'Swipe anywhere to move YOUR GOLD paddle',
    'Deflect balls — let them through and lose a life',
    'Each player starts with 5 lives',
    'New balls spawn every 15 seconds',
    'Collect power-ups near your paddle zone',
    'Last player standing wins!',
  ],
  duos: [
    'Team Battle: Bottom+Right (Gold) vs Top+Left (Blue)',
    'Your teammate bot covers the opposite wall',
    'Both teammates must be eliminated to lose',
    'No phase transitions — 4-player arena throughout',
    'The last surviving team wins!',
  ],
  blitz: [
    'EXTREME: everyone has only 1 life',
    'One goal = instant elimination',
    '2 balls launch from the start',
    '1.5× speed — no time to breathe',
    'Matches last under 60 seconds',
  ],
  chaos: [
    '5 balls launch simultaneously at game start',
    'Every player starts with just 3 lives',
    'No power-ups — pure skill only',
    '1.2× starting speed, escalating fast',
    'More balls spawn every 5 seconds',
  ],
  survival: [
    'Each player has 12 lives — outlast the storm',
    'New balls spawn every 5 seconds',
    'Speed increases with every ball added',
    'Power-ups still appear — grab them fast',
    'Last player with lives remaining wins',
  ],
  sudden_death: [
    'MAXIMUM DANGER: 1 life each, 3 balls at launch',
    'Ball speed starts at 2× — no warmup',
    'No power-ups — nothing to save you',
    'Every single ball is a death threat',
    'Average match: under 20 seconds',
  ],
  turbo: [
    'Ball speed starts at 1.8× from the first second',
    'Balls spawn every 8 seconds',
    'Power-ups still appear for a chance to swing',
    '5 lives each — need them all',
    'Fast hands and sharp reflexes required',
  ],
  pinball: [
    'A new ball spawns every 3 seconds',
    'Up to 8 balls can be in play at once',
    'Slower starting speed — but volume is brutal',
    'Power-ups spawn normally',
    'Last player standing in the ball storm wins',
  ],
  six_player: [
    '6 fighters — each wall is split into two zones',
    'You guard the LEFT half of the bottom wall',
    'Top wall is split between two bots (left & right)',
    'Left and right walls each have their own bot',
    '4 lives each — no phase transitions, pure survival',
    'Last of 6 standing wins — largest bracket ever!',
  ],
};

export default function LobbyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = usePlayer();
  const config = getGameConfig();

  const playerRankIdx = getRankIndex(profile.rank);
  const unlockedMaps  = MAPS.filter(m => playerRankIdx >= m.unlockRankIndex);
  const defaultMapId  = unlockedMaps.length ? unlockedMaps[unlockedMaps.length - 1].id : MAPS[0].id;
  const equippedRelic = getRelic(config.playerRelicId);

  const [bots, setBots] = useState<typeof BOT_POOL>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [searching, setSearching] = useState(true);
  const [selectedMap, setSelectedMap] = useState(defaultMapId);
  const selectedMapRef = useRef(selectedMap);
  selectedMapRef.current = selectedMap;
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();

    // Simulate players joining
    const shuffled = [...BOT_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
    const timers: ReturnType<typeof setTimeout>[] = [];

    shuffled.forEach((bot, i) => {
      timers.push(setTimeout(() => {
        setBots(prev => [...prev, bot]);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, (i + 1) * 900));
    });

    timers.push(setTimeout(() => {
      setSearching(false);
      // Start countdown
      let c = 3;
      setCountdown(3);
      const cTimer = setInterval(() => {
        c -= 1;
        setCountdown(c);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (c <= 0) {
          clearInterval(cTimer);
          updateGameConfig({ mapId: selectedMapRef.current });
          router.replace('/game');
        }
      }, 1000);
      timers.push(cTimer as unknown as ReturnType<typeof setTimeout>);
    }, 3400));

    return () => {
      timers.forEach(clearTimeout);
      pulse.stop();
    };
  }, []);

  const playerSkin = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0];
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#080814', '#0A0A1E', '#080814']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>MATCHMAKING</Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <View style={[
              styles.modeBadge,
              config.matchType === 'ranked'
                ? { backgroundColor: '#C8820A22', borderColor: '#C8820A66' }
                : { backgroundColor: '#1E8AAA22', borderColor: '#1E8AAA66' },
            ]}>
              <Text style={[
                styles.modeBadgeText,
                { color: config.matchType === 'ranked' ? '#C8820A' : '#1E8AAA' },
              ]}>
                {config.matchType === 'ranked' ? '⚔️ RANKED' : '🎮 CASUAL'}
              </Text>
            </View>
            {config.variant !== 'classic' && (() => {
              const vm = VARIANT_META[config.variant];
              const c  = vm?.color ?? '#FFFFFF';
              return (
                <View style={[styles.modeBadge, { backgroundColor: c + '22', borderColor: c + '55' }]}>
                  <Text style={[styles.modeBadgeText, { color: c }]}>
                    {vm?.emoji} {vm?.name}
                  </Text>
                </View>
              );
            })()}
            {profile.totalGames < 5 && (
              <View style={[styles.modeBadge, { backgroundColor: '#00FF8820', borderColor: '#00FF8855' }]}>
                <Text style={[styles.modeBadgeText, { color: '#00FF88' }]}>
                  🎓 TRAINING · {5 - profile.totalGames} left
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Status */}
        <View style={styles.statusRow}>
          {searching ? (
            <>
              <Animated.View style={[styles.dot, { opacity: pulseAnim, backgroundColor: '#C8820A' }]} />
              <Text style={[styles.statusText, { color: colors.mutedForeground }]}>Finding opponents...</Text>
            </>
          ) : countdown !== null ? (
            <>
              <View style={[styles.dot, { backgroundColor: '#00FF88' }]} />
              <Text style={[styles.statusText, { color: '#00FF88' }]}>Match found! Starting in {countdown}...</Text>
            </>
          ) : (
            <>
              <View style={[styles.dot, { backgroundColor: '#00FF88' }]} />
              <Text style={[styles.statusText, { color: '#00FF88' }]}>All players ready!</Text>
            </>
          )}
        </View>

        {/* Players */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PLAYERS</Text>
          <View style={styles.playersList}>
            {/* Human player */}
            <PlayerCard
              name={profile.name}
              rank={profile.rank}
              color={playerSkin.color}
              wins={profile.wins}
              level={profile.level}
              isBot={false}
              isReady={true}
            />
            {/* Bots */}
            {bots.map((bot) => (
              <PlayerCard
                key={bot.name}
                name={bot.name}
                rank={bot.rank}
                color={bot.color}
                isBot={true}
                isReady={bots.indexOf(bot) < bots.length}
              />
            ))}
            {/* Empty slots */}
            {Array.from({ length: 3 - bots.length }).map((_, i) => (
              <View key={i} style={[styles.emptySlot, { borderColor: colors.border }]}>
                <Animated.View style={{ opacity: pulseAnim }}>
                  <Feather name="user" size={20} color={colors.mutedForeground} />
                </Animated.View>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Searching...</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Map select */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ARENA</Text>
            {equippedRelic && (
              <View style={[styles.relicChip, { borderColor: equippedRelic.color + '66', backgroundColor: equippedRelic.color + '1A' }]}>
                <Text style={{ fontSize: 11 }}>{equippedRelic.icon}</Text>
                <Text style={[styles.relicChipText, { color: equippedRelic.color }]}>{equippedRelic.name}</Text>
              </View>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingVertical: 2, paddingRight: 8 }}
          >
            {MAPS.map(map => {
              const unlocked = playerRankIdx >= map.unlockRankIndex;
              const selected = selectedMap === map.id;
              const reqRank  = RANKS[map.unlockRankIndex];
              return (
                <Pressable
                  key={map.id}
                  disabled={!unlocked}
                  onPress={() => {
                    setSelectedMap(map.id);
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[styles.mapCard, {
                    borderColor: selected ? map.accent : colors.border,
                    opacity: unlocked ? 1 : 0.55,
                  }]}
                >
                  <LinearGradient colors={map.arenaBg} style={StyleSheet.absoluteFill} />
                  <Text style={styles.mapIcon}>{map.icon}</Text>
                  <Text style={[styles.mapName, { color: selected ? map.accent : colors.foreground }]} numberOfLines={1}>{map.name}</Text>
                  <Text style={[styles.mapDesc, { color: colors.mutedForeground }]} numberOfLines={3}>{map.desc}</Text>
                  {unlocked
                    ? (selected
                        ? <View style={[styles.mapBadge, { backgroundColor: map.accent }]}><Feather name="check" size={10} color="#0D0A06" /><Text style={styles.mapBadgeText}>SELECTED</Text></View>
                        : <View style={[styles.mapBadge, { backgroundColor: '#FFFFFF14' }]}><Text style={[styles.mapBadgeText, { color: colors.mutedForeground }]}>SELECT</Text></View>)
                    : <View style={[styles.mapLockBadge, { borderColor: reqRank.color + '66' }]}><Feather name="lock" size={9} color={reqRank.color} /><Text style={[styles.mapLockText, { color: reqRank.color }]}>{reqRank.name}</Text></View>}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Game rules */}
        <View style={[styles.rulesCard, { backgroundColor: colors.card, borderColor: config.variant !== 'classic' ? (VARIANT_META[config.variant]?.color ?? colors.border) + '44' : colors.border }]}>
          <Text style={[styles.rulesTitle, { color: config.variant !== 'classic' ? (VARIANT_META[config.variant]?.color ?? colors.foreground) : colors.foreground }]}>
            {config.variant !== 'classic'
              ? `${VARIANT_META[config.variant]?.emoji ?? ''} ${VARIANT_META[config.variant]?.name ?? ''} RULES`
              : 'HOW TO PLAY'}
          </Text>
          <View style={styles.rulesList}>
            {(VARIANT_RULES[config.variant] ?? VARIANT_RULES['classic']).map((rule, i) => (
              <View key={i} style={styles.ruleItem}>
                <View style={[styles.ruleDot, { backgroundColor: config.variant !== 'classic' ? (VARIANT_META[config.variant]?.color ?? colors.primary) : colors.primary }]} />
                <Text style={[styles.ruleText, { color: colors.mutedForeground }]}>{rule}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Big countdown overlay */}
      {countdown !== null && countdown > 0 && (
        <View style={styles.countdownOverlay} pointerEvents="none">
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, letterSpacing: 2 },
  modeBadge:   { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 2 },
  modeBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.5 },
  playersList: { gap: 8 },
  emptySlot: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed' },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  mapCard: { width: 132, padding: 12, borderRadius: 14, borderWidth: 1.5, gap: 5, overflow: 'hidden' },
  mapIcon: { fontSize: 26 },
  mapName: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  mapDesc: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 13, minHeight: 39 },
  mapBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  mapBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#0D0A06', letterSpacing: 0.5 },
  mapLockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  mapLockText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5 },
  relicChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  relicChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 0.3 },
  rulesCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  rulesTitle: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1 },
  rulesList: { gap: 6 },
  ruleItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  ruleDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  ruleText: { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1, lineHeight: 18 },
  countdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#00000099', alignItems: 'center', justifyContent: 'center' },
  countdownText: { color: '#C8820A', fontSize: 96, fontFamily: 'Inter_700Bold', textShadowColor: '#C8820A', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 30 },
});
