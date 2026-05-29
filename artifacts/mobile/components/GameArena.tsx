import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Line, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

const WALL_MARGIN = 24;
const PADDLE_LENGTH = 88;
const PADDLE_THICKNESS = 14;
const MAX_BALLS = 8;
const BALL_SPAWN_FRAMES = 900; // 15 seconds at 60fps
const POWERUP_SPAWN_FRAMES = 420;
const INITIAL_LIVES = 5;
const INITIAL_SPEED = 5.0;
const MAX_SPEED = 13;

const BOTTOM = 0;
const TOP = 1;
const LEFT = 2;
const RIGHT = 3;

type BallType = 'normal' | 'fire' | 'heavy' | 'tiny' | 'gold';
type PowerUpType = 'shield' | 'speed' | 'shrink' | 'extralife' | 'multiball';
export type GameMode = 'square' | 'triangle' | 'duel';

interface BallRef {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  type: BallType;
  color: string;
  active: boolean;
}

interface PlayerRef {
  id: number;
  name: string;
  paddleCenter: number;
  prevPaddleCenter: number;
  lives: number;
  isBot: boolean;
  isEliminated: boolean;
  score: number;
  color: string;
  glowColor: string;
  rank: string;
  botSpeed: number;
  botAccuracy: number;
  hasShield: boolean;
  speedBoostFrames: number;
  shrunkFrames: number;
}

interface PowerUpRef {
  id: number;
  x: number; y: number;
  type: PowerUpType;
  active: boolean;
}

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
}

export interface GameResult {
  won: boolean;
  position: number;
  deflections: number;
  goalsAgainst: number;
  xpEarned: number;
  coinsEarned: number;
}

interface GameArenaProps {
  arenaSize: number;
  playerName: string;
  playerColor: string;
  playerGlowColor: string;
  botNames: string[];
  botRanks: string[];
  onGameOver: (result: GameResult) => void;
  onGameModeChange?: (mode: GameMode) => void;
  onPlayerLivesChange?: (lives: number) => void;
  grantExtraLifeRef?: React.MutableRefObject<(() => void) | null>;
}

const POWERUP_COLORS: Record<PowerUpType, string> = {
  shield: '#FFD700', speed: '#00FF88', shrink: '#FF4757',
  extralife: '#FF69B4', multiball: '#00E5FF',
};
const POWERUP_LABELS: Record<PowerUpType, string> = {
  shield: 'SHD', speed: 'SPD', shrink: 'SHK', extralife: '+1', multiball: 'MLB',
};

// Arena background colors by mode
const ARENA_COLORS: Record<GameMode, [string, string, string]> = {
  square: ['#0D0035', '#16005A', '#0D0035'],
  triangle: ['#00200D', '#004020', '#001510'],
  duel: ['#350000', '#5A0010', '#350000'],
};

const PLAYER_COLORS = ['#FFD700', '#FF4757', '#00BFFF', '#00FF88'];
const PLAYER_GLOW = ['#FFD70088', '#FF475788', '#00BFFF88', '#00FF8888'];

function clampPaddle(val: number, len: number, arenaSize: number) {
  return Math.max(len / 2 + 2, Math.min(arenaSize - len / 2 - 2, val));
}

function getPaddleLen(player: PlayerRef) {
  return player.shrunkFrames > 0 ? PADDLE_LENGTH * 0.52 : PADDLE_LENGTH;
}

