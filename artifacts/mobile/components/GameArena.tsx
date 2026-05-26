import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';

const WALL_MARGIN = 22;
const PADDLE_LENGTH = 90;
const PADDLE_THICKNESS = 14;
const MAX_BALLS = 6;
const BALL_SPAWN_FRAMES = 600;
const POWERUP_SPAWN_FRAMES = 380;
const INITIAL_SPEED = 5.2;
const MAX_SPEED = 12;
const BOTTOM = 0;
const TOP = 1;
const LEFT = 2;
const RIGHT = 3;

type BallType = 'normal' | 'fire' | 'heavy' | 'tiny' | 'gold';
type PowerUpType = 'shield' | 'speed' | 'shrink' | 'extralife' | 'multiball';
type GamePhase = 'countdown' | 'playing' | 'gameover';

interface BallRef {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
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
  x: number;
  y: number;
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
  phase: GamePhase;
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
}

const POWERUP_COLORS: Record<PowerUpType, string> = {
  shield: '#FFD700',
  speed: '#00FF88',
  shrink: '#FF4757',
  extralife: '#FF69B4',
  multiball: '#00E5FF',
};

const POWERUP_LABELS: Record<PowerUpType, string> = {
  shield: 'SHD',
  speed: 'SPD',
  shrink: 'SHK',
  extralife: '+1',
  multiball: 'MLB',
};

function clampPaddle(val: number, len: number, arenaSize: number): number {
  return Math.max(len / 2, Math.min(arenaSize - len / 2, val));
}

