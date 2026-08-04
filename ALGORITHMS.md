# GoldRush Arena -- Game Algorithms Documentation

> **Version:** 1.0.0  
> **Last Updated:** July 2026  
> **Purpose:** Comprehensive reference for all game algorithms, formulas, and systems

---

## Table of Contents

1. [Game Loop & Physics Engine](#1-game-loop--physics-engine)
2. [Collision Detection](#2-collision-detection)
3. [Ball Physics](#3-ball-physics)
4. [Bot AI System](#4-bot-ai-system)
5. [Arena Mode Transitions](#5-arena-mode-transitions)
6. [Super Ability System](#6-super-ability-system)
7. [Power-Up System](#7-power-up-system)
8. [XP & Progression](#8-xp--progression)
9. [Rank System](#9-rank-system)
10. [Competitive Level (Halo-Style)](#10-competitive-level-halo-style)
11. [Relic System](#11-relic-system)
12. [Reward Calculations](#12-reward-calculations)
13. [Event System](#13-event-system)
14. [Daily Streak](#14-daily-streak)
15. [Complexity Analysis](#15-complexity-analysis)

---

## 1. Game Loop & Physics Engine

### Frame-Rate Independent Game Loop

The game runs at a target of **60 FPS** using `requestAnimationFrame`. To ensure consistent physics regardless of frame rate:

```
dtScale = min(deltaTime / 16.667, 2.0)
```

Where:
- `deltaTime` = current timestamp - previous timestamp (in milliseconds)
- `16.667ms` = duration of one frame at 60 FPS
- **Cap at 2.0x** prevents ball tunneling through walls on very slow frames

### Game State Update Order (per frame)

```
1. Update ball positions (x += vx * dtScale, y += vy * dtScale)
2. Apply super ability effects (Slow Field, etc.)
3. Check wall collisions (bottom -> top -> left -> right)
4. Handle goal detection and elimination
5. Update bot AI (every 3rd frame for performance)
6. Decrement active timers (speed boost, shrunk, supers)
7. Spawn new balls (if frame >= nextBallFrame)
8. Spawn power-ups (if frame >= nextPowerupFrame)
9. Update relic effects (magnet attraction)
10. Check power-up collection
11. Update UI state (every 2-3 frames for performance)
```

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `WALL_MARGIN` | 24px | Distance from edge to paddle wall |
| `PADDLE_LENGTH` | 88px | Default paddle width |
| `PADDLE_THICKNESS` | 14px | Paddle height |
| `MAX_BALLS` | 8 | Maximum simultaneous balls |
| `BALL_SPAWN_FRAMES` | 300 | Frames between ball spawns (5s at 60fps) |
| `SUPER_MAX_CHARGE` | 10 | Deflections needed to charge super |
| `SUPER_DURATION_FRAMES` | 180 | Super active duration (3s at 60fps) |
| `POWERUP_SPAWN_FRAMES` | 420 | Frames between power-up spawns (7s) |
| `INITIAL_LIVES` | 5 | Starting lives per player |
| `INITIAL_SPEED` | 5.2 | Base ball speed |
| `MAX_SPEED` | 14 | Maximum ball speed |
| `DUEL_TIME_LIMIT` | 60s | Sudden death timer for 1v1 |

---

## 2. Collision Detection

### Paddle-Ball Collision

For each wall, collision is detected when the ball's edge reaches the wall line AND the ball's perpendicular coordinate overlaps the paddle's center:

```
// Bottom wall example
if (ball.y + ball.radius >= goalY) {
    paddleHalfWidth = getPaddleLen(player) / 2
    if (ball.x >= paddleCenter - paddleHalfWidth && 
        ball.x <= paddleCenter + paddleHalfWidth) {
        // HIT: Deflect ball
    } else {
        // MISS: Goal scored
    }
}
```

### Deflection Physics

When a ball hits a paddle, its velocity is modified by:

```
// Base deflection (reverses perpendicular velocity + small boost)
ball.vy = -(abs(ball.vy) + 0.12) * deflectBoost

// Paddle velocity influence (adds English/spin)
ball.vx += paddleVelocity * 0.4
```

Where `deflectBoost` is:
- Default: 1.0
- With Aftershock relic: up to 1.35 (level-dependent)

### Six-Player Mode Collision

In 6-player mode, the top and bottom walls are split into left/right halves:

```
midX = arenaSize / 2

// Bottom-left defender (player 0)
if (ball.x < midX) defender = players[BOTTOM]
else               defender = players[BOTTOM_R]

// Paddle clamping for half-wall
paddleCenter = clamp(paddleCenter, 
    wallMargin + paddleLen/2, 
    midX - paddleLen/2)  // or arenaSize - wallMargin for right half
```

---

## 3. Ball Physics

### Ball Types & Properties

| Type | Radius | Color | Special |
|------|--------|-------|---------|
| Normal | 10px | #FFFFFF | Standard |
| Fire | 10px | #FF6B35 | Visual only |
| Heavy | 15px | #BF5FFF | Larger hit box |
| Tiny | 6px | #00E5FF | Smaller hit box |

### Speed System

```
// Initial speed for each new ball
speed = INITIAL_SPEED * speedMultiplier * startSpeedMult

// Speed multiplier increases over time
speedMultiplier += 0.07 per ball spawn (capped at 2.0)

// Velocity cap
if (sqrt(vx^2 + vy^2) > MAX_SPEED * speedMultiplier) {
    scale = (MAX_SPEED * speedMultiplier) / sqrt(vx^2 + vy^2)
    vx *= scale
    vy *= scale
}
```

### Time-Warp Slow Start

If the player has the Time Warp relic:

```
// For first N frames (360 at level 1, up to 480 at level 10)
if (frame < slowStartFrames) {
    ball.vx *= 0.65
    ball.vy *= 0.65
}
```

---

## 4. Bot AI System

### Threat-Based Targeting

Bots use a **threat scoring system** to decide which ball to track:

```python
def get_bot_target(side, balls, arena_size):
    best_position = arena_size / 2
    highest_threat = -infinity
    
    for ball in active_balls:
        # Time until ball reaches this wall
        if side == 'top':
            t = (ball.y - WALL_MARGIN) / abs(ball.vy) if ball.vy < 0 else 9999
            threat = 5000 - t * 10 if ball.vy < 0 else -ball.y
            predicted_x = ball.x + ball.vx * t
            
        elif side == 'bottom':
            t = (arena_size - WALL_MARGIN - ball.y) / abs(ball.vy) if ball.vy > 0 else 9999
            threat = 5000 - t * 10 if ball.vy > 0 else -(arena_size - ball.y)
            predicted_x = ball.x + ball.vx * t
            
        elif side == 'left':
            t = (ball.x - WALL_MARGIN) / abs(ball.vx) if ball.vx < 0 else 9999
            threat = 5000 - t * 10 if ball.vx < 0 else -ball.x
            predicted_y = ball.y + ball.vy * t
            
        elif side == 'right':
            t = (arena_size - WALL_MARGIN - ball.x) / abs(ball.vx) if ball.vx > 0 else 9999
            threat = 5000 - t * 10 if ball.vx > 0 else -(arena_size - ball.x)
            predicted_y = ball.y + ball.vy * t
        
        if threat > highest_threat:
            highest_threat = threat
            best_position = clamp(predicted_position, paddle_length, arena_size)
    
    return best_position
```

### Bot Movement

```python
def move_bot(bot, target, dt_scale):
    # Add controlled inaccuracy based on bot's accuracy stat
    inaccuracy = (1 - bot.botAccuracy) * 22 * (random() - 0.5)
    if difficulty == 'easy':
        inaccuracy *= 2.2
    
    adjusted_target = target + inaccuracy
    
    # Calculate movement
    speed = bot.botSpeed * bot.paddleSpeedMult
    if bot.speedBoostFrames > 0:
        speed *= 1.5
    if difficulty == 'easy':
        speed *= 0.62
    
    diff = adjusted_target - bot.paddleCenter
    move = sign(diff) * min(abs(diff), speed * dt_scale)
    
    # Update position
    bot.prevPaddleCenter = bot.paddleCenter
    bot.paddleCenter = clamp(bot.paddleCenter + move, 
        paddle_length/2, arena_size - paddle_length/2)
```

### Bot Difficulty Parameters

| Bot | Base Speed | Base Accuracy | Rank |
|-----|-----------|---------------|------|
| Bot 1 (Blaze_99) | 4.8 | 0.86 | Gold |
| Bot 2 (IceQueen) | 5.2 | 0.88 | Platinum |
| Bot 3 (Venom_X) | 5.6 | 0.91 | Diamond |
| Bot 4 (ShadowFox) | 4.6 | 0.84 | Master 1 |
| Bot 5 (CyberWolf) | 5.0 | 0.87 | Grandmaster |

### Skill Scaling

Bot stats are scaled based on the human player's rank (`botSkill` = 0.0 to 1.0):

```python
scaled_speed = base_speed * (0.7 + 0.4 * botSkill)
scaled_accuracy = min(0.97, base_accuracy * (0.85 + 0.2 * botSkill))
```

### Bot Relic Assignment

Bots are assigned relics based on their rank:

```python
def relic_for_rank(rank_name, bot_id):
    rank_index = get_rank_index(rank_name)
    available_relics = [r for r in RELICS if r.unlockRankIndex <= rank_index]
    if not available_relics:
        return null
    return available_relics[bot_id % len(available_relics)]
```

---

## 5. Arena Mode Transitions

The arena dynamically changes shape as players are eliminated:

```python
def update_game_mode(alive_player_count):
    if alive_count >= 4:
        return 'square'      # 4 walls active
    elif alive_count == 3:
        return 'triangle'    # 3 walls active (triangle overlay)
    else:
        return 'duel'        # 1v1 final battle
```

### Duel Mode Setup

When transitioning to duel:
1. Human player always defends the **bottom** wall
2. Surviving bot moves to the **top** wall
3. Side walls become solid bounce surfaces
4. Bot speed and accuracy are boosted:
   ```
   duel_bot.botSpeed = max(duel_bot.botSpeed, 6.5)
   duel_bot.botAccuracy = min(duel_bot.botAccuracy + 0.04, 0.94)
   ```
5. 60-second sudden death timer starts

### Sudden Death Resolution

If the duel timer expires:
```python
if bottom_player.lives > top_player.lives:
    bottom_player wins
elif top_player.lives > bottom_player.lives:
    top_player wins
else:  # tie
    bottom_player wins (human advantage)
```

---

## 6. Super Ability System

### Super Types

| ID | Name | Effect | Unlock Level |
|----|------|--------|-------------|
| 1 | RAMPART (Iron Wall) | Block all goals for 3 seconds | 5 |
| 2 | DEAD ZONE (Slow Field) | Cap incoming ball speed to 2.5 | 10 |
| 3 | SHATTER (Banish) | Destroy ball that would score | 15 |

### Charging

- Each successful deflection adds +1 charge
- Max charge: 10
- Charge persists across the match

### Bot Super Activation

Bots activate supers with a randomized delay after full charge:

```python
if bot_charge >= 10 and bot_super_not_active:
    pending_delay = 30 + random(0, 60) frames  # 0.5-1.5s delay
    
# When pending reaches 0:
bot_super_active = 180 frames  # 3 seconds
```

---

## 7. Power-Up System

### Spawn Logic

```python
if frame >= next_powerup_frame and active_powerups < 3:
    spawn_powerup()
    next_powerup_frame = frame + 420 + random(0, 120)  # 7-9 seconds
```

### Power-Up Types

| Type | Effect | Duration |
|------|--------|----------|
| Shield | Blocks next goal | Until consumed |
| Speed | 1.5x paddle speed | 360 frames (6s) |
| Shrink | Halves opponent paddle size | 420 frames (7s) |
| Extra Life | +1 life (max 9) | Instant |
| Multiball | Spawns additional ball | Instant |

### Magnet Relic

With the Prospector relic, power-ups drift toward the player's paddle:

```python
for powerup in active_powerups:
    powerup.x += (player_paddle_x - powerup.x) * 0.05
    powerup.y += (player_paddle_y - powerup.y) * 0.05
```

---

## 8. XP & Progression

### XP to Level Conversion

```
level = floor((xp / 80) ^ 0.72) + 1
```

### Level to XP (inverse)

```
xp = 80 * (level - 1) ^ (1/0.72)
```

### Sample Values

| Level | XP Required | Cumulative XP |
|-------|-------------|---------------|
| 1 | 0 | 0 |
| 5 | ~1,200 | ~4,800 |
| 10 | ~4,500 | ~25,000 |
| 25 | ~22,000 | ~300,000 |
| 50 | ~72,000 | ~1,800,000 |

---

## 9. Rank System

### Rank Determination

Ranks are determined by XP thresholds in a **linear lookup table**:

```python
def get_rank_from_xp(xp):
    current_rank = RANKS[0]  # Iron
    for rank in RANKS:
        if xp >= rank.minXP:
            current_rank = rank
    return current_rank.name
```

### Rank Progress Calculation

```python
def get_rank_progress(xp):
    current = get_current_rank(xp)
    next_rank = get_next_rank(xp)
    
    if not next_rank:
        return { progress: 1.0, remaining: 0 }
    
    progress = (xp - current.minXP) / (next_rank.minXP - current.minXP)
    remaining = next_rank.minXP - xp
    return { progress, remaining }
```

### 23 Ranks with XP Thresholds

| # | Rank | Min XP | Color |
|---|------|--------|-------|
| 0 | Iron | 0 | #808080 |
| 1 | Bronze | 0 | #CD7F32 |
| 2 | Silver | 600 | #A8A9B4 |
| 3 | Gold | 1,800 | #E8C040 |
| 4 | Platinum | 4,000 | #D4ECF7 |
| 5 | Diamond | 8,000 | #B9F2FF |
| 6 | Master 1 | 14,000 | #FF8C42 |
| 7 | Master 2 | 21,000 | #F06020 |
| 8 | Master 3 | 30,000 | #E03808 |
| 9 | Legend 1 | 42,000 | #DD44FF |
| 10 | Legend 2 | 57,000 | #BB22CC |
| 11 | Legend 3 | 76,000 | #9900AA |
| 12 | Recruit | 100,000 | #8B9BAB |
| 13 | Private | 125,000 | #A8B8C8 |
| 14 | Corporal | 155,000 | #B89040 |
| 15 | Sergeant | 190,000 | #D4A030 |
| 16 | Lieutenant | 232,000 | #3A9DD4 |
| 17 | Commander | 282,000 | #9055C8 |
| 18 | General 1 | 340,000 | #E04030 |
| 19 | General 2 | 410,000 | #C02820 |
| 20 | General 3 | 490,000 | #A01808 |
| 21 | Spartan 1 | 580,000 | #FFD700 |
| 22 | Spartan 2 | 690,000 | #FFC000 |
| 23 | Spartan 3 | 820,000 | #FFB300 |

---

## 10. Competitive Level (Halo-Style)

A separate 1-50 competitive ranking system (like Halo/CS:GO):

```python
def calc_level_delta(position, match_type):
    if match_type == 'casual':
        return 0           # Casual doesn't affect rank
    if position == 1:
        return +2          # Winner gains 2 levels
    if position == 2:
        return 0           # Runner-up: no change
    return -1              # Early elimination: lose 1 level

new_level = clamp(current_level + level_delta, 1, 50)
```

### Competitive Level Tiers

| Level Range | Tier Name |
|-------------|-----------|
| 1-10 | Bronze |
| 11-20 | Silver |
| 21-30 | Gold |
| 31-40 | Platinum |
| 41-49 | Diamond |
| 50 | Onyx |

---

## 11. Relic System

### Relic Scaling (Linear Interpolation)

Numeric relic stats scale linearly from Level 1 to Level 10:

```python
def lerp_r(min_val, max_val, level):
    t = (clamp(level, 1, 10) - 1) / 9
    return min_val + (max_val - min_val) * t
```

### Relic Effects by Level

| Relic | L1 Effect | L10 Effect | Binary Unlocks |
|-------|-----------|------------|----------------|
| Ironhide | Shield | Shield | L5: Shrink immune, L10: +1 life |
| Longarm | +8% length | +28% length | -- |
| Quicksilver | +8% speed | +28% speed | -- |
| Second Wind | +1 life | +1 life | L7: +2 lives, L10: Shield |
| Prospector | Magnet | Magnet | L5: +1 life |
| Aftershock | +10% deflect | +35% deflect | -- |
| Time Warp | 3s slow | 8s slow | -- |
| Bulwark | Shield + Shrink immune | Shield + Shrink immune | L5: +1 life, L10: +10% length |
| Phoenix | 1 revive (1 life) | 1 revive (3 lives) | L4: 2 lives, L7: 3 lives |
| Midas | Shield +1 life +6% length | Shield +2 life +22% length | L7: +2 lives |

### Upgrade Costs

| Level | Cost (coins) |
|-------|-------------|
| 1->2 | 50 |
| 2->3 | 100 |
| 3->4 | 200 |
| 4->5 | 400 |
| 5->6 | 800 |
| 6->7 | 1,500 |
| 7->8 | 2,500 |
| 8->9 | 4,000 |
| 9->10 | 6,000 |
| **Total** | **15,950** |

---

## 12. Reward Calculations

### Base Match Rewards

```python
def calculate_rewards(position, deflections, match_type, win_streak):
    won = (position == 1)
    
    # Base values
    if won:
        base_xp = 220 + deflections * 2
        base_coins = 70
    else:
        base_xp = 40 + deflections
        base_coins = 20
    
    # Difficulty multiplier
    diff_mult = get_difficulty_multiplier(match_type)
    
    # Win streak multiplier
    streak_mult = get_streak_multiplier(win_streak, won)
    
    # Final rewards
    xp = round(base_xp * diff_mult * streak_mult)
    coins = round(base_coins * diff_mult * streak_mult)
    
    return { xp, coins }
```

### Difficulty Multipliers

| Mode | Multiplier |
|------|-----------|
| Casual | 0.8x |
| Classic | 1.0x |
| Rumble | 1.2x |
| Chaos | 1.5x |
| Six-Player | 1.75x |
| Gauntlet | 3.0x |

### Win Streak Multipliers

| Streak | Multiplier |
|--------|-----------|
| 0 (loss) | 1.0x |
| 1 win | 1.0x |
| 2 wins | 1.25x |
| 3 wins | 1.5x |
| 4 wins | 1.75x |
| 5+ wins | 2.0x |

### Credits (Overflow Currency)

When ALL relics are unlocked, matches award Credits instead:

```python
def calculate_credits(won):
    all_relics_owned = all_relics_unlocked()
    if not all_relics_owned:
        return 0
    return 2 if won else 1
```

---

## 13. Event System

### Event Rotation

Events are **deterministically generated** from the device date:

```python
def get_current_events():
    now = current_date()
    
    # Weekly: rotates by ISO week number
    weekly = WEEKLY_POOL[iso_week(now) % len(WEEKLY_POOL)]
    
    # Monthly: fixed by calendar month
    monthly = MONTHLY_POOL[now.month - 1]
    
    # Annual: fixed Grand Prix
    annual = ANNUAL_CUP
    
    return { weekly, monthly, annual }
```

### Event Unlock Schedule

| Event Type | Opens | Max Plays |
|------------|-------|-----------|
| Weekly | Always open (resets Monday) | 5 |
| Monthly | 28th of each month | 3 |
| Annual | October 28th | 2 |

### Event Access

Events require **General 1 rank** (340,000 XP) to access.

---

## 14. Daily Streak

### Streak Mechanics

```python
def update_login_streak(last_login_date, current_streak):
    today = today_string()
    yesterday = yesterday_string()
    
    if last_login_date == today:
        return current_streak  # Already logged in today
    
    if last_login_date == yesterday:
        return current_streak + 1  # Consecutive day
    
    return 1  # Streak broken
```

### Streak Rewards

| Streak Day | Coins |
|------------|-------|
| 1 | 50 |
| 2 | 100 |
| 3 | 150 |
| 4 | 200 |
| 5 | 250 |
| 6 | 300 |
| 7+ | 500 |

---

## 15. Complexity Analysis

### Game Loop

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Ball physics update | O(B) | B = number of active balls (max 8) |
| Collision detection | O(B * W) | W = number of walls (max 6) |
| Bot AI update | O(B * A) | A = number of active bots; runs every 3rd frame |
| Power-up collection | O(P) | P = active power-ups (max 4) |
| Overall per frame | O(1) | All values are bounded by small constants |

### Memory Usage

| Component | Approximate Size |
|-----------|-----------------|
| Game state (balls + players) | ~5 KB |
| Ball trails (8 balls x 8 positions) | ~1 KB |
| Particle effects (sparks) | ~2 KB |
| Player profile | ~10 KB |
| Total runtime | < 50 KB |

### Storage

| Data | Key Pattern | Size |
|------|------------|------|
| Player profile | `@goldrush_v3_{username}` | ~10 KB |
| Account list | `@goldrush_accounts` | ~2 KB per account |
| Current user | `@goldrush_current` | ~50 B |

---

*GoldRush Arena -- Algorithm Reference v1.0*
