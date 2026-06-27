import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Line, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

// ─── Constants ────────────────────────────────────────────────────────────────
const WALL_MARGIN = 24;
const PADDLE_LENGTH = 88;
const PADDLE_THICKNESS = 14;
const MAX_BALLS = 8;
const BALL_SPAWN_FRAMES = 900;   // 15 s × 60 fps
const POWERUP_SPAWN_FRAMES = 420;
const INITIAL_LIVES = 5;
const INITIAL_SPEED = 5.2;
const MAX_SPEED = 14;
const DUEL_TIME_LIMIT = 60;     // seconds before sudden-death winner declared

const BOTTOM = 0; const TOP = 1; const LEFT = 2; const RIGHT = 3;
const BOTTOM_R = 4; const TOP_R = 5;

type BallType   = 'normal' | 'fire' | 'heavy' | 'tiny';
type PowerUpType = 'shield' | 'speed' | 'shrink' | 'extralife' | 'multiball';
export type GameMode = 'square' | 'triangle' | 'duel';

// ─── Types ────────────────────────────────────────────────────────────────────
interface BallRef   { id:number; x:number; y:number; vx:number; vy:number; radius:number; type:BallType; color:string; active:boolean }
interface PlayerRef { id:number; name:string; paddleCenter:number; prevPaddleCenter:number; lives:number; isBot:boolean; isEliminated:boolean; score:number; color:string; glowColor:string; rank:string; botSpeed:number; botAccuracy:number; hasShield:boolean; speedBoostFrames:number; shrunkFrames:number }
interface PowerUpRef { id:number; x:number; y:number; type:PowerUpType; active:boolean }
interface FloatingEmoji { id:number; emoji:string; x:number; anim:Animated.Value }
interface Spark { id:number; x:number; y:number; color:string; dx:number; dy:number; anim:Animated.Value; tAnim:Animated.Value }

interface GameStateRef {
  balls: BallRef[];
  players: PlayerRef[];
  powerups: PowerUpRef[];
  frame: number;
  nextBallFrame: number;
  nextPowerupFrame: number;
  speedMultiplier: number;
  winner: number | null;
  phase: 'countdown' | 'playing' | 'gameover';
  gameMode: GameMode;
  // Duel tracking — which player IDs are on top/bottom during 1v1
  duelTopId: number;    // defaults to TOP(1)
  duelBottomId: number; // defaults to BOTTOM(0)
  duelFrames: number;   // frames elapsed in duel mode
}

export interface GameResult {
  won: boolean; position: number; deflections: number; goalsAgainst: number; xpEarned: number; coinsEarned: number;
}