export function GameArena({
  arenaSize,
  playerName,
  playerColor,
  playerGlowColor,
  botNames,
  botRanks,
  onGameOver,
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

  const [livesState, setLivesState] = useState<number[]>([3, 3, 3, 3]);
  const [eliminatedState, setEliminatedState] = useState<boolean[]>([false, false, false, false]);
  const [gamePhase, setGamePhase] = useState<GamePhase>('countdown');
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
  useEffect(() => { onGameOverRef.current = onGameOver; }, [onGameOver]);

  const gameStateRef = useRef<GameStateRef>({
    balls: [],
    players: [
      {
        id: BOTTOM, name: playerName, paddleCenter: arenaSize / 2, prevPaddleCenter: arenaSize / 2,
        lives: 3, isBot: false, isEliminated: false, score: 0, color: playerColor,
        glowColor: playerGlowColor, rank: 'Gold', botSpeed: 0, botAccuracy: 1,
        hasShield: false, speedBoostFrames: 0, shrunkFrames: 0,
      },
      {
        id: TOP, name: botNames[0] ?? 'Blaze_99', paddleCenter: arenaSize / 2, prevPaddleCenter: arenaSize / 2,
        lives: 3, isBot: true, isEliminated: false, score: 0, color: '#FF4757',
        glowColor: '#FF475544', rank: botRanks[0] ?? 'Platinum', botSpeed: 4.6, botAccuracy: 0.88,
        hasShield: false, speedBoostFrames: 0, shrunkFrames: 0,
      },
      {
        id: LEFT, name: botNames[1] ?? 'IceQueen', paddleCenter: arenaSize / 2, prevPaddleCenter: arenaSize / 2,
        lives: 3, isBot: true, isEliminated: false, score: 0, color: '#00BFFF',
        glowColor: '#00BFFF44', rank: botRanks[1] ?? 'Diamond', botSpeed: 5.2, botAccuracy: 0.91,
        hasShield: false, speedBoostFrames: 0, shrunkFrames: 0,
      },
      {
        id: RIGHT, name: botNames[2] ?? 'Venom_X', paddleCenter: arenaSize / 2, prevPaddleCenter: arenaSize / 2,
        lives: 3, isBot: true, isEliminated: false, score: 0, color: '#00FF88',
        glowColor: '#00FF8844', rank: botRanks[2] ?? 'Master', botSpeed: 5.8, botAccuracy: 0.94,
        hasShield: false, speedBoostFrames: 0, shrunkFrames: 0,
      },
    ],
    powerups: [],
    frame: 0,
    nextBallFrame: 8,
    nextPowerupFrame: POWERUP_SPAWN_FRAMES,
    speedMultiplier: 1.0,
    winner: null,
    phase: 'countdown',
  });

  function showAnnouncer(text: string) {
    if (announcerTimer.current) clearTimeout(announcerTimer.current);
    setAnnouncer(text);
    announcerTimer.current = setTimeout(() => setAnnouncer(''), 1800);
  }

  function getPaddleLen(player: PlayerRef): number {
    return player.shrunkFrames > 0 ? PADDLE_LENGTH * 0.52 : PADDLE_LENGTH;
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
      case 'heavy': radius = 15; color = '#9B59B6'; break;
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
    const margin = 70;
    const x = margin + Math.random() * (size - margin * 2);
    const y = margin + Math.random() * (size - margin * 2);
    const pu: PowerUpRef = { id: gs.frame, x, y, type, active: true };
    gs.powerups = gs.powerups.filter(p => p.active).concat(pu).slice(-4);
    setPowerUpsUI([...gs.powerups]);
  }

  function handleGoal(gs: GameStateRef, playerIdx: number, size: number) {
    const player = gs.players[playerIdx];
    if (player.isEliminated) return;
    if (player.hasShield) {
      player.hasShield = false;
      setShieldActive(prev => { const n = [...prev]; n[playerIdx] = false; return n; });
      showAnnouncer('SHIELD BLOCKED!');
      return;
    }
    player.lives = Math.max(0, player.lives - 1);
    if (playerIdx === BOTTOM) goalsAgainstRef.current += 1;
    setLivesState(gs.players.map(p => p.lives));
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const msgs = ['GOAL!', 'POINT SCORED!', 'NICE SHOT!'];
    showAnnouncer(msgs[Math.floor(Math.random() * msgs.length)]);

    if (player.lives <= 0) {
      player.isEliminated = true;
      if (playerIdx !== BOTTOM) finishPositionRef.current = Math.max(2, finishPositionRef.current - 1);
      setEliminatedState(gs.players.map(p => p.isEliminated));
      showAnnouncer(playerIdx === BOTTOM ? 'YOU ARE ELIMINATED!' : `${player.name} ELIMINATED!`);

      const alive = gs.players.filter(p => !p.isEliminated);
      if (alive.length === 1) {
        gs.winner = alive[0].id;
        gs.phase = 'gameover';
        isRunningRef.current = false;
        setGamePhase('gameover');
        const won = gs.winner === BOTTOM;
        const xp = won ? 200 + deflectionsRef.current * 2 : 40 + deflectionsRef.current;
        const coins = won ? 60 : 15;
        setTimeout(() => {
          onGameOverRef.current({
            won,
            position: won ? 1 : finishPositionRef.current,
            deflections: deflectionsRef.current,
            goalsAgainst: goalsAgainstRef.current,
            xpEarned: xp,
            coinsEarned: coins,
          });
        }, 1400);
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
        threat = ball.vy < 0 ? 5000 - t * 10 : -(ball.y);
        pos = Math.max(PADDLE_LENGTH / 2, Math.min(size - PADDLE_LENGTH / 2,
          ball.vy < 0 ? ball.x + ball.vx * t : ball.x));
      } else if (playerId === LEFT) {
        const t = ball.vx < 0 ? (ball.x - WALL_MARGIN) / Math.abs(ball.vx) : 9999;
        threat = ball.vx < 0 ? 5000 - t * 10 : -(ball.x);
        pos = Math.max(PADDLE_LENGTH / 2, Math.min(size - PADDLE_LENGTH / 2,
          ball.vx < 0 ? ball.y + ball.vy * t : ball.y));
      } else {
        const t = ball.vx > 0 ? (size - WALL_MARGIN - ball.x) / Math.abs(ball.vx) : 9999;
        threat = ball.vx > 0 ? 5000 - t * 10 : -(size - ball.x);
        pos = Math.max(PADDLE_LENGTH / 2, Math.min(size - PADDLE_LENGTH / 2,
          ball.vx > 0 ? ball.y + ball.vy * t : ball.y));
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

    for (let i = 0; i < gs.balls.length; i++) {
      const ball = gs.balls[i];
      if (!ball.active) continue;
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Bottom wall
      if (ball.y + ball.radius >= GYB) {
        const p = gs.players[BOTTOM];
        const pLen = getPaddleLen(p);
        const hit = !p.isEliminated && ball.x >= p.paddleCenter - pLen / 2 && ball.x <= p.paddleCenter + pLen / 2;
        if (hit) {
          const pv = p.paddleCenter - p.prevPaddleCenter;
          ball.vy = -(Math.abs(ball.vy) + 0.1);
          ball.vx += pv * 0.38;
          p.score += 1;
          deflectionsRef.current += 1;
        } else {
          ball.vy = -Math.abs(ball.vy);
          handleGoal(gs, BOTTOM, size);
        }
        ball.y = GYB - ball.radius - 1;
      }
      // Top wall
      if (ball.y - ball.radius <= GYT) {
        const p = gs.players[TOP];
        const pLen = getPaddleLen(p);
        const hit = !p.isEliminated && ball.x >= p.paddleCenter - pLen / 2 && ball.x <= p.paddleCenter + pLen / 2;
        if (hit) {
          const pv = p.paddleCenter - p.prevPaddleCenter;
          ball.vy = Math.abs(ball.vy) + 0.1;
          ball.vx += pv * 0.38;
          p.score += 1;
        } else {
          ball.vy = Math.abs(ball.vy);
          handleGoal(gs, TOP, size);
        }
        ball.y = GYT + ball.radius + 1;
      }
      // Left wall
      if (ball.x - ball.radius <= GXL) {
        const p = gs.players[LEFT];
        const pLen = getPaddleLen(p);
        const hit = !p.isEliminated && ball.y >= p.paddleCenter - pLen / 2 && ball.y <= p.paddleCenter + pLen / 2;
        if (hit) {
          const pv = p.paddleCenter - p.prevPaddleCenter;
          ball.vx = Math.abs(ball.vx) + 0.1;
          ball.vy += pv * 0.38;
          p.score += 1;
        } else {
          ball.vx = Math.abs(ball.vx);
          handleGoal(gs, LEFT, size);
        }
        ball.x = GXL + ball.radius + 1;
      }
      // Right wall
      if (ball.x + ball.radius >= GXR) {
        const p = gs.players[RIGHT];
        const pLen = getPaddleLen(p);
        const hit = !p.isEliminated && ball.y >= p.paddleCenter - pLen / 2 && ball.y <= p.paddleCenter + pLen / 2;
        if (hit) {
          const pv = p.paddleCenter - p.prevPaddleCenter;
          ball.vx = -(Math.abs(ball.vx) + 0.1);
          ball.vy += pv * 0.38;
          p.score += 1;
        } else {
          ball.vx = -Math.abs(ball.vx);
          handleGoal(gs, RIGHT, size);
        }
        ball.x = GXR - ball.radius - 1;
      }

      // Speed cap
      const spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      const maxSpd = gs.speedMultiplier * MAX_SPEED;
      if (spd > maxSpd) { ball.vx = (ball.vx / spd) * maxSpd; ball.vy = (ball.vy / spd) * maxSpd; }
      ballAnims[i]?.setValue({ x: ball.x, y: ball.y });
    }

    // Bots (every 3 frames)
    if (gs.frame % 3 === 0) {
      for (const pid of [TOP, LEFT, RIGHT]) {
        const bot = gs.players[pid];
        if (bot.isEliminated) continue;
        const target = getBotTarget(pid, gs.balls, size);
        if (target !== null) {
          const inaccuracy = (1 - bot.botAccuracy) * 25 * (Math.random() - 0.5);
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

    // New ball spawn
    if (gs.frame >= gs.nextBallFrame && gs.balls.filter(b => b.active).length < MAX_BALLS) {
      spawnBall(gs, size);
      gs.nextBallFrame = gs.frame + BALL_SPAWN_FRAMES;
      gs.speedMultiplier = Math.min(gs.speedMultiplier + 0.1, 2.2);
    }

    // Power-up spawn
    if (gs.frame >= gs.nextPowerupFrame && gs.powerups.filter(p => p.active).length < 3) {
      spawnPowerup(gs, size);
      gs.nextPowerupFrame = gs.frame + POWERUP_SPAWN_FRAMES + Math.floor(Math.random() * 120);
    }

    // Power-up collection by human
    if (!p0.isEliminated) {
      for (const pu of gs.powerups) {
        if (!pu.active) continue;
        const dx = pu.x - p0.paddleCenter;
        const dy = pu.y - (size - WALL_MARGIN);
        if (Math.sqrt(dx * dx + dy * dy) < 48) {
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
        showAnnouncer('SHIELD ACTIVATED!');
        break;
      case 'speed':
        player.speedBoostFrames = 360;
        showAnnouncer('SPEED BOOST!');
        break;
      case 'shrink':
        for (const p of gs.players) { if (p.id !== player.id) p.shrunkFrames = 420; }
        showAnnouncer('OPPONENTS SHRUNK!');
        break;
      case 'extralife':
        player.lives = Math.min(player.lives + 1, 5);
        setLivesState(gs.players.map(p => p.lives));
        showAnnouncer('EXTRA LIFE!');
        break;
      case 'multiball':
        spawnBall(gs, size);
        showAnnouncer('MULTIBALL!');
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

  const gs = gameStateRef.current;

  return (
    <View style={{ width: arenaSize, height: arenaSize, overflow: 'hidden', borderRadius: 6 }}>
      <LinearGradient colors={['#060614', '#0A0A1E', '#060614']} style={StyleSheet.absoluteFill} />

      {/* Grid lines */}
      <View style={[s.gridH, { top: arenaSize / 2 }]} />
      <View style={[s.gridV, { left: arenaSize / 2 }]} />
      <View style={[s.centerCircle, {
        width: arenaSize * 0.3, height: arenaSize * 0.3,
        borderRadius: arenaSize * 0.15,
        left: arenaSize * 0.35, top: arenaSize * 0.35,
      }]} />

      {/* Player zone glows */}
      {gs.players.map((player, idx) => {
        if (player.isEliminated) return null;
        const zs: Record<string, number> = {};
        if (idx === BOTTOM) { zs.bottom = 0; zs.left = 0; zs.right = 0; zs.height = WALL_MARGIN + 4; }
        else if (idx === TOP) { zs.top = 0; zs.left = 0; zs.right = 0; zs.height = WALL_MARGIN + 4; }
        else if (idx === LEFT) { zs.left = 0; zs.top = 0; zs.bottom = 0; zs.width = WALL_MARGIN + 4; }
        else { zs.right = 0; zs.top = 0; zs.bottom = 0; zs.width = WALL_MARGIN + 4; }
        return <View key={idx} style={[s.zoneGlow, zs as never, { backgroundColor: player.glowColor }]} />;
      })}

      <View style={{ width: arenaSize, height: arenaSize, position: 'absolute' }} {...panResponder.panHandlers}>
        {/* Power-ups */}
        {powerUpsUI.filter(p => p.active).map((pu) => (
          <View key={pu.id} style={[s.powerup, {
            left: pu.x - 17, top: pu.y - 17,
            borderColor: POWERUP_COLORS[pu.type],
            backgroundColor: POWERUP_COLORS[pu.type] + '22',
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

        {/* Paddles */}
        {/* Bottom (P0) */}
        <Animated.View style={[s.paddle, {
          width: getPaddleLen(gs.players[0]),
          height: PADDLE_THICKNESS,
          bottom: WALL_MARGIN - PADDLE_THICKNESS / 2,
          backgroundColor: shieldActive[0] ? '#FFD700' : gs.players[0].color,
          shadowColor: gs.players[0].color,
          left: 0,
          transform: [{ translateX: Animated.subtract(paddleAnims[BOTTOM], getPaddleLen(gs.players[0]) / 2) }],
        }]} />

        {/* Top (P1) */}
        {!gs.players[1].isEliminated && (
          <Animated.View style={[s.paddle, {
            width: getPaddleLen(gs.players[1]),
            height: PADDLE_THICKNESS,
            top: WALL_MARGIN - PADDLE_THICKNESS / 2,
            backgroundColor: gs.players[1].color,
            shadowColor: gs.players[1].color,
            left: 0,
            transform: [{ translateX: Animated.subtract(paddleAnims[TOP], getPaddleLen(gs.players[1]) / 2) }],
          }]} />
        )}

        {/* Left (P2) */}
        {!gs.players[2].isEliminated && (
          <Animated.View style={[s.paddleV, {
            width: PADDLE_THICKNESS,
            height: getPaddleLen(gs.players[2]),
            left: WALL_MARGIN - PADDLE_THICKNESS / 2,
            backgroundColor: gs.players[2].color,
            shadowColor: gs.players[2].color,
            top: 0,
            transform: [{ translateY: Animated.subtract(paddleAnims[LEFT], getPaddleLen(gs.players[2]) / 2) }],
          }]} />
        )}

        {/* Right (P3) */}
        {!gs.players[3].isEliminated && (
          <Animated.View style={[s.paddleV, {
            width: PADDLE_THICKNESS,
            height: getPaddleLen(gs.players[3]),
            right: WALL_MARGIN - PADDLE_THICKNESS / 2,
            backgroundColor: gs.players[3].color,
            shadowColor: gs.players[3].color,
            top: 0,
            transform: [{ translateY: Animated.subtract(paddleAnims[RIGHT], getPaddleLen(gs.players[3]) / 2) }],
          }]} />
        )}

        {/* Lives - corners */}
        <View style={[s.lives, { top: 4, left: arenaSize / 2 - 24 }]}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.lifeHeart, {
              backgroundColor: i < livesState[TOP] && !eliminatedState[TOP] ? gs.players[TOP].color : '#2a2a3e'
            }]} />
          ))}
        </View>
        <View style={[s.lives, { bottom: 4, left: arenaSize / 2 - 24 }]}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.lifeHeart, {
              backgroundColor: i < livesState[BOTTOM] && !eliminatedState[BOTTOM] ? gs.players[BOTTOM].color : '#2a2a3e'
            }]} />
          ))}
        </View>
        <View style={[s.livesV, { left: 4, top: arenaSize / 2 - 12 }]}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.lifeHeart, {
              backgroundColor: i < livesState[LEFT] && !eliminatedState[LEFT] ? gs.players[LEFT].color : '#2a2a3e'
            }]} />
          ))}
        </View>
        <View style={[s.livesV, { right: 4, top: arenaSize / 2 - 12 }]}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.lifeHeart, {
              backgroundColor: i < livesState[RIGHT] && !eliminatedState[RIGHT] ? gs.players[RIGHT].color : '#2a2a3e'
            }]} />
          ))}
        </View>

        {/* Eliminated X markers */}
        {[TOP, LEFT, RIGHT].map(idx => eliminatedState[idx] && (
          <View key={idx} style={[s.elim, idx === TOP && { top: 6, left: arenaSize / 2 - 8 }, idx === LEFT && { left: 6, top: arenaSize / 2 - 8 }, idx === RIGHT && { right: 6, top: arenaSize / 2 - 8 }]}>
            <Text style={s.elimText}>✕</Text>
          </View>
        ))}

        {/* Announcer */}
        {announcer !== '' && (
          <View style={[s.announcerWrap, { pointerEvents: 'none' } as never]}>
            <Text style={s.announcerText}>{announcer}</Text>
          </View>
        )}

        {/* Countdown */}
        {gamePhase === 'countdown' && (
          <View style={[s.countdownOverlay, { pointerEvents: 'none' } as never]}>
            <Text style={s.countdownText}>{countdown > 0 ? String(countdown) : 'GO!'}</Text>
          </View>
        )}

        {/* Border glow */}
        <View style={[s.border, { width: arenaSize, height: arenaSize, pointerEvents: 'none' } as never]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#FFFFFF08' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#FFFFFF08' },
  centerCircle: { position: 'absolute', borderWidth: 1, borderColor: '#FFFFFF0D', backgroundColor: 'transparent' },
  zoneGlow: { position: 'absolute', opacity: 0.45 },
  powerup: {
    position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 8, elevation: 4,
  },
  powerupLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5 },
  ball: {
    position: 'absolute', top: 0, left: 0,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 6,
  },
  paddle: {
    position: 'absolute', borderRadius: 7,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 12, elevation: 5,
  },
  paddleV: {
    position: 'absolute', borderRadius: 7,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 12, elevation: 5,
  },
  lives: { position: 'absolute', flexDirection: 'row', gap: 4 },
  livesV: { position: 'absolute', flexDirection: 'column', gap: 4 },
  lifeHeart: { width: 7, height: 7, borderRadius: 3.5 },
  elim: { position: 'absolute' },
  elimText: { color: '#FF4757', fontSize: 14, fontFamily: 'Inter_700Bold' },
  announcerWrap: {
    position: 'absolute', top: '42%', left: 0, right: 0,
    alignItems: 'center', pointerEvents: 'none',
  },
  announcerText: {
    color: '#FFD700', fontSize: 20, fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
    textShadowColor: '#FFD700', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12,
  },
  countdownOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#00000099', alignItems: 'center', justifyContent: 'center',
  },
  countdownText: {
    color: '#FFD700', fontSize: 72, fontFamily: 'Inter_700Bold',
    textShadowColor: '#FFD700', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24,
  },
  border: { position: 'absolute', top: 0, left: 0, borderWidth: 1.5, borderColor: '#FFFFFF18', borderRadius: 6 },
});
