import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, Animated, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameArena, type GameMode, type GameResult } from '@/components/GameArena';
import { BackgroundMusicButton, useBackgroundMusic } from '@/components/BackgroundMusic';
import { usePlayer, getRelic, getMap, getRankIndex, MAX_RANK_INDEX, MAPS, getScaledRelicEffect, getRelicLevel } from '@/context/PlayerContext';
import { getGameConfig } from '@/store/gameSession';
import { useSettings } from '@/hooks/useSettings';

const BOT_NAMES  = ['Blaze_99', 'IceQueen', 'Venom_X', 'ShadowFox', 'CyberWolf'];
const BOT_RANKS  = ['Platinum', 'Diamond',  'Master',  'Legend',    'Grandmaster'];
const BOT_COLORS = ['#C03820',  '#1E8AAA',  '#4A8A38', '#D07018',   '#7A50A0'];

const VARIANT_PROPS: Record<string, {
  initialLives?: number;
  startingBallCount?: number;
  ballSpawnFrames?: number;
  noPowerups?: boolean;
  startSpeedMult?: number;
  duoMode?: boolean;
  sixPlayer?: boolean;
}> = {
  classic:      {},
  duos:         { duoMode: true },
  blitz:        { initialLives: 1, startingBallCount: 2, ballSpawnFrames: 600, startSpeedMult: 1.5 },
  chaos:        { initialLives: 3, startingBallCount: 5, ballSpawnFrames: 300, noPowerups: true, startSpeedMult: 1.2 },
  survival:     { initialLives: 12, ballSpawnFrames: 300 },
  sudden_death: { initialLives: 1, startingBallCount: 3, ballSpawnFrames: 240, noPowerups: true, startSpeedMult: 2.0 },
  turbo:        { ballSpawnFrames: 480, startSpeedMult: 1.8 },
  pinball:      { ballSpawnFrames: 180 },
  six_player:   { sixPlayer: true, initialLives: 4, ballSpawnFrames: 600 },
};