export function GameArena({
  arenaSize, playerName, playerColor, playerGlowColor,
  botNames, botRanks, onGameOver, onGameModeChange, onPlayerLivesChange, grantExtraLifeRef,
}: GameArenaProps) {
  const arenaSizeRef = useRef(arenaSize);
  arenaSizeRef.current = arenaSize;

  const paddleAnims = useRef([
    new Animated.Value(arenaSize / 2),
    new Animated.Value(arenaSize / 2),
    new Animated.Value(arenaSize / 2),
    new Animated.Value(arenaSize / 2),
  ]).current;

  const ballAnims = useRef(
    Array.from({ length: MAX_BALLS }, () => new Animated.ValueXY({ x: -200, y: -200 }))
  ).current;

  const [livesState, setLivesState] = useState<number[]>([INITIAL_LIVES, INITIAL_LIVES, INITIAL_LIVES, INITIAL_LIVES]);
  const [eliminatedState, setEliminatedState] = useState<boolean[]>([false, false, false, false]);
  const [gamePhase, setGamePhase] = useState<'countdown' | 'playing' | 'gameover'>('countdown');
  const [gameMode, setGameMode] = useState<GameMode>('square');
  const [countdown, setCountdown] = useState(3);
  const [announcer, setAnnouncer] = useState('');
  const [ballVisuals, setBallVisuals] = useState<Array<{ active: boolean; color: string; radius: number }>>([]);
  const [powerUpsUI, setPowerUpsUI] = useState<PowerUpRef[]>([]);
  const [shieldActive, setShieldActive] = useState<boolean[]>([false, false, false, false]);

  const announcerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const isRunningRef = useRef(false);
  const finishPositionRef = useRef(4);
  const deflectionsRef = useRef(0);
  const goalsAgainstRef = useRef(0);
  const onGameOverRef = useRef(onGameOver);
  const gameModeRef = useRef<GameMode>('square');
  useEffect(() => { onGameOverRef.current = onGameOver; }, [onGameOver]);

  // Allow parent to grant extra life
  useEffect(() => {
    if (grantExtraLifeRef) {
      grantExtraLifeRef.current = () => {
        const gs = gameStateRef.current;
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

  const gameStateRef = useRef<GameStateRef>({
    balls: [],
    players: [
      {
        id: BOTTOM, name: playerName, paddleCenter: arenaSize / 2, prevPaddleCenter: arenaSize / 2,
        lives: INITIAL_LIVES, isBot: false, isEliminated: false, score: 0,
        color: playerColor, glowColor: playerGlowColor, rank: 'Gold',
        botSpeed: 0, botAccuracy: 1, hasShield: false, speedBoostFrames: 0, shrunkFrames: 0,
      },
      {
        id: TOP, name: botNames[0] ?? 'Blaze_99', paddleCenter: arenaSize / 2, prevPaddleCenter: arenaSize / 2,
        lives: INITIAL_LIVES, isBot: true, isEliminated: false, score: 0,
        color: PLAYER_COLORS[1], glowColor: PLAYER_GLOW[1], rank: botRanks[0] ?? 'Platinum',
        botSpeed: 4.4, botAccuracy: 0.87, hasShield: false, speedBoostFrames: 0, shrunkFrames: 0,
      },
      {
        id: LEFT, name: botNames[1] ?? 'IceQueen', paddleCenter: arenaSize / 2, prevPaddleCenter: arenaSize / 2,
        lives: INITIAL_LIVES, isBot: true, isEliminated: false, score: 0,
        color: PLAYER_COLORS[2], glowColor: PLAYER_GLOW[2], rank: botRanks[1] ?? 'Diamond',
        botSpeed: 5.0, botAccuracy: 0.90, hasShield: false, speedBoostFrames: 0, shrunkFrames: 0,
      },
      {
        id: RIGHT, name: botNames[2] ?? 'Venom_X', paddleCenter: arenaSize / 2, prevPaddleCenter: arenaSize / 2,
        lives: INITIAL_LIVES, isBot: true, isEliminated: false, score: 0,
        color: PLAYER_COLORS[3], glowColor: PLAYER_GLOW[3], rank: botRanks[2] ?? 'Master',
        botSpeed: 5.6, botAccuracy: 0.93, hasShield: false, speedBoostFrames: 0, shrunkFrames: 0,
      },
    ],
    powerups: [],
    frame: 0,
    nextBallFrame: 8,
    nextPowerupFrame: POWERUP_SPAWN_FRAMES,
    speedMultiplier: 1.0,
    winner: null,
    phase: 'countdown',
    gameMode: 'square',
  });

  function showAnnouncer(text: string) {
    if (announcerTimer.current) clearTimeout(announcerTimer.current);
    setAnnouncer(text);
    announcerTimer.current = setTimeout(() => setAnnouncer(''), 2000);
  }

  function updateGameMode(gs: GameStateRef) {
    const alive = gs.players.filter(p => !p.isEliminated).length;
    const newMode: GameMode = alive >= 4 ? 'square' : alive === 3 ? 'triangle' : 'duel';
    if (newMode !== gameModeRef.current) {
      gameModeRef.current = newMode;
      gs.gameMode = newMode;
      setGameMode(newMode);
      onGameModeChange?.(newMode);
      if (newMode === 'triangle') showAnnouncer('TRIANGLE MODE — 3 PLAYERS!');
      if (newMode === 'duel') showAnnouncer('1v1 BATTLE — FINAL ROUND!');
    }
  }

  function spawnBall(gs: GameStateRef, size: number) {
    let idx = gs.balls.findIndex(b => !b.active);
    if (idx === -1) {
      if (gs.balls.length >= MAX_BALLS) return;
      idx = gs.balls.length;
    }
    const types: BallType[] = ['normal', 'normal', 'normal', 'fire', 'heavy', 'tiny'];
    const type = types[Math.floor(Math.random() * types.length)];
    const spd = INITIAL_SPEED * gs.speedMultiplier;
    let radius = 10;
    let color = '#FFFFFF';
    switch (type) {
      case 'fire': radius = 10; color = '#FF6B35'; break;
      case 'heavy': radius = 15; color = '#BF5FFF'; break;
      case 'tiny': radius = 6; color = '#00E5FF'; break;
      default: color = '#FFFFFF';
    }
    const angle = (Math.random() * Math.PI * 1.5) + Math.PI * 0.25;
    let vx = Math.cos(angle) * spd;
    let vy = Math.sin(angle) * spd;
    if (Math.abs(vy) < 1.5) vy = vy >= 0 ? 1.5 : -1.5;
    const ball: BallRef = { id: Date.now() + idx, x: size / 2, y: size / 2, vx, vy, radius, type, color, active: true };
    if (idx < gs.balls.length) gs.balls[idx] = ball;
    else gs.balls.push(ball);
    ballAnims[idx]?.setValue({ x: ball.x, y: ball.y });
    setBallVisuals(gs.balls.map(b => ({ active: b.active, color: b.color, radius: b.radius })));
  }

  function spawnPowerup(gs: GameStateRef, size: number) {
    const types: PowerUpType[] = ['shield', 'speed', 'shrink', 'extralife', 'multiball'];
    const type = types[Math.floor(Math.random() * types.length)];
    const margin = 80;
    const pu: PowerUpRef = {
      id: gs.frame,
      x: margin + Math.random() * (size - margin * 2),
      y: margin + Math.random() * (size - margin * 2),
      type, active: true,
    };
    gs.powerups = gs.powerups.filter(p => p.active).concat(pu).slice(-4);
    setPowerUpsUI([...gs.powerups]);
  }

  function handleGoal(gs: GameStateRef, playerIdx: number) {
    const player = gs.players[playerIdx];
    if (player.isEliminated) return;
    if (player.hasShield) {
      player.hasShield = false;
      setShieldActive(prev => { const n = [...prev]; n[playerIdx] = false; return n; });
      showAnnouncer('🛡 SHIELD BLOCKED!');
      return;
    }
    player.lives = Math.max(0, player.lives - 1);
    if (playerIdx === BOTTOM) {
      goalsAgainstRef.current += 1;
      onPlayerLivesChange?.(player.lives);
    }
    setLivesState(gs.players.map(p => p.lives));
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const msgs = ['GOAL!', 'POINT!', 'NICE SHOT!', 'SCORE!'];
    showAnnouncer(msgs[Math.floor(Math.random() * msgs.length)]);

    if (player.lives <= 0) {
      player.isEliminated = true;
      if (playerIdx !== BOTTOM) finishPositionRef.current = Math.max(2, finishPositionRef.current - 1);
      setEliminatedState(gs.players.map(p => p.isEliminated));
      showAnnouncer(playerIdx === BOTTOM ? '💀 YOU\'RE ELIMINATED!' : `${player.name} ELIMINATED!`);
      updateGameMode(gs);

      const alive = gs.players.filter(p => !p.isEliminated);
      if (alive.length === 1) {
        gs.winner = alive[0].id;
        gs.phase = 'gameover';
        isRunningRef.current = false;
        setGamePhase('gameover');
        const won = gs.winner === BOTTOM;
        const xp = won ? 220 + deflectionsRef.current * 2 : 40 + deflectionsRef.current;
        const coins = won ? 70 : 20;
        setTimeout(() => {
          onGameOverRef.current({
            won, position: won ? 1 : finishPositionRef.current,
            deflections: deflectionsRef.current,
            goalsAgainst: goalsAgainstRef.current,
            xpEarned: xp, coinsEarned: coins,
          });
        }, 1500);
      }
    }
  }

  function getBotTarget(playerId: number, balls: BallRef[], size: number): number | null {
    let best: number | null = null;
    let highThreat = -Infinity;
    for (const ball of balls) {
      if (!ball.active) continue;
      let threat = 0;
      let pos = 0;
      if (playerId === TOP) {
        const t = ball.vy < 0 ? (ball.y - WALL_MARGIN) / Math.abs(ball.vy) : 9999;
        threat = ball.vy < 0 ? 5000 - t * 10 : -ball.y;
        pos = Math.max(PADDLE_LENGTH / 2, Math.min(size - PADDLE_LENGTH / 2, ball.vy < 0 ? ball.x + ball.vx * t : ball.x));
      } else if (playerId === LEFT) {
        const t = ball.vx < 0 ? (ball.x - WALL_MARGIN) / Math.abs(ball.vx) : 9999;
        threat = ball.vx < 0 ? 5000 - t * 10 : -ball.x;
        pos = Math.max(PADDLE_LENGTH / 2, Math.min(size - PADDLE_LENGTH / 2, ball.vx < 0 ? ball.y + ball.vy * t : ball.y));
      } else {
        const t = ball.vx > 0 ? (size - WALL_MARGIN - ball.x) / Math.abs(ball.vx) : 9999;
        threat = ball.vx > 0 ? 5000 - t * 10 : -(size - ball.x);
        pos = Math.max(PADDLE_LENGTH / 2, Math.min(size - PADDLE_LENGTH / 2, ball.vx > 0 ? ball.y + ball.vy * t : ball.y));
      }
      if (threat > highThreat) { highThreat = threat; best = pos; }
    }
    return best;
  }

  const gameLoop = useCallback((ts: number) => {
    if (!isRunningRef.current) return;
    const delta = ts - lastTimeRef.current;
    lastTimeRef.current = ts;
    if (delta > 100) { rafRef.current = requestAnimationFrame(gameLoop); return; }

    const gs = gameStateRef.current;
    const size = arenaSizeRef.current;
    gs.frame += 1;

    const GYB = size - WALL_MARGIN;
    const GYT = WALL_MARGIN;
    const GXL = WALL_MARGIN;
    const GXR = size - WALL_MARGIN;

    // In duel mode, left/right are hard bounce walls (not goals)
    const isDuel = gs.gameMode === 'duel';

    for (let i = 0; i < gs.balls.length; i++) {
      const ball = gs.balls[i];
      if (!ball.active) continue;
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Bottom
      if (ball.y + ball.radius >= GYB) {
        const p = gs.players[BOTTOM];
        const pLen = getPaddleLen(p);
        const hit = !p.isEliminated && ball.x >= p.paddleCenter - pLen / 2 && ball.x <= p.paddleCenter + pLen / 2;
        if (hit) {
          const pv = p.paddleCenter - p.prevPaddleCenter;
          ball.vy = -(Math.abs(ball.vy) + 0.12);
          ball.vx += pv * 0.4;
          p.score += 1; deflectionsRef.current += 1;
        } else {
          ball.vy = -Math.abs(ball.vy);
          handleGoal(gs, BOTTOM);
        }
        ball.y = GYB - ball.radius - 1;
      }
      // Top
      if (ball.y - ball.radius <= GYT) {
        const p = gs.players[TOP];
        const pLen = getPaddleLen(p);
        const hit = !p.isEliminated && ball.x >= p.paddleCenter - pLen / 2 && ball.x <= p.paddleCenter + pLen / 2;
        if (hit) {
          const pv = p.paddleCenter - p.prevPaddleCenter;
          ball.vy = Math.abs(ball.vy) + 0.12;
          ball.vx += pv * 0.4; p.score += 1;
        } else {
          ball.vy = Math.abs(ball.vy);
          handleGoal(gs, TOP);
        }
        ball.y = GYT + ball.radius + 1;
      }
      // Left
      if (ball.x - ball.radius <= GXL) {
        const p = gs.players[LEFT];
        const pLen = getPaddleLen(p);
        const hit = !p.isEliminated && !isDuel && ball.y >= p.paddleCenter - pLen / 2 && ball.y <= p.paddleCenter + pLen / 2;
        if (hit) {
          const pv = p.paddleCenter - p.prevPaddleCenter;
          ball.vx = Math.abs(ball.vx) + 0.12;
          ball.vy += pv * 0.4; p.score += 1;
        } else {
          ball.vx = Math.abs(ball.vx);
          if (!isDuel) handleGoal(gs, LEFT);
        }
        ball.x = GXL + ball.radius + 1;
      }
      // Right
      if (ball.x + ball.radius >= GXR) {
        const p = gs.players[RIGHT];
        const pLen = getPaddleLen(p);
        const hit = !p.isEliminated && !isDuel && ball.y >= p.paddleCenter - pLen / 2 && ball.y <= p.paddleCenter + pLen / 2;
        if (hit) {
          const pv = p.paddleCenter - p.prevPaddleCenter;
          ball.vx = -(Math.abs(ball.vx) + 0.12);
          ball.vy += pv * 0.4; p.score += 1;
        } else {
          ball.vx = -Math.abs(ball.vx);
          if (!isDuel) handleGoal(gs, RIGHT);
        }
        ball.x = GXR - ball.radius - 1;
      }

      // Speed cap
      const spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      const maxSpd = gs.speedMultiplier * MAX_SPEED;
      if (spd > maxSpd) { ball.vx = (ball.vx / spd) * maxSpd; ball.vy = (ball.vy / spd) * maxSpd; }
      ballAnims[i]?.setValue({ x: ball.x, y: ball.y });
    }

    // Bot AI every 3 frames
    if (gs.frame % 3 === 0) {
      for (const pid of [TOP, LEFT, RIGHT]) {
        const bot = gs.players[pid];
        if (bot.isEliminated) continue;
        if (isDuel && (pid === LEFT || pid === RIGHT)) continue; // no-op in duel
        const target = getBotTarget(pid, gs.balls, size);
        if (target !== null) {
          const inaccuracy = (1 - bot.botAccuracy) * 22 * (Math.random() - 0.5);
          const adj = target + inaccuracy;
          const spd = bot.speedBoostFrames > 0 ? bot.botSpeed * 1.5 : bot.botSpeed;
          const diff = adj - bot.paddleCenter;
          const move = Math.sign(diff) * Math.min(Math.abs(diff), spd);
          bot.prevPaddleCenter = bot.paddleCenter;
          bot.paddleCenter = clampPaddle(bot.paddleCenter + move, getPaddleLen(bot), size);
          paddleAnims[pid].setValue(bot.paddleCenter);
        }
        if (bot.speedBoostFrames > 0) bot.speedBoostFrames -= 3;
        if (bot.shrunkFrames > 0) bot.shrunkFrames -= 3;
      }
    }

    const p0 = gs.players[BOTTOM];
    if (p0.speedBoostFrames > 0) p0.speedBoostFrames -= 1;
    if (p0.shrunkFrames > 0) p0.shrunkFrames -= 1;

    // New ball every 15 seconds
    if (gs.frame >= gs.nextBallFrame && gs.balls.filter(b => b.active).length < MAX_BALLS) {
      spawnBall(gs, size);
      gs.nextBallFrame = gs.frame + BALL_SPAWN_FRAMES;
      gs.speedMultiplier = Math.min(gs.speedMultiplier + 0.08, 2.0);
    }

    // Power-up spawn
    if (gs.frame >= gs.nextPowerupFrame && gs.powerups.filter(p => p.active).length < 3) {
      spawnPowerup(gs, size);
      gs.nextPowerupFrame = gs.frame + POWERUP_SPAWN_FRAMES + Math.floor(Math.random() * 120);
    }

    // Power-up collection by human player
    if (!p0.isEliminated) {
      for (const pu of gs.powerups) {
        if (!pu.active) continue;
        const dx = pu.x - p0.paddleCenter;
        const dy = pu.y - (size - WALL_MARGIN);
        if (Math.sqrt(dx * dx + dy * dy) < 52) {
          pu.active = false;
          applyPowerup(gs, pu.type, p0, size);
          setPowerUpsUI([...gs.powerups]);
        }
      }
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  function applyPowerup(gs: GameStateRef, type: PowerUpType, player: PlayerRef, size: number) {
    switch (type) {
      case 'shield':
        player.hasShield = true;
        setShieldActive(prev => { const n = [...prev]; n[player.id] = true; return n; });
        showAnnouncer('🛡 SHIELD ACTIVATED!');
        break;
      case 'speed':
        player.speedBoostFrames = 360;
        showAnnouncer('⚡ SPEED BOOST!');
        break;
      case 'shrink':
        for (const p of gs.players) { if (p.id !== player.id) p.shrunkFrames = 420; }
        showAnnouncer('⬇ OPPONENTS SHRUNK!');
        break;
      case 'extralife':
        player.lives = Math.min(player.lives + 1, 9);
        setLivesState(gs.players.map(p => p.lives));
        onPlayerLivesChange?.(player.lives);
        showAnnouncer('❤ EXTRA LIFE!');
        break;
      case 'multiball':
        spawnBall(gs, size);
        showAnnouncer('⚽ MULTIBALL!');
        break;
    }
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        const gs = gameStateRef.current;
        const p0 = gs.players[BOTTOM];
        if (p0.isEliminated || gs.phase !== 'playing') return;
        p0.prevPaddleCenter = p0.paddleCenter;
        p0.paddleCenter = clampPaddle(x, getPaddleLen(p0), arenaSizeRef.current);
        paddleAnims[BOTTOM].setValue(p0.paddleCenter);
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        const gs = gameStateRef.current;
        const p0 = gs.players[BOTTOM];
        if (p0.isEliminated || gs.phase !== 'playing') return;
        p0.prevPaddleCenter = p0.paddleCenter;
        p0.paddleCenter = clampPaddle(x, getPaddleLen(p0), arenaSizeRef.current);
        paddleAnims[BOTTOM].setValue(p0.paddleCenter);
      },
    })
  ).current;

  useEffect(() => {
    let count = 3;
    setCountdown(3);
    const timer = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        const gs = gameStateRef.current;
        const size = arenaSizeRef.current;
        spawnBall(gs, size);
        gs.phase = 'playing';
        gs.nextBallFrame = BALL_SPAWN_FRAMES;
        setGamePhase('playing');
        isRunningRef.current = true;
        lastTimeRef.current = performance.now();
        rafRef.current = requestAnimationFrame(gameLoop);
        showAnnouncer('GAME START!');
      }
    }, 1000);
    return () => {
      clearInterval(timer);
      isRunningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (announcerTimer.current) clearTimeout(announcerTimer.current);
    };
  }, []);

  // Triangle points for SVG overlay based on who is alive
  function getTrianglePoints(size: number, elim: boolean[]): string {
    const CX = size / 2;
    const CY = size / 2;
    const vertices = [
      !elim[BOTTOM] ? `${CX},${size - WALL_MARGIN}` : null, // bottom
      !elim[TOP] ? `${CX},${WALL_MARGIN}` : null,            // top
      !elim[LEFT] ? `${WALL_MARGIN},${CY}` : null,           // left
      !elim[RIGHT] ? `${size - WALL_MARGIN},${CY}` : null,   // right
    ].filter(Boolean) as string[];
    return vertices.join(' ');
  }

  const gs = gameStateRef.current;
  const bgColors = ARENA_COLORS[gameMode];
  const triPoints = gameMode === 'triangle' ? getTrianglePoints(arenaSize, eliminatedState) : '';
  const CX = arenaSize / 2;
  const CY = arenaSize / 2;

  return (
    <View style={{ width: arenaSize, height: arenaSize, overflow: 'hidden', borderRadius: 6 }}>
      {/* Vibrant background */}
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />

      {/* SVG decorations layer */}
      <Svg width={arenaSize} height={arenaSize} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.12" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Center radial glow */}
        <Rect x={0} y={0} width={arenaSize} height={arenaSize} fill="url(#centerGlow)" />

        {/* Grid lines */}
        <Line x1={0} y1={CY} x2={arenaSize} y2={CY} stroke="#FFFFFF18" strokeWidth={1} />
        <Line x1={CX} y1={0} x2={CX} y2={arenaSize} stroke="#FFFFFF18" strokeWidth={1} />

        {/* Center circle */}
        <Polygon
          points={`${CX - 40},${CY} ${CX},${CY - 40} ${CX + 40},${CY} ${CX},${CY + 40}`}
          fill="none" stroke="#FFFFFF14" strokeWidth={1}
        />

        {/* Active triangle overlay in 3-player mode */}
        {gameMode === 'triangle' && triPoints !== '' && (
          <Polygon
            points={triPoints}
            fill="none"
            stroke="#00FF8866"
            strokeWidth={1.5}
            strokeDasharray="10,5"
          />
        )}

        {/* 1v1 center divider in duel mode */}
        {gameMode === 'duel' && (
          <Line x1={0} y1={CY} x2={arenaSize} y2={CY} stroke="#FF475755" strokeWidth={2} strokeDasharray="12,6" />
        )}

        {/* Player wall color indicators */}
        {!eliminatedState[BOTTOM] && (
          <Line x1={WALL_MARGIN} y1={arenaSize - WALL_MARGIN + 2} x2={arenaSize - WALL_MARGIN} y2={arenaSize - WALL_MARGIN + 2}
            stroke={PLAYER_COLORS[BOTTOM]} strokeWidth={3} strokeOpacity={0.6} />
        )}
        {!eliminatedState[TOP] && (
          <Line x1={WALL_MARGIN} y1={WALL_MARGIN - 2} x2={arenaSize - WALL_MARGIN} y2={WALL_MARGIN - 2}
            stroke={PLAYER_COLORS[TOP]} strokeWidth={3} strokeOpacity={0.6} />
        )}
        {!eliminatedState[LEFT] && !gs.gameMode?.includes('duel') && (
          <Line x1={WALL_MARGIN - 2} y1={WALL_MARGIN} x2={WALL_MARGIN - 2} y2={arenaSize - WALL_MARGIN}
            stroke={PLAYER_COLORS[LEFT]} strokeWidth={3} strokeOpacity={0.6} />
        )}
        {!eliminatedState[RIGHT] && !gs.gameMode?.includes('duel') && (
          <Line x1={arenaSize - WALL_MARGIN + 2} y1={WALL_MARGIN} x2={arenaSize - WALL_MARGIN + 2} y2={arenaSize - WALL_MARGIN}
            stroke={PLAYER_COLORS[RIGHT]} strokeWidth={3} strokeOpacity={0.6} />
        )}

        {/* Eliminated wall: gray X stripes */}
        {eliminatedState[RIGHT] && (
          <>
            <Line x1={arenaSize - WALL_MARGIN + 2} y1={0} x2={arenaSize - WALL_MARGIN + 2} y2={arenaSize}
              stroke="#FFFFFF22" strokeWidth={2} strokeDasharray="8,8" />
          </>
        )}
        {eliminatedState[LEFT] && (
          <Line x1={WALL_MARGIN - 2} y1={0} x2={WALL_MARGIN - 2} y2={arenaSize}
            stroke="#FFFFFF22" strokeWidth={2} strokeDasharray="8,8" />
        )}
        {eliminatedState[TOP] && (
          <Line x1={0} y1={WALL_MARGIN - 2} x2={arenaSize} y2={WALL_MARGIN - 2}
            stroke="#FFFFFF22" strokeWidth={2} strokeDasharray="8,8" />
        )}
      </Svg>

      {/* Player zone colored bands */}
      {gs.players.map((player, idx) => {
        if (player.isEliminated) return null;
        const zs: Record<string, number> = {};
        const thickness = WALL_MARGIN + 2;
        if (idx === BOTTOM) { zs.bottom = 0; zs.left = 0; zs.right = 0; zs.height = thickness; }
        else if (idx === TOP) { zs.top = 0; zs.left = 0; zs.right = 0; zs.height = thickness; }
        else if (idx === LEFT) { zs.left = 0; zs.top = 0; zs.bottom = 0; zs.width = thickness; }
        else { zs.right = 0; zs.top = 0; zs.bottom = 0; zs.width = thickness; }
        return (
          <View key={idx} style={[{ position: 'absolute' }, zs as never, { backgroundColor: player.color + '44' }]} />
        );
      })}

      <View style={{ width: arenaSize, height: arenaSize, position: 'absolute' }} {...panResponder.panHandlers}>
        {/* Power-ups */}
        {powerUpsUI.filter(p => p.active).map((pu) => (
          <View key={pu.id} style={[s.powerup, {
            left: pu.x - 18, top: pu.y - 18,
            borderColor: POWERUP_COLORS[pu.type],
            backgroundColor: POWERUP_COLORS[pu.type] + '33',
            shadowColor: POWERUP_COLORS[pu.type],
          }]}>
            <Text style={[s.powerupLabel, { color: POWERUP_COLORS[pu.type] }]}>{POWERUP_LABELS[pu.type]}</Text>
          </View>
        ))}

        {/* Balls */}
        {ballVisuals.map((bv, i) => bv.active ? (
          <Animated.View key={i} style={[s.ball, {
            width: bv.radius * 2, height: bv.radius * 2, borderRadius: bv.radius,
            backgroundColor: bv.color, shadowColor: bv.color,
            transform: [
              { translateX: Animated.subtract(ballAnims[i].x, bv.radius) },
              { translateY: Animated.subtract(ballAnims[i].y, bv.radius) },
            ],
          }]} />
        ) : null)}

        {/* Bottom paddle (P0) */}
        <Animated.View style={[s.paddle, {
          width: getPaddleLen(gs.players[BOTTOM]),
          height: PADDLE_THICKNESS,
          bottom: WALL_MARGIN - PADDLE_THICKNESS / 2,
          backgroundColor: shieldActive[0] ? '#FFD700' : gs.players[BOTTOM].color,
          shadowColor: gs.players[BOTTOM].color,
          left: 0,
          transform: [{ translateX: Animated.subtract(paddleAnims[BOTTOM], getPaddleLen(gs.players[BOTTOM]) / 2) }],
        }]} />

        {/* Top paddle (P1) */}
        {!gs.players[TOP].isEliminated && (
          <Animated.View style={[s.paddle, {
            width: getPaddleLen(gs.players[TOP]),
            height: PADDLE_THICKNESS,
            top: WALL_MARGIN - PADDLE_THICKNESS / 2,
            backgroundColor: gs.players[TOP].color,
            shadowColor: gs.players[TOP].color,
            left: 0,
            transform: [{ translateX: Animated.subtract(paddleAnims[TOP], getPaddleLen(gs.players[TOP]) / 2) }],
          }]} />
        )}

        {/* Left paddle (P2) */}
        {!gs.players[LEFT].isEliminated && gameMode !== 'duel' && (
          <Animated.View style={[s.paddleV, {
            width: PADDLE_THICKNESS,
            height: getPaddleLen(gs.players[LEFT]),
            left: WALL_MARGIN - PADDLE_THICKNESS / 2,
            backgroundColor: gs.players[LEFT].color,
            shadowColor: gs.players[LEFT].color,
            top: 0,
            transform: [{ translateY: Animated.subtract(paddleAnims[LEFT], getPaddleLen(gs.players[LEFT]) / 2) }],
          }]} />
        )}

        {/* Right paddle (P3) */}
        {!gs.players[RIGHT].isEliminated && gameMode !== 'duel' && (
          <Animated.View style={[s.paddleV, {
            width: PADDLE_THICKNESS,
            height: getPaddleLen(gs.players[RIGHT]),
            right: WALL_MARGIN - PADDLE_THICKNESS / 2,
            backgroundColor: gs.players[RIGHT].color,
            shadowColor: gs.players[RIGHT].color,
            top: 0,
            transform: [{ translateY: Animated.subtract(paddleAnims[RIGHT], getPaddleLen(gs.players[RIGHT]) / 2) }],
          }]} />
        )}

        {/* Lives — hearts row */}
        {([TOP, BOTTOM, LEFT, RIGHT] as const).map(pid => {
          const player = gs.players[pid];
          const lives = livesState[pid] ?? INITIAL_LIVES;
          const isV = pid === LEFT || pid === RIGHT;
          const posStyle =
            pid === TOP ? { top: 4, left: CX - 30 } :
            pid === BOTTOM ? { bottom: 4, left: CX - 30 } :
            pid === LEFT ? { left: 4, top: CY - 14 } :
            { right: 4, top: CY - 14 };
          return (
            <View key={pid} style={[{ position: 'absolute' }, posStyle, isV ? s.livesV : s.livesH]}>
              {Array.from({ length: Math.max(lives, 0) }).map((_, i) => (
                <View key={i} style={[s.heart, {
                  backgroundColor: eliminatedState[pid] ? '#333' : player.color,
                  shadowColor: player.color,
                }]} />
              ))}
              {eliminatedState[pid] && (
                <Text style={[s.elimX, { color: player.color + '88' }]}>✕</Text>
              )}
            </View>
          );
        })}

        {/* Game mode badge */}
        {(gameMode === 'triangle' || gameMode === 'duel') && (
          <View style={[s.modeBadge, {
            backgroundColor: gameMode === 'duel' ? '#FF475733' : '#00FF8833',
            borderColor: gameMode === 'duel' ? '#FF4757' : '#00FF88',
          }]}>
            <Text style={[s.modeBadgeText, { color: gameMode === 'duel' ? '#FF4757' : '#00FF88' }]}>
              {gameMode === 'duel' ? '⚔ 1v1' : '▲ 3P'}
            </Text>
          </View>
        )}

        {/* Announcer */}
        {announcer !== '' && (
          <View style={[s.announcerWrap, { pointerEvents: 'none' } as never]}>
            <Text style={s.announcerText}>{announcer}</Text>
          </View>
        )}

        {/* Countdown overlay */}
        {gamePhase === 'countdown' && (
          <View style={[s.countdownOverlay, { pointerEvents: 'none' } as never]}>
            <Text style={s.countdownText}>{countdown > 0 ? String(countdown) : 'GO!'}</Text>
            <Text style={s.countdownSub}>SWIPE TO MOVE YOUR PADDLE</Text>
          </View>
        )}

        {/* Arena border */}
        <View style={[s.border, { width: arenaSize, height: arenaSize, pointerEvents: 'none' } as never]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  powerup: {
    position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 4,
  },
  powerupLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5 },
  ball: {
    position: 'absolute', top: 0, left: 0,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 12, elevation: 6,
  },
  paddle: {
    position: 'absolute', borderRadius: 7,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 14, elevation: 5,
  },
  paddleV: {
    position: 'absolute', borderRadius: 7,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 14, elevation: 5,
  },
  livesH: { flexDirection: 'row', gap: 3 },
  livesV: { flexDirection: 'column', gap: 3 },
  heart: {
    width: 7, height: 7, borderRadius: 3.5,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4,
  },
  elimX: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  modeBadge: {
    position: 'absolute', top: 6, right: 6,
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  modeBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5 },
  announcerWrap: {
    position: 'absolute', top: '42%', left: 0, right: 0,
    alignItems: 'center',
  },
  announcerText: {
    color: '#FFD700', fontSize: 19, fontFamily: 'Inter_700Bold', letterSpacing: 1.5,
    textShadowColor: '#FFD700', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14,
  },
  countdownOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  countdownText: {
    color: '#FFD700', fontSize: 78, fontFamily: 'Inter_700Bold',
    textShadowColor: '#FFD700', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 28,
  },
  countdownSub: { color: '#FFFFFF88', fontFamily: 'Inter_500Medium', fontSize: 13, letterSpacing: 1 },
  border: { position: 'absolute', top: 0, left: 0, borderWidth: 2, borderColor: '#FFFFFF25', borderRadius: 6 },
});