interface GameArenaProps {
  arenaSize: number;
  playerName: string; playerColor: string; playerGlowColor: string;
  botNames: string[]; botRanks: string[];
  onGameOver: (result: GameResult) => void;
  onGameModeChange?: (mode: GameMode) => void;
  onPlayerLivesChange?: (lives: number) => void;
  grantExtraLifeRef?: React.MutableRefObject<(() => void) | null>;
  onEliminatedSpectating?: (earn: { xp: number; coins: number }) => void;
  /** Gradually shifts arena hue during gameplay */
  colorBoard?: boolean;
  /** Enable Web-Audio sound effects */
  soundEnabled?: boolean;
  /** Paddle sensitivity multiplier: 1.0 = normal, 1.5 = fast, 0.6 = slow */
  sensitivity?: number;
  /** Called whenever the active ball count changes */
  onActiveBallsChange?: (count: number) => void;
  /** Bot difficulty: easy = Casual mode, normal = Ranked mode */
  botDifficulty?: 'easy' | 'normal';
  /** Called once the countdown finishes and gameplay begins */
  onGameStart?: () => void;
  /** Lives each player starts with (default 5) */
  initialLives?: number;
  /** Extra balls spawned immediately at game start in addition to the first (default 0) */
  startingBallCount?: number;
  /** Frames between automatic ball spawns (default 900 = 15 s at 60 fps) */
  ballSpawnFrames?: number;
  /** When true, power-up pickups never spawn */
  noPowerups?: boolean;
  /** Speed multiplier applied to the very first ball (default 1.0) */
  startSpeedMult?: number;
  /** Team 2v2: [BOTTOM,RIGHT] vs [TOP,LEFT]. Skip triangle/duel transitions; team elimination wins. */
  duoMode?: boolean;
  /** 6-player mode: top & bottom walls each split into left/right halves, giving 6 independent zones. */
  sixPlayer?: boolean;
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const POWERUP_COLORS:  Record<PowerUpType, string> = { shield:'#C8820A', speed:'#4A8A38', shrink:'#C03820', extralife:'#D07018', multiball:'#1E8AAA' };
const POWERUP_LABELS:  Record<PowerUpType, string> = { shield:'SHD', speed:'SPD', shrink:'SHK', extralife:'+1', multiball:'MLB' };
const ARENA_BG:        Record<GameMode, [string,string,string]> = {
  square:   ['#0A0804','#1A1008','#0A0804'],
  triangle: ['#070A04','#0E1608','#070A04'],
  duel:     ['#0E0604','#1C0C06','#0E0604'],
};
const PLAYER_COLORS = ['#C8820A','#C03820','#1E8AAA','#4A8A38','#D07018','#7A50A0'];
const PLAYER_GLOW   = ['#C8820A88','#C0382088','#1E8AAA88','#4A8A3888','#D0701888','#7A50A088'];
const GOAL_EMOJIS   = ['💥','🎯','⚡','🔥','😱','💫','🚀'];
const COMBO_COLORS  = ['#C8820A','#D07018','#C03820','#7A50A0'];

function clampPaddle(v: number, len: number, sz: number) {
  return Math.max(len/2+2, Math.min(sz-len/2-2, v));
}
function clampPaddleRange(v: number, len: number, minX: number, maxX: number) {
  return Math.max(minX + len/2 + 2, Math.min(maxX - len/2 - 2, v));
}
function getPaddleLen(p: PlayerRef) { return p.shrunkFrames > 0 ? PADDLE_LENGTH * 0.52 : PADDLE_LENGTH; }

// ─── Colour-board base hues (opacity applied dynamically in render) ────────────
const COLOR_BOARD_COLORS = [
  '#FF0000','#FF8800','#FFDD00','#00FF55',
  '#00CCFF','#8800FF','#FF00BB','#FF0000',
];

// ─── Component ────────────────────────────────────────────────────────────────
export function GameArena({
  arenaSize, playerName, playerColor, playerGlowColor,
  botNames, botRanks, onGameOver, onGameModeChange,
  onPlayerLivesChange, grantExtraLifeRef, onEliminatedSpectating,
  colorBoard = true, soundEnabled = true,
  sensitivity = 1.0, onActiveBallsChange, botDifficulty = 'normal', onGameStart,
  initialLives, startingBallCount, ballSpawnFrames, noPowerups, startSpeedMult, duoMode, sixPlayer,
}: GameArenaProps) {

  const szRef = useRef(arenaSize);
  szRef.current = arenaSize;

  const ballSpawnFramesRef   = useRef(ballSpawnFrames   ?? BALL_SPAWN_FRAMES);
  const noPowerupsRef        = useRef(noPowerups        ?? false);
  const startingBallCountRef = useRef(startingBallCount ?? 1);
  const duoModeRef           = useRef(duoMode           ?? false);
  const sixPlayerRef         = useRef(sixPlayer         ?? false);
  const initialLivesVal      = initialLives ?? INITIAL_LIVES;
  const startSpeedMultVal    = startSpeedMult ?? 1.0;

  const paddleAnims = useRef([
    new Animated.Value(arenaSize/2),
    new Animated.Value(arenaSize/2),
    new Animated.Value(arenaSize/2),
    new Animated.Value(arenaSize/2),
    new Animated.Value(arenaSize/4),   // BOTTOM_R — right half of bottom
    new Animated.Value(arenaSize/4),   // TOP_R    — right half of top
  ]).current;

  const ballAnims = useRef(
    Array.from({length:MAX_BALLS}, () => new Animated.ValueXY({x:-200,y:-200}))
  ).current;

  const flashAnim  = useRef(new Animated.Value(0)).current;
  const shakeX     = useRef(new Animated.Value(0)).current;
  const shakeY     = useRef(new Animated.Value(0)).current;
  const [flashColor, setFlashColor]           = useState('#FF4757');
  const [livesState, setLivesState]           = useState<number[]>([initialLivesVal,initialLivesVal,initialLivesVal,initialLivesVal,initialLivesVal,initialLivesVal]);
  const [eliminatedState, setEliminatedState] = useState<boolean[]>([false,false,false,false,false,false]);
  const [gamePhase, setGamePhase]             = useState<'countdown'|'playing'|'gameover'>('countdown');
  const [gameMode, setGameMode]               = useState<GameMode>('square');
  const [countdown, setCountdown]             = useState(3);
  const [announcer, setAnnouncer]             = useState('');
  const [ballVisuals, setBallVisuals]         = useState<Array<{active:boolean;color:string;radius:number}>>([]);
  const [powerUpsUI, setPowerUpsUI]           = useState<PowerUpRef[]>([]);
  const [shieldActive, setShieldActive]       = useState<boolean[]>([false,false,false,false,false,false]);
  const [floatingEmojis, setFloatingEmojis]   = useState<FloatingEmoji[]>([]);
  const [comboCount, setComboCount]           = useState(0);
  const [duelSecondsLeft, setDuelSecondsLeft] = useState(DUEL_TIME_LIMIT);
  const [isSpectating, setIsSpectating]       = useState(false);

  // ── Visual FX state ─────────────────────────────────────────────────────────
  const ballTrailRef = useRef<Array<Array<{x:number;y:number}>>>(
    Array.from({length:MAX_BALLS}, () => [])
  );
  const [ballTrailUI, setBallTrailUI] = useState<Array<Array<{x:number;y:number}>>>(
    Array.from({length:MAX_BALLS}, () => [])
  );
  const [sparks, setSparks]             = useState<Spark[]>([]);
  const sparkIdRef                      = useRef(0);
  const countdownScaleAnim              = useRef(new Animated.Value(0.4)).current;
  const countdownOpacityAnim            = useRef(new Animated.Value(0)).current;
  const paddleGlowAnims                 = useRef(Array.from({length:6}, () => new Animated.Value(0.75))).current;
  const borderPulseAnim                 = useRef(new Animated.Value(0)).current;

  // Duel paddle anim: which anim index each duel position uses
  const duelTopAnimIdx    = useRef(TOP);
  const duelBottomAnimIdx = useRef(BOTTOM);

  const announcerTimer    = useRef<ReturnType<typeof setTimeout>|null>(null);
  const comboTimer        = useRef<ReturnType<typeof setTimeout>|null>(null);
  const duelTimerInterval = useRef<ReturnType<typeof setInterval>|null>(null);
  const rafRef            = useRef(0);
  const lastTimeRef       = useRef(0);
  const isRunningRef      = useRef(false);
  const finishPositionRef = useRef(4);
  const deflectionsRef    = useRef(0);
  const goalsAgainstRef   = useRef(0);
  const comboTimestamps   = useRef<number[]>([]);
  const onGameOverRef     = useRef(onGameOver);
  const gameModeRef       = useRef<GameMode>('square');
  const sensitivityRef    = useRef(sensitivity);
  useEffect(() => { sensitivityRef.current = sensitivity; }, [sensitivity]);
  const botDifficultyRef  = useRef(botDifficulty);
  useEffect(() => { botDifficultyRef.current = botDifficulty; }, [botDifficulty]);
  useEffect(() => { onGameOverRef.current = onGameOver; }, [onGameOver]);

  // ── Animated countdown: scale-in + flash on each number ─────────────────────
  useEffect(() => {
    countdownScaleAnim.setValue(0.25);
    countdownOpacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(countdownScaleAnim, {toValue:1, tension:200, friction:8, useNativeDriver:true}),
      Animated.timing(countdownOpacityAnim,{toValue:1, duration:90, useNativeDriver:true}),
    ]).start();
  }, [countdown]);

  // ── Paddle glow pulse ────────────────────────────────────────────────────────
  useEffect(() => {
    const loops = paddleGlowAnims.map((anim, i) =>
      Animated.loop(Animated.sequence([
        Animated.timing(anim, {toValue:1,   duration:850+i*130, useNativeDriver:true}),
        Animated.timing(anim, {toValue:0.45, duration:850+i*130, useNativeDriver:true}),
      ]))
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  // ── Arena border pulse ───────────────────────────────────────────────────────
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(borderPulseAnim, {toValue:1, duration:2200, useNativeDriver:true}),
      Animated.timing(borderPulseAnim, {toValue:0, duration:2200, useNativeDriver:true}),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Report active ball count to parent whenever ballVisuals changes ───────────
  const prevBallCountRef = useRef(0);
  useEffect(() => {
    const count = ballVisuals.filter(b => b.active).length;
    if (count !== prevBallCountRef.current) {
      prevBallCountRef.current = count;
      onActiveBallsChange?.(count);
    }
  }, [ballVisuals]);

  // ── Color-board: cycle through tint phases ──────────────────────────────────
  const colorPhaseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!colorBoard) return;
    const loop = Animated.loop(
      Animated.timing(colorPhaseAnim, {
        toValue: COLOR_BOARD_COLORS.length - 1,
        duration: (COLOR_BOARD_COLORS.length - 1) * 8000,
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [colorBoard]);

  // ── Sound effects (Web Audio API, web-only) ─────────────────────────────────
  function playSFX(type: 'hit' | 'goal' | 'start' | 'elim' | 'powerup') {
    if (!soundEnabled) return;
    if (Platform.OS !== 'web') return;
    if (typeof AudioContext === 'undefined' &&
        !(window as never as {webkitAudioContext: typeof AudioContext}).webkitAudioContext) return;
    try {
      const Ctx = AudioContext ??
        (window as never as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
      const ctx = new Ctx();
      const play = (freq: number, dur: number, oType: OscillatorType, vol: number, delay = 0) => {
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = oType; const t = ctx.currentTime + delay;
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(vol, t);
        g.gain.setTargetAtTime(0.0001, t + dur * 0.7, dur * 0.1);
        osc.start(t); osc.stop(t + dur + 0.05);
      };
      if (type === 'hit')     { play(380, 0.04, 'square', 0.07); }
      if (type === 'goal')    { play(440, 0.1, 'square', 0.09); play(330, 0.1, 'sawtooth', 0.08, 0.1); play(220, 0.18, 'sawtooth', 0.09, 0.2); }
      if (type === 'start')   { [261,329,392,523].forEach((f,i) => play(f, 0.13, 'square', 0.09, i * 0.11)); }
      if (type === 'elim')    { [300,220,160,110].forEach((f,i) => play(f, 0.17, 'sawtooth', 0.1, i * 0.13)); }
      if (type === 'powerup') { play(660, 0.07, 'square', 0.07); play(880, 0.1, 'square', 0.07, 0.07); }
      setTimeout(() => { try { ctx.close(); } catch {} }, 1200);
    } catch { /* unsupported */ }
  }

  // ── Grant extra life from parent ──
  useEffect(() => {
    if (grantExtraLifeRef) {
      grantExtraLifeRef.current = () => {
        const gs = gsRef.current;
        const p0 = gs.players[BOTTOM];
        if (p0.isEliminated) return;
        p0.lives = Math.min(p0.lives + 1, 9);
        setLivesState(gs.players.map(p => p.lives));
        onPlayerLivesChange?.(p0.lives);
        showAnnouncer('EXTRA LIFE! ❤');
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      };
    }
  }, []);

  // ── Initial game state ──
  const gsRef = useRef<GameStateRef>({
    balls: [], powerups: [], frame: 0,
    nextBallFrame: 8, nextPowerupFrame: POWERUP_SPAWN_FRAMES,
    speedMultiplier: startSpeedMultVal, winner: null, phase: 'countdown', gameMode: 'square',
    duelTopId: TOP, duelBottomId: BOTTOM, duelFrames: 0,
    players: [
      { id:BOTTOM,   name:playerName,              paddleCenter:(sixPlayer??false)?arenaSize/4:arenaSize/2,   prevPaddleCenter:(sixPlayer??false)?arenaSize/4:arenaSize/2,   lives:initialLivesVal, isBot:false, isEliminated:false,              score:0, color:playerColor,      glowColor:playerGlowColor, rank:'Gold',              botSpeed:0,   botAccuracy:1,    hasShield:false, speedBoostFrames:0, shrunkFrames:0 },
      { id:TOP,      name:botNames[0]??'Blaze_99',  paddleCenter:(sixPlayer??false)?arenaSize/4:arenaSize/2,   prevPaddleCenter:(sixPlayer??false)?arenaSize/4:arenaSize/2,   lives:initialLivesVal, isBot:true,  isEliminated:false,              score:0, color:PLAYER_COLORS[1], glowColor:PLAYER_GLOW[1],  rank:botRanks[0]??'Platinum',     botSpeed:4.8, botAccuracy:0.86, hasShield:false, speedBoostFrames:0, shrunkFrames:0 },
      { id:LEFT,     name:botNames[1]??'IceQueen',  paddleCenter:arenaSize/2,                                  prevPaddleCenter:arenaSize/2,                                  lives:initialLivesVal, isBot:true,  isEliminated:false,              score:0, color:PLAYER_COLORS[2], glowColor:PLAYER_GLOW[2],  rank:botRanks[1]??'Diamond',      botSpeed:5.2, botAccuracy:0.88, hasShield:false, speedBoostFrames:0, shrunkFrames:0 },
      { id:RIGHT,    name:botNames[2]??'Venom_X',   paddleCenter:arenaSize/2,                                  prevPaddleCenter:arenaSize/2,                                  lives:initialLivesVal, isBot:true,  isEliminated:false,              score:0, color:PLAYER_COLORS[3], glowColor:PLAYER_GLOW[3],  rank:botRanks[2]??'Master',       botSpeed:5.6, botAccuracy:0.91, hasShield:false, speedBoostFrames:0, shrunkFrames:0 },
      { id:BOTTOM_R, name:botNames[3]??'ShadowFox', paddleCenter:arenaSize*3/4,                                prevPaddleCenter:arenaSize*3/4,                                lives:initialLivesVal, isBot:true,  isEliminated:!(sixPlayer??false), score:0, color:PLAYER_COLORS[4], glowColor:PLAYER_GLOW[4],  rank:botRanks[3]??'Legend',       botSpeed:4.6, botAccuracy:0.84, hasShield:false, speedBoostFrames:0, shrunkFrames:0 },
      { id:TOP_R,    name:botNames[4]??'CyberWolf',  paddleCenter:arenaSize*3/4,                                prevPaddleCenter:arenaSize*3/4,                                lives:initialLivesVal, isBot:true,  isEliminated:!(sixPlayer??false), score:0, color:PLAYER_COLORS[5], glowColor:PLAYER_GLOW[5],  rank:botRanks[4]??'Grandmaster', botSpeed:5.0, botAccuracy:0.87, hasShield:false, speedBoostFrames:0, shrunkFrames:0 },
    ],
  });

  // ── Helpers ──
  function showAnnouncer(text: string) {
    if (announcerTimer.current) clearTimeout(announcerTimer.current);
    setAnnouncer(text);
    announcerTimer.current = setTimeout(() => setAnnouncer(''), 2200);
  }

  function triggerFlash(color: string) {
    setFlashColor(color);
    flashAnim.setValue(0.45);
    Animated.timing(flashAnim, { toValue: 0, duration: 700, useNativeDriver: true }).start();
  }

  function spawnSparks(x: number, y: number, color: string) {
    const COUNT = 10;
    const newSparks: Spark[] = Array.from({length:COUNT}, (_, i) => {
      const angle = (i/COUNT)*Math.PI*2 + Math.random()*0.5;
      const dist  = 22 + Math.random()*30;
      const anim  = new Animated.Value(1);
      const tAnim = new Animated.Value(0);
      Animated.parallel([
        Animated.timing(tAnim, {toValue:1, duration:420, useNativeDriver:true}),
        Animated.timing(anim,  {toValue:0, duration:420, useNativeDriver:true}),
      ]).start();
      return {id:++sparkIdRef.current, x, y, color, dx:Math.cos(angle)*dist, dy:Math.sin(angle)*dist, anim, tAnim};
    });
    setSparks(prev => [...prev.slice(-24), ...newSparks]);
    setTimeout(() => setSparks(prev => prev.filter(s => !newSparks.some(n => n.id===s.id))), 550);
  }

  function triggerShake() {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(shakeX, { toValue: -9, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeY, { toValue: -5, duration: 40, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(shakeX, { toValue: 9, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeY, { toValue: 5, duration: 40, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(shakeX, { toValue: -6, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeY, { toValue: 3, duration: 35, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(shakeX, { toValue: 4, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeY, { toValue: -3, duration: 35, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(shakeX, { toValue: 0, duration: 30, useNativeDriver: true }),
        Animated.timing(shakeY, { toValue: 0, duration: 30, useNativeDriver: true }),
      ]),
    ]).start();
  }

  function addEmoji(x: number) {
    const emoji = GOAL_EMOJIS[Math.floor(Math.random() * GOAL_EMOJIS.length)];
    const anim  = new Animated.Value(0);
    const id    = Date.now() + Math.random();
    setFloatingEmojis(prev => [...prev.slice(-6), { id, emoji, x, anim }]);
    Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: true }).start(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== id));
    });
  }

  function recordCombo() {
    const now = Date.now();
    comboTimestamps.current = [now, ...comboTimestamps.current.filter(t => now - t < 5000)].slice(0, 10);
    const n = comboTimestamps.current.length;
    if (n >= 3) {
      setComboCount(n);
      if (comboTimer.current) clearTimeout(comboTimer.current);
      comboTimer.current = setTimeout(() => setComboCount(0), 2200);
    }
  }

  // ── Setup duel mode ──
  function setupDuelMode(gs: GameStateRef, size: number) {
    const alive = gs.players.filter(p => !p.isEliminated);
    if (alive.length < 2) return;

    const human = alive.find(p => !p.isBot);
    const bots  = alive.filter(p => p.isBot);

    if (human && bots.length >= 1) {
      gs.duelBottomId = human.id;   // human always defends bottom
      gs.duelTopId    = bots[0].id; // surviving bot goes to top
    } else {
      gs.duelBottomId = alive[0].id;
      gs.duelTopId    = alive[1].id;
    }

    // Reset paddle positions for duel
    gs.players[gs.duelTopId].paddleCenter    = size / 2;
    gs.players[gs.duelTopId].prevPaddleCenter = size / 2;
    paddleAnims[TOP].setValue(size / 2);

    gs.players[gs.duelBottomId].paddleCenter    = size / 2;
    gs.players[gs.duelBottomId].prevPaddleCenter = size / 2;
    paddleAnims[BOTTOM].setValue(size / 2);

    // Boost duel bot so it actually scores
    const duelBot = gs.players[gs.duelTopId];
    if (duelBot.isBot) {
      duelBot.botSpeed    = Math.max(duelBot.botSpeed, 6.5);
      duelBot.botAccuracy = Math.min(duelBot.botAccuracy + 0.04, 0.94);
    }
    const bottomBot = gs.players[gs.duelBottomId];
    if (bottomBot.isBot) {
      bottomBot.botSpeed    = Math.max(bottomBot.botSpeed, 6.5);
      bottomBot.botAccuracy = Math.min(bottomBot.botAccuracy + 0.04, 0.94);
    }

    gs.duelFrames = 0;

    // Start duel timer
    if (duelTimerInterval.current) clearInterval(duelTimerInterval.current);
    setDuelSecondsLeft(DUEL_TIME_LIMIT);
    let elapsed = 0;
    duelTimerInterval.current = setInterval(() => {
      elapsed++;
      setDuelSecondsLeft(DUEL_TIME_LIMIT - elapsed);
      if (elapsed >= DUEL_TIME_LIMIT) {
        clearInterval(duelTimerInterval.current!);
        // Sudden death: player with more lives wins
        const t = gsRef.current.players[gsRef.current.duelTopId];
        const b = gsRef.current.players[gsRef.current.duelBottomId];
        if (!isRunningRef.current) return;
        if (b.lives > t.lives || (b.lives === t.lives && b.id === BOTTOM)) {
          forceWin(gsRef.current, b.id);
        } else {
          forceWin(gsRef.current, t.id);
        }
      }
    }, 1000);
  }

  function forceWin(gs: GameStateRef, winnerId: number) {
    if (gs.phase === 'gameover') return;
    gs.winner  = winnerId;
    gs.phase   = 'gameover';
    isRunningRef.current = false;
    setGamePhase('gameover');
    const won  = winnerId === BOTTOM;
    const xp   = won ? 220 + deflectionsRef.current * 2 : 40 + deflectionsRef.current;
    const coins = won ? 70 : 20;
    showAnnouncer(won ? '🏆 YOU WIN!' : '💀 TIME UP!');
    setTimeout(() => {
      onGameOverRef.current({ won, position: won ? 1 : finishPositionRef.current, deflections: deflectionsRef.current, goalsAgainst: goalsAgainstRef.current, xpEarned: xp, coinsEarned: coins });
    }, 1800);
  }

  // ── Game mode transition ──
  function updateGameMode(gs: GameStateRef) {
    const alive    = gs.players.filter(p => !p.isEliminated).length;
    const newMode: GameMode = alive >= 4 ? 'square' : alive === 3 ? 'triangle' : 'duel';
    if (newMode === gameModeRef.current) return;

    gameModeRef.current = newMode;
    gs.gameMode = newMode;
    setGameMode(newMode);
    onGameModeChange?.(newMode);

    if (newMode === 'triangle') showAnnouncer('▲ 3-PLAYER MODE!');
    if (newMode === 'duel')     {
      setupDuelMode(gs, szRef.current);
      showAnnouncer('⚔ 1v1 FINAL BATTLE!');
    }
  }

  // ── Spawn helpers ──
  function spawnBall(gs: GameStateRef, size: number) {
    let idx = gs.balls.findIndex(b => !b.active);
    if (idx === -1) { if (gs.balls.length >= MAX_BALLS) return; idx = gs.balls.length; }
    const types: BallType[] = ['normal','normal','normal','fire','heavy','tiny'];
    const type   = types[Math.floor(Math.random() * types.length)];
    const spd    = INITIAL_SPEED * gs.speedMultiplier;
    let radius   = 10, color = '#FFFFFF';
    if (type === 'fire')  { radius = 10; color = '#FF6B35'; }
    if (type === 'heavy') { radius = 15; color = '#BF5FFF'; }
    if (type === 'tiny')  { radius = 6;  color = '#00E5FF'; }
    const angle  = (Math.random() * Math.PI * 1.5) + Math.PI * 0.25;
    let vx = Math.cos(angle) * spd, vy = Math.sin(angle) * spd;
    if (Math.abs(vy) < 1.5) vy = vy >= 0 ? 1.5 : -1.5;
    const ball: BallRef = { id: Date.now() + idx, x: size/2, y: size/2, vx, vy, radius, type, color, active: true };
    if (idx < gs.balls.length) gs.balls[idx] = ball; else gs.balls.push(ball);
    ballAnims[idx]?.setValue({ x: ball.x, y: ball.y });
    setBallVisuals(gs.balls.map(b => ({ active: b.active, color: b.color, radius: b.radius })));
  }

  function spawnPowerup(gs: GameStateRef, size: number) {
    const types: PowerUpType[] = ['shield','speed','shrink','extralife','multiball'];
    const type = types[Math.floor(Math.random() * types.length)];
    const m    = 80;
    const pu: PowerUpRef = { id: gs.frame, x: m + Math.random()*(size-m*2), y: m + Math.random()*(size-m*2), type, active: true };
    gs.powerups = gs.powerups.filter(p => p.active).concat(pu).slice(-4);
    setPowerUpsUI([...gs.powerups]);
  }

  // ── Goal handler ──
  function handleGoal(gs: GameStateRef, playerId: number) {
    const player = gs.players[playerId];
    if (!player || player.isEliminated) return;

    if (player.hasShield) {
      player.hasShield = false;
      setShieldActive(prev => { const n=[...prev]; n[player.id]=false; return n; });
      showAnnouncer('🛡 SHIELD BLOCKED!');
      return;
    }

    player.lives = Math.max(0, player.lives - 1);
    if (playerId === BOTTOM) { goalsAgainstRef.current++; onPlayerLivesChange?.(player.lives); }
    setLivesState(gs.players.map(p => p.lives));
    triggerFlash(player.color);
    triggerShake();
    addEmoji(szRef.current * (0.25 + Math.random() * 0.5));
    // Spark burst at the ball's current position
    const hitBall = gs.balls.find(b => b.active);
    if (hitBall) spawnSparks(hitBall.x, hitBall.y, player.color);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const msgs = ['GOAL!','POINT!','NICE SHOT!','SCORE!'];
    showAnnouncer(msgs[Math.floor(Math.random() * msgs.length)]);

    if (player.lives <= 0) {
      player.isEliminated = true;
      if (playerId !== BOTTOM) finishPositionRef.current = Math.max(2, finishPositionRef.current - 1);
      else {
        // Human eliminated — enter spectating
        setIsSpectating(true);
      }
      setEliminatedState(gs.players.map(p => p.isEliminated));
      showAnnouncer(playerId === BOTTOM ? '💀 YOU\'RE OUT! SPECTATING...' : `${player.name} OUT!`);

      if (!duoModeRef.current && !sixPlayerRef.current) updateGameMode(gs);

      const alive = gs.players.filter(p => !p.isEliminated);
      if (duoModeRef.current) {
        const aAlive = !gs.players[BOTTOM].isEliminated || !gs.players[RIGHT].isEliminated;
        const bAlive = !gs.players[TOP].isEliminated   || !gs.players[LEFT].isEliminated;
        if (!aAlive) {
          const w = alive.find(p => p.id === TOP || p.id === LEFT);
          if (w) forceWin(gs, w.id);
        } else if (!bAlive) {
          const w = alive.find(p => p.id === BOTTOM || p.id === RIGHT);
          if (w) forceWin(gs, w.id);
        }
      } else if (sixPlayerRef.current) {
        if (alive.length === 1) forceWin(gs, alive[0].id);
      } else if (alive.length === 1) {
        forceWin(gs, alive[0].id);
      }
    }
  }

  // ── Apply power-up ──
  function applyPowerup(gs: GameStateRef, type: PowerUpType, player: PlayerRef, size: number) {
    switch (type) {
      case 'shield':     player.hasShield = true; setShieldActive(prev=>{const n=[...prev];n[player.id]=true;return n;}); showAnnouncer('🛡 SHIELD ACTIVATED!'); break;
      case 'speed':      player.speedBoostFrames = 360; showAnnouncer('⚡ SPEED BOOST!'); break;
      case 'shrink':     for (const p of gs.players) { if (p.id !== player.id) p.shrunkFrames = 420; } showAnnouncer('⬇ OPPONENTS SHRUNK!'); break;
      case 'extralife':  player.lives = Math.min(player.lives+1,9); setLivesState(gs.players.map(p=>p.lives)); onPlayerLivesChange?.(player.lives); showAnnouncer('❤ EXTRA LIFE!'); break;
      case 'multiball':  spawnBall(gs, size); showAnnouncer('⚽ MULTIBALL!'); break;
    }
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // ── Bot targeting ──
  function getBotTarget(side: 'top'|'bottom'|'left'|'right', balls: BallRef[], size: number): number {
    let best = size/2, highThreat = -Infinity;
    for (const ball of balls) {
      if (!ball.active) continue;
      let threat = 0, pos = size/2;
      if (side === 'top') {
        const t = ball.vy < 0 ? (ball.y - WALL_MARGIN) / Math.abs(ball.vy) : 9999;
        threat = ball.vy < 0 ? 5000 - t*10 : -ball.y;
        pos    = clampPaddle(ball.vy < 0 ? ball.x + ball.vx*t : ball.x, PADDLE_LENGTH, size);
      } else if (side === 'bottom') {
        const t = ball.vy > 0 ? (size - WALL_MARGIN - ball.y) / Math.abs(ball.vy) : 9999;
        threat = ball.vy > 0 ? 5000 - t*10 : -(size-ball.y);
        pos    = clampPaddle(ball.vy > 0 ? ball.x + ball.vx*t : ball.x, PADDLE_LENGTH, size);
      } else if (side === 'left') {
        const t = ball.vx < 0 ? (ball.x - WALL_MARGIN) / Math.abs(ball.vx) : 9999;
        threat = ball.vx < 0 ? 5000 - t*10 : -ball.x;
        pos    = clampPaddle(ball.vx < 0 ? ball.y + ball.vy*t : ball.y, PADDLE_LENGTH, size);
      } else {
        const t = ball.vx > 0 ? (size - WALL_MARGIN - ball.x) / Math.abs(ball.vx) : 9999;
        threat = ball.vx > 0 ? 5000 - t*10 : -(size-ball.x);
        pos    = clampPaddle(ball.vx > 0 ? ball.y + ball.vy*t : ball.y, PADDLE_LENGTH, size);
      }
      if (threat > highThreat) { highThreat = threat; best = pos; }
    }
    return best;
  }

  // ── Main game loop ──
  const gameLoop = useCallback((ts: number) => {
    if (!isRunningRef.current) return;
    const delta = ts - lastTimeRef.current;
    lastTimeRef.current = ts;
    if (delta > 100) { rafRef.current = requestAnimationFrame(gameLoop); return; }

    const gs   = gsRef.current;
    const size = szRef.current;
    gs.frame++;

    const GYB = size - WALL_MARGIN;
    const GYT = WALL_MARGIN;
    const GXL = WALL_MARGIN;
    const GXR = size - WALL_MARGIN;
    const isDuel = gs.gameMode === 'duel';

    // ── Duel references ──
    const duelBot   = isDuel ? gs.players[gs.duelTopId]    : gs.players[TOP];
    const duelHuman = isDuel ? gs.players[gs.duelBottomId] : gs.players[BOTTOM];

    // ── Ball physics ──
    for (let i = 0; i < gs.balls.length; i++) {
      const ball = gs.balls[i];
      if (!ball.active) continue;
      ball.x += ball.vx; ball.y += ball.vy;

      // ─ BOTTOM wall ─
      if (ball.y + ball.radius >= GYB) {
        const isSix = sixPlayerRef.current;
        const midX  = size / 2;
        const defender = isDuel ? duelHuman : (isSix && ball.x >= midX ? gs.players[BOTTOM_R] : gs.players[BOTTOM]);
        const pLen = getPaddleLen(defender);
        const pc   = isDuel ? (paddleAnims[BOTTOM] as unknown as { _value: number })._value : defender.paddleCenter;
        const hit  = !defender.isEliminated && ball.x >= pc - pLen/2 && ball.x <= pc + pLen/2;
        if (hit) {
          const pv = defender.paddleCenter - defender.prevPaddleCenter;
          ball.vy  = -(Math.abs(ball.vy) + 0.12);
          ball.vx += pv * 0.4;
          defender.score++; deflectionsRef.current++;
          if (defender.id === BOTTOM) recordCombo();
        } else {
          ball.vy = -Math.abs(ball.vy);
          handleGoal(gs, isDuel ? duelHuman.id : defender.id);
        }
        ball.y = GYB - ball.radius - 1;
      }

      // ─ TOP wall ─
      if (ball.y - ball.radius <= GYT) {
        const isSix = sixPlayerRef.current;
        const midX  = size / 2;
        const defender = isDuel ? duelBot : (isSix && ball.x >= midX ? gs.players[TOP_R] : gs.players[TOP]);
        const pLen = getPaddleLen(defender);
        const pc   = isDuel ? (paddleAnims[TOP] as unknown as { _value: number })._value : defender.paddleCenter;
        const hit  = !defender.isEliminated && ball.x >= pc - pLen/2 && ball.x <= pc + pLen/2;
        if (hit) {
          const pv = defender.paddleCenter - defender.prevPaddleCenter;
          ball.vy  = Math.abs(ball.vy) + 0.12;
          ball.vx += pv * 0.4;
          defender.score++;
        } else {
          ball.vy = Math.abs(ball.vy);
          handleGoal(gs, isDuel ? duelBot.id : defender.id);
        }
        ball.y = GYT + ball.radius + 1;
      }

      // ─ LEFT wall ─
      if (ball.x - ball.radius <= GXL) {
        if (!isDuel && !gs.players[LEFT].isEliminated) {
          const p    = gs.players[LEFT];
          const pLen = getPaddleLen(p);
          const hit  = ball.y >= p.paddleCenter - pLen/2 && ball.y <= p.paddleCenter + pLen/2;
          if (hit) { const pv = p.paddleCenter - p.prevPaddleCenter; ball.vx = Math.abs(ball.vx)+0.12; ball.vy += pv*0.4; p.score++; }
          else     { ball.vx = Math.abs(ball.vx); handleGoal(gs, LEFT); }
        } else {
          ball.vx = Math.abs(ball.vx); // bounce — duel side wall
        }
        ball.x = GXL + ball.radius + 1;
      }

      // ─ RIGHT wall ─
      if (ball.x + ball.radius >= GXR) {
        if (!isDuel && !gs.players[RIGHT].isEliminated) {
          const p    = gs.players[RIGHT];
          const pLen = getPaddleLen(p);
          const hit  = ball.y >= p.paddleCenter - pLen/2 && ball.y <= p.paddleCenter + pLen/2;
          if (hit) { const pv = p.paddleCenter - p.prevPaddleCenter; ball.vx = -(Math.abs(ball.vx)+0.12); ball.vy += pv*0.4; p.score++; }
          else     { ball.vx = -Math.abs(ball.vx); handleGoal(gs, RIGHT); }
        } else {
          ball.vx = -Math.abs(ball.vx);
        }
        ball.x = GXR - ball.radius - 1;
      }

      // Speed cap
      const spd    = Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy);
      const maxSpd = gs.speedMultiplier * MAX_SPEED;
      if (spd > maxSpd) { ball.vx=(ball.vx/spd)*maxSpd; ball.vy=(ball.vy/spd)*maxSpd; }
      ballAnims[i]?.setValue({ x: ball.x, y: ball.y });
      // Update ball trail
      const trail = ballTrailRef.current[i];
      if (trail) { trail.push({x: ball.x, y: ball.y}); if (trail.length > 8) trail.shift(); }
    }

    // Flush trail UI every 3 frames
    if (gs.frame % 3 === 0) setBallTrailUI(ballTrailRef.current.map(t => [...t]));

    // ── Bot AI (every 3 frames) ──
    if (gs.frame % 3 === 0) {
      if (isDuel) {
        // TOP duel bot
        if (duelBot.isBot && !duelBot.isEliminated) {
          const target    = getBotTarget('top', gs.balls, size);
          const inaccuracy = (1 - duelBot.botAccuracy) * 24 * (Math.random() - 0.5);
          const adj = target + inaccuracy;
          const spd = duelBot.speedBoostFrames > 0 ? duelBot.botSpeed * 1.5 : duelBot.botSpeed;
          const diff = adj - duelBot.paddleCenter;
          const move = Math.sign(diff) * Math.min(Math.abs(diff), spd);
          duelBot.prevPaddleCenter = duelBot.paddleCenter;
          duelBot.paddleCenter     = clampPaddle(duelBot.paddleCenter + move, getPaddleLen(duelBot), size);
          paddleAnims[TOP].setValue(duelBot.paddleCenter);
        }
        // BOTTOM duel bot (bot vs bot)
        if (duelHuman.isBot && !duelHuman.isEliminated) {
          const target    = getBotTarget('bottom', gs.balls, size);
          const inaccuracy = (1 - duelHuman.botAccuracy) * 24 * (Math.random() - 0.5);
          const adj = target + inaccuracy;
          const spd = duelHuman.botSpeed;
          const diff = adj - duelHuman.paddleCenter;
          const move = Math.sign(diff) * Math.min(Math.abs(diff), spd);
          duelHuman.prevPaddleCenter = duelHuman.paddleCenter;
          duelHuman.paddleCenter     = clampPaddle(duelHuman.paddleCenter + move, getPaddleLen(duelHuman), size);
          paddleAnims[BOTTOM].setValue(duelHuman.paddleCenter);
        }
      } else {
        // Normal 4 / 3-player bot AI
        for (const pid of [TOP, LEFT, RIGHT] as const) {
          const bot = gs.players[pid];
          if (bot.isEliminated || !bot.isBot) continue;
          const side: 'top'|'left'|'right' = pid === TOP ? 'top' : pid === LEFT ? 'left' : 'right';
          const rawTarget = getBotTarget(side, gs.balls, size);
          // In six-player mode, TOP only defends the left half — clamp its target
          const target = (sixPlayerRef.current && pid === TOP) ? Math.min(rawTarget, size / 2) : rawTarget;
          const diffMult = botDifficultyRef.current === 'easy' ? 0.62 : 1.0;
          const inaccuracy = (1 - bot.botAccuracy) * 22 * (Math.random() - 0.5) * (botDifficultyRef.current === 'easy' ? 2.2 : 1.0);
          const adj = target + inaccuracy;
          const spd = (bot.speedBoostFrames > 0 ? bot.botSpeed * 1.5 : bot.botSpeed) * diffMult;
          const diff = adj - bot.paddleCenter;
          const move = Math.sign(diff) * Math.min(Math.abs(diff), spd);
          bot.prevPaddleCenter = bot.paddleCenter;
          if (sixPlayerRef.current && pid === TOP) {
            bot.paddleCenter = clampPaddleRange(bot.paddleCenter + move, getPaddleLen(bot), WALL_MARGIN, size / 2);
          } else {
            bot.paddleCenter = clampPaddle(bot.paddleCenter + move, getPaddleLen(bot), size);
          }
          paddleAnims[pid].setValue(bot.paddleCenter);
          if (bot.speedBoostFrames > 0) bot.speedBoostFrames -= 3;
          if (bot.shrunkFrames > 0)     bot.shrunkFrames     -= 3;
        }
        // Six-player extra bots: BOTTOM_R (right half of bottom) and TOP_R (right half of top)
        if (sixPlayerRef.current) {
          for (const [pid, side] of [[BOTTOM_R, 'bottom'], [TOP_R, 'top']] as [number, 'bottom'|'top'][]) {
            const bot = gs.players[pid];
            if (bot.isEliminated || !bot.isBot) continue;
            const rawTarget = getBotTarget(side, gs.balls, size);
            const target    = Math.max(rawTarget, size / 2); // clamp to right half
            const inaccuracy = (1 - bot.botAccuracy) * 22 * (Math.random() - 0.5);
            const adj  = target + inaccuracy;
            const spd  = bot.speedBoostFrames > 0 ? bot.botSpeed * 1.5 : bot.botSpeed;
            const diff = adj - bot.paddleCenter;
            const move = Math.sign(diff) * Math.min(Math.abs(diff), spd);
            bot.prevPaddleCenter = bot.paddleCenter;
            bot.paddleCenter     = clampPaddleRange(bot.paddleCenter + move, getPaddleLen(bot), size / 2, size - WALL_MARGIN);
            paddleAnims[pid].setValue(bot.paddleCenter);
            if (bot.speedBoostFrames > 0) bot.speedBoostFrames -= 3;
            if (bot.shrunkFrames > 0)     bot.shrunkFrames     -= 3;
          }
        }
      }
    }

    const p0 = gs.players[BOTTOM];
    if (p0.speedBoostFrames > 0) p0.speedBoostFrames--;
    if (p0.shrunkFrames > 0)     p0.shrunkFrames--;

    // ── Spawn new ball every 15 s ──
    if (gs.frame >= gs.nextBallFrame && gs.balls.filter(b => b.active).length < MAX_BALLS) {
      spawnBall(gs, size);
      gs.nextBallFrame    = gs.frame + ballSpawnFramesRef.current;
      gs.speedMultiplier  = Math.min(gs.speedMultiplier + 0.07, 2.0);
    }

    // ── Spawn power-up ──
    if (!noPowerupsRef.current && gs.frame >= gs.nextPowerupFrame && gs.powerups.filter(p => p.active).length < 3) {
      spawnPowerup(gs, size);
      gs.nextPowerupFrame = gs.frame + POWERUP_SPAWN_FRAMES + Math.floor(Math.random() * 120);
    }

    // ── Human collects power-ups ──
    if (!p0.isEliminated) {
      for (const pu of gs.powerups) {
        if (!pu.active) continue;
        const dx = pu.x - p0.paddleCenter;
        const dy = pu.y - (size - WALL_MARGIN);
        if (Math.sqrt(dx*dx + dy*dy) < 52) {
          pu.active = false;
          applyPowerup(gs, pu.type, p0, size);
          setPowerUpsUI([...gs.powerups]);
        }
      }
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // ── PanResponder ──
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (evt) => {
        const x   = evt.nativeEvent.locationX;
        const gs  = gsRef.current;
        const p0  = gs.players[BOTTOM];
        if (p0.isEliminated || gs.phase !== 'playing') return;
        p0.prevPaddleCenter = p0.paddleCenter;
        const sz = szRef.current;
        const cx = sz / 2;
        const raw = cx + (x - cx) * sensitivityRef.current;
        p0.paddleCenter = sixPlayerRef.current
          ? clampPaddleRange(raw, getPaddleLen(p0), WALL_MARGIN, sz / 2)
          : clampPaddle(raw, getPaddleLen(p0), sz);
        paddleAnims[BOTTOM].setValue(p0.paddleCenter);
      },
      onPanResponderMove: (evt) => {
        const x   = evt.nativeEvent.locationX;
        const gs  = gsRef.current;
        const p0  = gs.players[BOTTOM];
        if (p0.isEliminated || gs.phase !== 'playing') return;
        p0.prevPaddleCenter = p0.paddleCenter;
        const sz = szRef.current;
        const cx = sz / 2;
        const raw = cx + (x - cx) * sensitivityRef.current;
        p0.paddleCenter = sixPlayerRef.current
          ? clampPaddleRange(raw, getPaddleLen(p0), WALL_MARGIN, sz / 2)
          : clampPaddle(raw, getPaddleLen(p0), sz);
        paddleAnims[BOTTOM].setValue(p0.paddleCenter);
      },
    })
  ).current;

  // ── Countdown + start ──
  useEffect(() => {
    let count = 3;
    setCountdown(3);
    const timer = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        const gs   = gsRef.current;
        const size = szRef.current;
        spawnBall(gs, size);
        for (let i = 1; i < startingBallCountRef.current; i++) spawnBall(gs, size);
        gs.phase         = 'playing';
        gs.nextBallFrame = ballSpawnFramesRef.current;
        setGamePhase('playing');
        isRunningRef.current = true;
        lastTimeRef.current  = performance.now();
        rafRef.current       = requestAnimationFrame(gameLoop);
        showAnnouncer('GAME START!');
        playSFX('start');
        onGameStart?.();
      }
    }, 1000);
    return () => {
      clearInterval(timer);
      if (duelTimerInterval.current) clearInterval(duelTimerInterval.current);
      isRunningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (announcerTimer.current) clearTimeout(announcerTimer.current);
      if (comboTimer.current)     clearTimeout(comboTimer.current);
    };
  }, []);

  // ─── Derived display values ──────────────────────────────────────────────────
  const gs         = gsRef.current;
  const bgColors   = ARENA_BG[gameMode];
  const CX         = arenaSize / 2;
  const CY         = arenaSize / 2;
  const isDuel     = gameMode === 'duel';
  const duelTopPlayer    = isDuel ? gs.players[gs.duelTopId]    : gs.players[TOP];
  const duelBottomPlayer = isDuel ? gs.players[gs.duelBottomId] : gs.players[BOTTOM];

  // Triangle SVG overlay for 3-player mode
  function triPoints(): string {
    const verts = [
      !eliminatedState[BOTTOM] ? `${CX},${arenaSize-WALL_MARGIN}` : null,
      !eliminatedState[TOP]    ? `${CX},${WALL_MARGIN}` : null,
      !eliminatedState[LEFT]   ? `${WALL_MARGIN},${CY}` : null,
      !eliminatedState[RIGHT]  ? `${arenaSize-WALL_MARGIN},${CY}` : null,
    ].filter(Boolean) as string[];
    return verts.join(' ');
  }

  // Earn estimate for spectator exit
  const spectatorXP    = Math.max(20, deflectionsRef.current * 3 + (INITIAL_LIVES - (livesState[BOTTOM] ?? 0)) * 5);
  const spectatorCoins = Math.max(10, Math.floor(spectatorXP / 6));

  return (
    <Animated.View style={{ width: arenaSize, height: arenaSize, overflow: 'hidden', borderRadius: 6, transform: [{ translateX: shakeX }, { translateY: shakeY }] }}>
      {/* Background */}
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />

      {/* Color-shifting board overlay — intensifies with more balls / fewer players */}
      {colorBoard && (() => {
        const activeBallCount = ballVisuals.filter(b => b.active).length;
        const eliminatedCount = eliminatedState.filter(Boolean).length;
        const cbOpacity = Math.min(0.05 + activeBallCount * 0.028 + eliminatedCount * 0.035, 0.26);
        return (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, {
              backgroundColor: colorPhaseAnim.interpolate({
                inputRange: COLOR_BOARD_COLORS.map((_, i) => i),
                outputRange: COLOR_BOARD_COLORS,
              }),
              opacity: cbOpacity,
            }]}
          />
        );
      })()}

      {/* SVG layer */}
      <Svg width={arenaSize} height={arenaSize} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="cg" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.12" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={arenaSize} height={arenaSize} fill="url(#cg)" />
        {/* Grid */}
        <Line x1={0} y1={CY} x2={arenaSize} y2={CY} stroke="#FFFFFF18" strokeWidth={1} />
        <Line x1={CX} y1={0} x2={CX} y2={arenaSize} stroke="#FFFFFF18" strokeWidth={1} />
        {/* Triangle overlay */}
        {gameMode === 'triangle' && <Polygon points={triPoints()} fill="none" stroke="#00FF8866" strokeWidth={1.5} strokeDasharray="10,5" />}
        {/* Duel divider */}
        {isDuel && <Line x1={0} y1={CY} x2={arenaSize} y2={CY} stroke="#FF475555" strokeWidth={2} strokeDasharray="12,6" />}
        {/* Active player wall strips */}
        {/* Bottom wall — split in sixPlayer mode */}
        {!eliminatedState[BOTTOM] && !sixPlayer && <Line x1={WALL_MARGIN} y1={arenaSize-WALL_MARGIN+2} x2={arenaSize-WALL_MARGIN} y2={arenaSize-WALL_MARGIN+2} stroke={PLAYER_COLORS[BOTTOM]} strokeWidth={3} strokeOpacity={0.65} />}
        {sixPlayer && !eliminatedState[BOTTOM]   && <Line x1={WALL_MARGIN} y1={arenaSize-WALL_MARGIN+2} x2={CX} y2={arenaSize-WALL_MARGIN+2} stroke={PLAYER_COLORS[BOTTOM]} strokeWidth={3} strokeOpacity={0.65} />}
        {sixPlayer && !eliminatedState[BOTTOM_R] && <Line x1={CX} y1={arenaSize-WALL_MARGIN+2} x2={arenaSize-WALL_MARGIN} y2={arenaSize-WALL_MARGIN+2} stroke={PLAYER_COLORS[BOTTOM_R]} strokeWidth={3} strokeOpacity={0.65} />}
        {/* Top wall: in duel show duelTop player's color; in sixPlayer split */}
        {isDuel
          ? <Line x1={WALL_MARGIN} y1={WALL_MARGIN-2} x2={arenaSize-WALL_MARGIN} y2={WALL_MARGIN-2} stroke={duelTopPlayer.color} strokeWidth={3} strokeOpacity={0.65} />
          : sixPlayer
            ? <>
                {!eliminatedState[TOP]   && <Line x1={WALL_MARGIN} y1={WALL_MARGIN-2} x2={CX} y2={WALL_MARGIN-2} stroke={PLAYER_COLORS[TOP]}   strokeWidth={3} strokeOpacity={0.65} />}
                {!eliminatedState[TOP_R] && <Line x1={CX} y1={WALL_MARGIN-2} x2={arenaSize-WALL_MARGIN} y2={WALL_MARGIN-2} stroke={PLAYER_COLORS[TOP_R]} strokeWidth={3} strokeOpacity={0.65} />}
              </>
            : !eliminatedState[TOP] && <Line x1={WALL_MARGIN} y1={WALL_MARGIN-2} x2={arenaSize-WALL_MARGIN} y2={WALL_MARGIN-2} stroke={PLAYER_COLORS[TOP]} strokeWidth={3} strokeOpacity={0.65} />
        }
        {!isDuel && !eliminatedState[LEFT]  && <Line x1={WALL_MARGIN-2} y1={WALL_MARGIN} x2={WALL_MARGIN-2} y2={arenaSize-WALL_MARGIN} stroke={PLAYER_COLORS[LEFT]} strokeWidth={3} strokeOpacity={0.65} />}
        {!isDuel && !eliminatedState[RIGHT] && <Line x1={arenaSize-WALL_MARGIN+2} y1={WALL_MARGIN} x2={arenaSize-WALL_MARGIN+2} y2={arenaSize-WALL_MARGIN} stroke={PLAYER_COLORS[RIGHT]} strokeWidth={3} strokeOpacity={0.65} />}
        {/* SixPlayer midline dividers on top/bottom */}
        {sixPlayer && <Line x1={CX} y1={arenaSize-WALL_MARGIN} x2={CX} y2={arenaSize-WALL_MARGIN+5} stroke="#FFFFFF44" strokeWidth={2} />}
        {sixPlayer && <Line x1={CX} y1={WALL_MARGIN-5} x2={CX} y2={WALL_MARGIN} stroke="#FFFFFF44" strokeWidth={2} />}
        {/* Duel side walls (solid bounce markers) */}
        {isDuel && <Line x1={WALL_MARGIN-2} y1={WALL_MARGIN} x2={WALL_MARGIN-2} y2={arenaSize-WALL_MARGIN} stroke="#FFFFFF22" strokeWidth={2} strokeDasharray="8,8" />}
        {isDuel && <Line x1={arenaSize-WALL_MARGIN+2} y1={WALL_MARGIN} x2={arenaSize-WALL_MARGIN+2} y2={arenaSize-WALL_MARGIN} stroke="#FFFFFF22" strokeWidth={2} strokeDasharray="8,8" />}
      </Svg>

      {/* Player wall zone backgrounds */}
      {gs.players.map((player, idx) => {
        if (player.isEliminated) return null;
        if (isDuel && idx !== BOTTOM && idx !== TOP) return null;
        const t = WALL_MARGIN + 2;
        let wallStyle: object = {};
        if (idx === BOTTOM)   wallStyle = sixPlayer ? { position:'absolute' as const, bottom:0, left:0, width:'50%' as const, height:t } : { position:'absolute' as const, bottom:0, left:0, right:0, height:t };
        else if (idx === BOTTOM_R) wallStyle = { position:'absolute' as const, bottom:0, right:0, width:'50%' as const, height:t };
        else if (idx === TOP)      wallStyle = sixPlayer ? { position:'absolute' as const, top:0, left:0, width:'50%' as const, height:t } : { position:'absolute' as const, top:0, left:0, right:0, height:t };
        else if (idx === TOP_R)    wallStyle = { position:'absolute' as const, top:0, right:0, width:'50%' as const, height:t };
        else if (idx === LEFT)     wallStyle = { position:'absolute' as const, left:0, top:0, bottom:0, width:t };
        else                       wallStyle = { position:'absolute' as const, right:0, top:0, bottom:0, width:t };
        return <View key={idx} style={[wallStyle, { backgroundColor: player.color+'44' }]} />;
      })}

      <View style={{ width: arenaSize, height: arenaSize, position:'absolute' }} {...panResponder.panHandlers}>
        {/* Power-ups */}
        {powerUpsUI.filter(p => p.active).map(pu => (
          <View key={pu.id} style={[s.powerup, { left:pu.x-18, top:pu.y-18, borderColor:POWERUP_COLORS[pu.type], backgroundColor:POWERUP_COLORS[pu.type]+'33', shadowColor:POWERUP_COLORS[pu.type] }]}>
            <Text style={[s.powerupLabel, { color:POWERUP_COLORS[pu.type] }]}>{POWERUP_LABELS[pu.type]}</Text>
          </View>
        ))}

        {/* Ball trails */}
        {ballTrailUI.map((trail, ballIdx) => {
          const bv = ballVisuals[ballIdx];
          if (!bv?.active || trail.length < 2) return null;
          return trail.map((pos, ti) => {
            const frac = (ti + 1) / trail.length;
            const r    = bv.radius * 0.85 * frac;
            return (
              <View key={`tr${ballIdx}-${ti}`} pointerEvents="none" style={{
                position:'absolute', width:r*2, height:r*2, borderRadius:r,
                backgroundColor:bv.color, opacity:frac * 0.32,
                left:pos.x - r, top:pos.y - r,
              } as never} />
            );
          });
        })}

        {/* Balls */}
        {ballVisuals.map((bv, i) => bv.active ? (
          <Animated.View key={i} style={[s.ball, {
            width:bv.radius*2, height:bv.radius*2, borderRadius:bv.radius,
            backgroundColor:bv.color, shadowColor:bv.color,
            transform:[{ translateX:Animated.subtract(ballAnims[i].x, bv.radius) },{ translateY:Animated.subtract(ballAnims[i].y, bv.radius) }],
          }]} />
        ) : null)}

        {/* Spark burst particles */}
        {sparks.map(sp => (
          <Animated.View key={sp.id} pointerEvents="none" style={{
            position:'absolute', width:7, height:7, borderRadius:3.5,
            backgroundColor:sp.color, opacity:sp.anim,
            left:sp.x - 3.5, top:sp.y - 3.5,
            shadowColor:sp.color, shadowOpacity:0.9, shadowRadius:5, shadowOffset:{width:0,height:0},
            transform:[
              { translateX:sp.tAnim.interpolate({inputRange:[0,1], outputRange:[0, sp.dx]}) },
              { translateY:sp.tAnim.interpolate({inputRange:[0,1], outputRange:[0, sp.dy]}) },
              { scale:sp.anim.interpolate({inputRange:[0,1], outputRange:[0.3,1.5]}) },
            ],
          } as never} />
        ))}

        {/* Paddles */}
        {/* Bottom */}
        <Animated.View style={[s.paddle, {
          width:getPaddleLen(gs.players[BOTTOM]), height:PADDLE_THICKNESS,
          bottom:WALL_MARGIN-PADDLE_THICKNESS/2, left:0,
          backgroundColor: shieldActive[0] ? '#C8820A' : (isDuel ? duelBottomPlayer.color : gs.players[BOTTOM].color),
          shadowColor: isDuel ? duelBottomPlayer.color : gs.players[BOTTOM].color,
          transform:[{ translateX:Animated.subtract(paddleAnims[BOTTOM], getPaddleLen(gs.players[BOTTOM])/2) }],
        }]} />
        {/* Top — in duel, uses duelTopPlayer's color; always shown in duel */}
        {(isDuel || !gs.players[TOP].isEliminated) && (
          <Animated.View style={[s.paddle, {
            width: getPaddleLen(isDuel ? duelTopPlayer : gs.players[TOP]),
            height:PADDLE_THICKNESS,
            top:WALL_MARGIN-PADDLE_THICKNESS/2, left:0,
            backgroundColor: isDuel ? duelTopPlayer.color : gs.players[TOP].color,
            shadowColor:     isDuel ? duelTopPlayer.color : gs.players[TOP].color,
            transform:[{ translateX:Animated.subtract(paddleAnims[TOP], getPaddleLen(isDuel ? duelTopPlayer : gs.players[TOP])/2) }],
          }]} />
        )}
        {/* BOTTOM_R paddle (right half of bottom, six-player only) */}
        {sixPlayer && !gs.players[BOTTOM_R].isEliminated && (
          <Animated.View style={[s.paddle, {
            width:getPaddleLen(gs.players[BOTTOM_R]), height:PADDLE_THICKNESS,
            bottom:WALL_MARGIN-PADDLE_THICKNESS/2, left:0,
            backgroundColor: shieldActive[BOTTOM_R] ? '#C8820A' : gs.players[BOTTOM_R].color,
            shadowColor: gs.players[BOTTOM_R].color,
            transform:[{ translateX:Animated.subtract(paddleAnims[BOTTOM_R], getPaddleLen(gs.players[BOTTOM_R])/2) }],
          }]} />
        )}
        {/* TOP_R paddle (right half of top, six-player only) */}
        {sixPlayer && !gs.players[TOP_R].isEliminated && (
          <Animated.View style={[s.paddle, {
            width:getPaddleLen(gs.players[TOP_R]), height:PADDLE_THICKNESS,
            top:WALL_MARGIN-PADDLE_THICKNESS/2, left:0,
            backgroundColor: isDuel ? duelTopPlayer.color : gs.players[TOP_R].color,
            shadowColor: gs.players[TOP_R].color,
            transform:[{ translateX:Animated.subtract(paddleAnims[TOP_R], getPaddleLen(gs.players[TOP_R])/2) }],
          }]} />
        )}
        {/* Left (hidden in duel) */}
        {!isDuel && !gs.players[LEFT].isEliminated && (
          <Animated.View style={[s.paddleV, {
            width:PADDLE_THICKNESS, height:getPaddleLen(gs.players[LEFT]),
            left:WALL_MARGIN-PADDLE_THICKNESS/2, top:0,
            backgroundColor:gs.players[LEFT].color, shadowColor:gs.players[LEFT].color,
            transform:[{ translateY:Animated.subtract(paddleAnims[LEFT], getPaddleLen(gs.players[LEFT])/2) }],
          }]} />
        )}
        {/* Right (hidden in duel) */}
        {!isDuel && !gs.players[RIGHT].isEliminated && (
          <Animated.View style={[s.paddleV, {
            width:PADDLE_THICKNESS, height:getPaddleLen(gs.players[RIGHT]),
            right:WALL_MARGIN-PADDLE_THICKNESS/2, top:0,
            backgroundColor:gs.players[RIGHT].color, shadowColor:gs.players[RIGHT].color,
            transform:[{ translateY:Animated.subtract(paddleAnims[RIGHT], getPaddleLen(gs.players[RIGHT])/2) }],
          }]} />
        )}

        {/* Lives display */}
        {isDuel ? (
          <>
            <View style={[s.livesH, { position:'absolute', bottom:4, left:CX-30 }]}>
              {Array.from({length:Math.max(0,livesState[duelBottomPlayer.id]??0)}).map((_,i)=>(
                <View key={i} style={[s.heart,{backgroundColor:duelBottomPlayer.color,shadowColor:duelBottomPlayer.color}]} />
              ))}
            </View>
            <View style={[s.livesH, { position:'absolute', top:4, left:CX-30 }]}>
              {Array.from({length:Math.max(0,livesState[duelTopPlayer.id]??0)}).map((_,i)=>(
                <View key={i} style={[s.heart,{backgroundColor:duelTopPlayer.color,shadowColor:duelTopPlayer.color}]} />
              ))}
            </View>
          </>
        ) : (
          (sixPlayer ? [BOTTOM,TOP,LEFT,RIGHT,BOTTOM_R,TOP_R] : [BOTTOM,TOP,LEFT,RIGHT]).map(pid => {
            const player = gs.players[pid];
            const lives  = livesState[pid] ?? INITIAL_LIVES;
            const isV    = pid === LEFT || pid === RIGHT;
            let posStyle: object;
            if      (pid === BOTTOM)   posStyle = sixPlayer ? { bottom:4, left:4 }        : { bottom:4, left:CX-30 };
            else if (pid === BOTTOM_R) posStyle = { bottom:4, right:4 };
            else if (pid === TOP)      posStyle = sixPlayer ? { top:4, left:4 }            : { top:4,    left:CX-30 };
            else if (pid === TOP_R)    posStyle = { top:4, right:4 };
            else if (pid === LEFT)     posStyle = { left:4, top:CY-14 };
            else                       posStyle = { right:4, top:CY-14 };
            return (
              <View key={pid} style={[{position:'absolute'}, posStyle, isV ? s.livesV : s.livesH]}>
                {Array.from({length:Math.max(0,lives)}).map((_,i)=>(
                  <View key={i} style={[s.heart,{backgroundColor:eliminatedState[pid]?'#333':player.color,shadowColor:player.color}]} />
                ))}
                {eliminatedState[pid] && <Text style={[s.elimX,{color:player.color+'88'}]}>✕</Text>}
              </View>
            );
          })
        )}

        {/* Duel timer */}
        {isDuel && (
          <View style={s.duelTimer}>
            <Text style={[s.duelTimerText, { color: duelSecondsLeft <= 10 ? '#FF4757' : '#FFFFFF88' }]}>
              ⏱ {duelSecondsLeft}s
            </Text>
          </View>
        )}

        {/* Mode badge */}
        {(gameMode === 'triangle' || isDuel || sixPlayer) && (
          <View style={[s.modeBadge, {
            backgroundColor: sixPlayer ? '#FF950033' : isDuel ? '#FF475733' : '#00FF8833',
            borderColor:     sixPlayer ? '#FF9500'   : isDuel ? '#FF4757'   : '#00FF88',
          }]}>
            <Text style={[s.modeBadgeText, { color: sixPlayer ? '#FF9500' : isDuel ? '#FF4757' : '#00FF88' }]}>
              {sixPlayer ? '6️⃣ 6P' : isDuel ? '⚔ 1v1' : '▲ 3P'}
            </Text>
          </View>
        )}

        {/* Combo */}
        {comboCount >= 3 && (
          <View style={s.comboWrap}>
            <Text style={[s.comboText, { color:COMBO_COLORS[Math.min(comboCount-3, COMBO_COLORS.length-1)] }]}>
              COMBO ×{comboCount}!
            </Text>
          </View>
        )}

        {/* Floating emojis */}
        {floatingEmojis.map(e => (
          <Animated.Text key={e.id} style={[s.floatEmoji, {
            left: e.x - 14,
            transform:[{ translateY: e.anim.interpolate({ inputRange:[0,1], outputRange:[0,-110] }) }],
            opacity: e.anim.interpolate({ inputRange:[0,0.7,1], outputRange:[1,1,0] }),
          }]}>
            {e.emoji}
          </Animated.Text>
        ))}

        {/* Arena flash overlay */}
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor:flashColor, opacity:flashAnim, pointerEvents:'none' } as never]} />

        {/* Announcer */}
        {announcer !== '' && (
          <View style={[s.announcerWrap, { pointerEvents:'none' } as never]}>
            <Text style={s.announcerText}>{announcer}</Text>
          </View>
        )}

        {/* Spectator overlay — human eliminated */}
        {isSpectating && gamePhase === 'playing' && (
          <View style={s.spectatorOverlay}>
            <View style={s.spectatorCard}>
              <Text style={s.spectatorTitle}>💀 ELIMINATED</Text>
              <Text style={s.spectatorSub}>You're spectating. Collect your rewards or keep watching!</Text>
              <View style={s.spectatorRewards}>
                <Text style={s.rewardItem}>⚡ {spectatorXP} XP</Text>
                <Text style={s.rewardItem}>🪙 {spectatorCoins} coins</Text>
              </View>
              <Pressable
                style={s.collectBtn}
                onPress={() => {
                  isRunningRef.current = false;
                  if (duelTimerInterval.current) clearInterval(duelTimerInterval.current);
                  setGamePhase('gameover');
                  onEliminatedSpectating?.({ xp: spectatorXP, coins: spectatorCoins });
                  onGameOverRef.current({ won:false, position:finishPositionRef.current, deflections:deflectionsRef.current, goalsAgainst:goalsAgainstRef.current, xpEarned:spectatorXP, coinsEarned:spectatorCoins });
                }}
              >
                <Text style={s.collectBtnText}>COLLECT & EXIT</Text>
              </Pressable>
              <Pressable onPress={() => setIsSpectating(false)} style={s.keepWatchBtn}>
                <Text style={s.keepWatchText}>Keep Watching</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Countdown */}
        {gamePhase === 'countdown' && (
          <View style={[s.countdownOverlay, { pointerEvents:'none' } as never]}>
            <Animated.Text style={[s.countdownText, {
              opacity: countdownOpacityAnim,
              transform: [{ scale: countdownScaleAnim }],
              color: countdown === 0 ? '#00FF88' : '#C8820A',
              textShadowColor: countdown === 0 ? '#00FF88' : '#C8820A',
            }]}>
              {countdown > 0 ? String(countdown) : 'GO!'}
            </Animated.Text>
            <Animated.Text style={[s.countdownSub, { opacity: countdownOpacityAnim }]}>
              SWIPE TO MOVE YOUR PADDLE
            </Animated.Text>
          </View>
        )}

        <Animated.View pointerEvents="none" style={[s.border, {
          width:arenaSize, height:arenaSize,
          borderColor: borderPulseAnim.interpolate({inputRange:[0,1], outputRange:['#FFFFFF18','#FFFFFF50']}),
          shadowColor:'#FFFFFF',
          shadowOpacity: borderPulseAnim.interpolate({inputRange:[0,1], outputRange:[0,0.35]}),
          shadowRadius:10,
        } as never]} />
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  powerup: { position:'absolute', width:36, height:36, borderRadius:18, borderWidth:1.5, alignItems:'center', justifyContent:'center', shadowOffset:{width:0,height:0}, shadowOpacity:0.8, shadowRadius:8, elevation:4 },
  powerupLabel: { fontFamily:'Inter_700Bold', fontSize:9, letterSpacing:0.5 },
  ball: { position:'absolute', top:0, left:0, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:12, elevation:6 },
  paddle:  { position:'absolute', borderRadius:7, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:14, elevation:5 },
  paddleV: { position:'absolute', borderRadius:7, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:14, elevation:5 },
  livesH:  { flexDirection:'row',    gap:3 },
  livesV:  { flexDirection:'column', gap:3 },
  heart:   { width:7, height:7, borderRadius:3.5, shadowOffset:{width:0,height:0}, shadowOpacity:0.8, shadowRadius:4 },
  elimX:   { fontFamily:'Inter_700Bold', fontSize:12 },
  modeBadge: { position:'absolute', top:6, right:6, borderRadius:8, borderWidth:1, paddingHorizontal:7, paddingVertical:3 },
  modeBadgeText: { fontFamily:'Inter_700Bold', fontSize:9, letterSpacing:0.5 },
  duelTimer: { position:'absolute', top:6, left:0, right:0, alignItems:'center' },
  duelTimerText: { fontFamily:'Inter_700Bold', fontSize:11, letterSpacing:1 },
  announcerWrap: { position:'absolute', top:'42%', left:0, right:0, alignItems:'center' },
  announcerText: { color:'#C8820A', fontSize:19, fontFamily:'Inter_700Bold', letterSpacing:1.5, textShadowColor:'#C8820A', textShadowOffset:{width:0,height:0}, textShadowRadius:14 },
  comboWrap: { position:'absolute', top:'30%', left:0, right:0, alignItems:'center' },
  comboText: { fontFamily:'Inter_700Bold', fontSize:22, letterSpacing:2, textShadowColor:'#FF6B35', textShadowOffset:{width:0,height:0}, textShadowRadius:18 },
  floatEmoji: { position:'absolute', bottom:60, fontSize:28 },
  countdownOverlay: { position:'absolute', top:0,left:0,right:0,bottom:0, backgroundColor:'#000000AA', alignItems:'center', justifyContent:'center', gap:10 },
  countdownText: { color:'#C8820A', fontSize:78, fontFamily:'Inter_700Bold', textShadowColor:'#C8820A', textShadowOffset:{width:0,height:0}, textShadowRadius:28 },
  countdownSub:  { color:'#FFFFFF88', fontFamily:'Inter_500Medium', fontSize:13, letterSpacing:1 },
  border: { position:'absolute', top:0, left:0, borderWidth:2, borderColor:'#FFFFFF25', borderRadius:6 },

  // Spectator overlay
  spectatorOverlay: { position:'absolute', top:0,left:0,right:0,bottom:0, backgroundColor:'#00000088', alignItems:'center', justifyContent:'center', padding:16 },
  spectatorCard: { backgroundColor:'#0E0E20EE', borderRadius:18, borderWidth:1, borderColor:'#FF475788', padding:20, alignItems:'center', width:'100%', gap:10 },
  spectatorTitle: { color:'#FF4757', fontFamily:'Inter_700Bold', fontSize:22, letterSpacing:2 },
  spectatorSub:   { color:'#FFFFFF88', fontFamily:'Inter_400Regular', fontSize:12, textAlign:'center', lineHeight:17 },
  spectatorRewards: { flexDirection:'row', gap:20, marginVertical:4 },
  rewardItem: { color:'#C8820A', fontFamily:'Inter_700Bold', fontSize:16 },
  collectBtn: { backgroundColor:'#C8820A', borderRadius:12, paddingHorizontal:28, paddingVertical:13, width:'100%', alignItems:'center' },
  collectBtnText: { color:'#080814', fontFamily:'Inter_700Bold', fontSize:16, letterSpacing:1 },
  keepWatchBtn: { paddingVertical:6 },
  keepWatchText: { color:'#FFFFFF55', fontFamily:'Inter_500Medium', fontSize:12 },
});