const MODE_LABELS: Record<GameMode, string> = { square:'4-PLAYER', triangle:'3-PLAYER', duel:'1v1' };
const MODE_COLORS: Record<GameMode, string> = { square:'#C8820A', triangle:'#4A8A38', duel:'#C03820' };

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function GameScreen() {
  const { width, height } = useWindowDimensions();
  const insets   = useSafeAreaInsets();
  const { addMatchResult, profile } = usePlayer();
  const config   = getGameConfig();
  const music    = useBackgroundMusic();
  const { settings } = useSettings();

  const topPad    = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;
  const hudHeight = 48 + 24 + 14 + 54 + bottomPad + 10;
  const arenaSize = Math.max(260, Math.min(width - 8, height - topPad - hudHeight, 410));

  const variantCfg = VARIANT_PROPS[config.variant ?? 'classic'] ?? {};

  // Resolve the equipped relic, selected map, and rank-based bot skill.
  // Final rank-gate (defense-in-depth): never honor a relic/map the player's rank
  // hasn't unlocked, even if a stale/corrupt session id slips through the UI gates.
  const playerRankIdx = getRankIndex(profile.rank);
  const rawRelic = getRelic(config.playerRelicId);
  const relic    = rawRelic && rawRelic.unlockRankIndex <= playerRankIdx ? rawRelic : null;
  const rawMap   = getMap(config.mapId);
  const map      = rawMap.unlockRankIndex <= playerRankIdx ? rawMap : MAPS[0];
  const botSkill = playerRankIdx / MAX_RANK_INDEX;
  const mapMods  = map.mods ?? {};
  // Merge variant + map modifiers — variant rules always win over map mods.
  const mergedCfg = {
    ...variantCfg,
    startSpeedMult:  variantCfg.startSpeedMult  ?? mapMods.startSpeedMult,
    ballSpawnFrames: variantCfg.ballSpawnFrames ?? mapMods.ballSpawnFrames,
    noPowerups:      variantCfg.noPowerups      ?? mapMods.noPowerups,
  };

  const [gameOver,     setGameOver]     = useState(false);
  const [gameMode,     setGameMode]     = useState<GameMode>('square');
  const [playerLives,  setPlayerLives]  = useState(variantCfg.initialLives ?? 5);
  const [activeBalls,  setActiveBalls]  = useState(1);
  const [paused,       setPaused]       = useState(false);
  const [timerSecs,    setTimerSecs]    = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const grantExtraLifeRef = useRef<(() => void) | null>(null);
  const modePulse         = useRef(new Animated.Value(1)).current;
  const musicStarted      = useRef(false);
  const extraLifeUsed     = useRef(false);
  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);

  const botDifficulty: 'easy' | 'normal' = config.matchType === 'casual' ? 'easy' : 'normal';

  useEffect(() => {
    music.setMuted(!settings.musicEnabled);
  }, [settings.musicEnabled]);

  useEffect(() => {
    if (timerRunning && !paused && !gameOver) {
      timerRef.current = setInterval(() => setTimerSecs(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning, paused, gameOver]);

  const prevModeRef = useRef<GameMode>('square');
  function handleGameModeChange(mode: GameMode) {
    if (mode !== prevModeRef.current) {
      prevModeRef.current = mode;
      setGameMode(mode);
    }
  }

  function handleLivesChange(lives: number) {
    setPlayerLives(lives);
  }

  function handleGameStart() {
    setTimerRunning(true);
  }

  function ensureMusic() {
    if (!musicStarted.current && settings.musicEnabled) {
      musicStarted.current = true;
      music.start();
    }
  }

  useEffect(() => {
    return () => {
      music.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(modePulse, { toValue: 1.18, duration: 180, useNativeDriver: true }),
      Animated.timing(modePulse, { toValue: 1,    duration: 280, useNativeDriver: true }),
    ]).start();
  }, [gameMode]);

  function handleGameOver(result: GameResult) {
    setGameOver(true);
    setTimerRunning(false);
    music.stop();
    const mt = (config.matchType as 'ranked' | 'casual') ?? 'casual';
    addMatchResult({
      won: result.won, xpEarned: result.xpEarned, coinsEarned: result.coinsEarned,
      deflections: result.deflections, goalsAgainst: result.goalsAgainst,
      position: result.position, matchType: mt,
    });
    router.replace({
      pathname: '/postgame',
      params: {
        won: result.won ? '1' : '0',
        position: String(result.position),
        deflections: String(result.deflections),
        goalsAgainst: String(result.goalsAgainst),
        xpEarned: String(result.xpEarned),
        coinsEarned: String(result.coinsEarned),
        matchType: mt,
        levelBefore: String(profile.competitiveLevel),
      },
    });
  }

  function handleBuyExtraLife() {
    if (extraLifeUsed.current) {
      return;
    }
    extraLifeUsed.current = true;
    grantExtraLifeRef.current?.();
    grantExtraLifeRef.current?.();
    grantExtraLifeRef.current?.();
  }

  const modeColor = MODE_COLORS[gameMode];

  return (
    <View style={[styles.root, { paddingTop: topPad }]} onTouchStart={ensureMusic}>
      <LinearGradient
        colors={map.bg}
        style={StyleSheet.absoluteFill}
      />

      {/* HUD Top */}
      <View style={styles.hud}>
        <Pressable onPress={() => setPaused(true)} style={styles.iconBtn}>
          <Feather name="pause" size={20} color="#FFFFFF88" />
        </Pressable>

        <Animated.View style={[styles.modeChip, { borderColor: modeColor+'88', backgroundColor: modeColor+'22', transform:[{scale:modePulse}] }]}>
          <Text style={[styles.modeText, { color: modeColor }]}>{MODE_LABELS[gameMode]}</Text>
        </Animated.View>

        <View style={styles.hudRight}>
          <BackgroundMusicButton muted={music.muted} onToggle={music.setMuted} />
        </View>
      </View>

      {/* Timer + Ball Count row */}
      <View style={[styles.infoRow, { width: arenaSize }]}>
        <View style={styles.timerBadge}>
          <Feather name="clock" size={10} color="#FFFFFF55" />
          <Text style={styles.timerText}>{fmtTime(timerSecs)}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={styles.ballsBadge}>
          <View style={[styles.ballDot, { backgroundColor: activeBalls > 3 ? '#FF4757' : activeBalls > 1 ? '#C8820A' : '#FFFFFF55' }]} />
          <Text style={styles.ballsText}>{activeBalls} {activeBalls === 1 ? 'BALL' : 'BALLS'}</Text>
        </View>
      </View>

      {/* Bot name labels */}
      <View style={[styles.labelsRow, { width: arenaSize }]}>
        <Text style={[styles.sideLabel, { color: BOT_COLORS[1]+'AA' }]} numberOfLines={1}>{BOT_NAMES[1]}</Text>
        <View style={{ flex: 1 }} />
        <Text style={[styles.sideLabel, { color: BOT_COLORS[2]+'AA' }]} numberOfLines={1}>{BOT_NAMES[2]}</Text>
      </View>

      {/* Arena */}
      <View style={[styles.arenaWrap, { width: arenaSize }]}>
        <View style={styles.topBotLabel}>
          <View style={[styles.labelDot, { backgroundColor: '#FF4757' }]} />
          <Text style={[styles.labelTxt, { color: '#FF4757' }]}>{BOT_NAMES[0]}</Text>
        </View>

        {!gameOver && (
          <GameArena
            arenaSize={arenaSize}
            playerName={config.playerName}
            playerColor={config.playerColor}
            playerGlowColor={config.playerGlowColor}
            botNames={BOT_NAMES}
            botRanks={BOT_RANKS}
            onGameOver={handleGameOver}
            onGameModeChange={handleGameModeChange}
            onPlayerLivesChange={handleLivesChange}
            grantExtraLifeRef={grantExtraLifeRef}
            onEliminatedSpectating={() => {}}
            colorBoard={settings.colorBoard}
            soundEnabled={settings.soundEnabled}
            sensitivity={settings.sensitivity}
            onActiveBallsChange={setActiveBalls}
            botDifficulty={botDifficulty}
            onGameStart={handleGameStart}
            playerRelic={relic ? getScaledRelicEffect(relic.id, getRelicLevel(profile, relic.id)) : undefined}
            botSkill={botSkill}
            arenaBg={map.arenaBg}
            {...mergedCfg}
          />
        )}

        <View style={styles.topBotLabel}>
          <View style={[styles.labelDot, { backgroundColor: config.playerColor }]} />
          <Text style={[styles.labelTxt, { color: config.playerColor }]}>{config.playerName} · YOU</Text>
        </View>
      </View>

      {/* HUD Bottom */}
      <View style={[styles.hudBottom, { paddingBottom: bottomPad + 6 }]}>
        <View style={styles.livesWrap}>
          <Text style={styles.livesLabel}>LIVES</Text>
          {Array.from({ length: Math.max(0, playerLives) }).map((_, i) => (
            <View key={i} style={[styles.lifeHeart, { backgroundColor: config.playerColor }]} />
          ))}
          {playerLives <= 0 && <Text style={styles.elimText}>ELIMINATED</Text>}
        </View>

        {playerLives > 0 && playerLives <= 4 && !extraLifeUsed.current && (
          <Pressable onPress={handleBuyExtraLife} style={styles.extraLifeBtn}>
            <Feather name="heart" size={12} color="#FF69B4" />
            <Text style={styles.extraLifeText}>+3 Lives</Text>
          </Pressable>
        )}

        <View style={{ flex: 1 }} />

        <View style={styles.puRow}>
          {[
            { c:'#C8820A', l:'SHD' }, { c:'#00FF88', l:'SPD' }, { c:'#FF4757', l:'SHK' },
            { c:'#FF69B4', l:'+3L' }, { c:'#00E5FF', l:'MLB' },
          ].map(pu => (
            <View key={pu.l} style={styles.puLegend}>
              <View style={[styles.puDot, { backgroundColor: pu.c }]} />
              <Text style={[styles.puLabel, { color: pu.c }]}>{pu.l}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Pause Modal */}
      <Modal visible={paused} transparent animationType="fade">
        <View style={styles.pauseOverlay}>
          <View style={styles.pauseCard}>
            <LinearGradient colors={['#0D0035','#16005A','#0D0035']} style={StyleSheet.absoluteFill} />
            <Text style={styles.pauseTitle}>⏸ PAUSED</Text>
            <View style={styles.pauseStats}>
              <View style={styles.pauseStat}>
                <Text style={styles.pauseStatVal}>{fmtTime(timerSecs)}</Text>
                <Text style={styles.pauseStatLbl}>TIME</Text>
              </View>
              <View style={styles.pauseDivider} />
              <View style={styles.pauseStat}>
                <Text style={styles.pauseStatVal}>{playerLives}</Text>
                <Text style={styles.pauseStatLbl}>LIVES</Text>
              </View>
              <View style={styles.pauseDivider} />
              <View style={styles.pauseStat}>
                <Text style={styles.pauseStatVal}>{activeBalls}</Text>
                <Text style={styles.pauseStatLbl}>BALLS</Text>
              </View>
            </View>
            <Pressable onPress={() => setPaused(false)} style={styles.resumeBtn}>
              <LinearGradient colors={['#FFE020','#FFB800']} style={styles.resumeGrad}>
                <Feather name="play" size={18} color="#080814" />
                <Text style={styles.resumeText}>RESUME</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => { setPaused(false); music.stop(); router.replace('/'); }} style={styles.quitBtn}>
              <Feather name="home" size={14} color="#FF475788" />
              <Text style={styles.quitText}>Quit to Menu</Text>
            </Pressable>
            {playerLives > 0 && playerLives <= 4 && !extraLifeUsed.current && (
              <Pressable onPress={() => { handleBuyExtraLife(); setPaused(false); }} style={styles.lifeBtn}>
                <Feather name="heart" size={13} color="#FF69B4" />
                <Text style={styles.lifeBtnText}>Buy +3 Lives · $0.99</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex:1, alignItems:'center' },
  hud:  { flexDirection:'row', alignItems:'center', width:'100%', paddingHorizontal:12, height:48 },
  iconBtn: { width:36, height:36, alignItems:'center', justifyContent:'center' },
  modeChip: { flex:1, alignSelf:'center', maxWidth:140, borderRadius:10, borderWidth:1, paddingHorizontal:12, paddingVertical:5, alignItems:'center', marginHorizontal:8 },
  modeText: { fontFamily:'Inter_700Bold', fontSize:12, letterSpacing:1.5 },
  hudRight: { width:36, alignItems:'flex-end' },
  infoRow: { flexDirection:'row', alignItems:'center', paddingHorizontal:12, height:22 },
  timerBadge: { flexDirection:'row', alignItems:'center', gap:4 },
  timerText: { fontFamily:'Inter_600SemiBold', fontSize:11, color:'#FFFFFF55', letterSpacing:0.8 },
  ballsBadge: { flexDirection:'row', alignItems:'center', gap:5 },
  ballDot: { width:7, height:7, borderRadius:4 },
  ballsText: { fontFamily:'Inter_600SemiBold', fontSize:10, color:'#FFFFFF88', letterSpacing:0.5 },
  labelsRow:  { flexDirection:'row', paddingHorizontal:10, paddingBottom:2, alignItems:'center' },
  sideLabel:  { fontFamily:'Inter_500Medium', fontSize:10, letterSpacing:0.5 },
  arenaWrap:  { alignItems:'center', gap:3 },
  topBotLabel: { flexDirection:'row', alignItems:'center', gap:6 },
  labelDot: { width:8, height:8, borderRadius:4 },
  labelTxt: { fontFamily:'Inter_600SemiBold', fontSize:11, letterSpacing:0.5 },
  hudBottom:   { flexDirection:'row', alignItems:'center', flexWrap:'wrap', paddingTop:8, paddingHorizontal:16, gap:8, width:'100%' },
  livesWrap:   { flexDirection:'row', alignItems:'center', gap:4 },
  livesLabel:  { fontFamily:'Inter_500Medium', fontSize:9, color:'#FFFFFF44', letterSpacing:1, marginRight:2 },
  lifeHeart:   { width:10, height:10, borderRadius:5 },
  elimText:    { color:'#FF4757', fontFamily:'Inter_700Bold', fontSize:11, letterSpacing:1 },
  extraLifeBtn: { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'#FF69B422', borderRadius:10, borderWidth:1, borderColor:'#FF69B455', paddingHorizontal:8, paddingVertical:4 },
  extraLifeText: { color:'#FF69B4', fontFamily:'Inter_600SemiBold', fontSize:11 },
  puRow:    { flexDirection:'row', gap:8 },
  puLegend: { flexDirection:'row', alignItems:'center', gap:3 },
  puDot:    { width:6, height:6, borderRadius:3 },
  puLabel:  { fontFamily:'Inter_500Medium', fontSize:9, letterSpacing:0.3 },
  pauseOverlay: { flex:1, backgroundColor:'#000000BB', alignItems:'center', justifyContent:'center' },
  pauseCard: { width:280, borderRadius:24, overflow:'hidden', padding:28, alignItems:'center', gap:18, borderWidth:1, borderColor:'#FFFFFF11' },
  pauseTitle: { fontFamily:'Inter_700Bold', fontSize:28, color:'#FFFFFF', letterSpacing:3 },
  pauseStats: { flexDirection:'row', alignItems:'center', gap:0, backgroundColor:'#FFFFFF08', borderRadius:12, paddingVertical:10, paddingHorizontal:8, width:'100%', justifyContent:'space-around' },
  pauseStat: { alignItems:'center', flex:1 },
  pauseStatVal: { fontFamily:'Inter_700Bold', fontSize:20, color:'#FFFFFF' },
  pauseStatLbl: { fontFamily:'Inter_500Medium', fontSize:10, color:'#FFFFFF55', letterSpacing:1 },
  pauseDivider: { width:1, height:36, backgroundColor:'#FFFFFF22' },
  resumeBtn: { width:'100%', borderRadius:14, overflow:'hidden' },
  resumeGrad: { flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:14, gap:8 },
  resumeText: { fontFamily:'Inter_700Bold', fontSize:16, color:'#080814', letterSpacing:1 },
  quitBtn: { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:6 },
  quitText: { fontFamily:'Inter_500Medium', fontSize:13, color:'#FF475777' },
  lifeBtn: { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#FF69B422', borderRadius:10, borderWidth:1, borderColor:'#FF69B444', paddingHorizontal:14, paddingVertical:8 },
  lifeBtnText: { fontFamily:'Inter_600SemiBold', fontSize:13, color:'#FF69B4' },
});
