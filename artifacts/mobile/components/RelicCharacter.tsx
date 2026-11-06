import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle, Ellipse, G, LinearGradient, Path, Polygon, Rect, Stop, Defs,
} from 'react-native-svg';

interface Props { relicId: string; size?: number }

// ── Shared helpers ────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function scaleProps(base: number, target: number) {
  const s = target / base;
  return `scale(${s})`;
}

// Each character is drawn in a 100×120 viewBox.
// The character art fills ~90% of that space.

// ── 1 · IRONHIDE, Iron Knight ───────────────────────────────────────────────
function Ironhide() {
  return (
    <G>
      <Defs>
        <LinearGradient id="ih_bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3A3D44" /><Stop offset="1" stopColor="#2A2C31" />
        </LinearGradient>
        <LinearGradient id="ih_body" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#B7B2A6" /><Stop offset="1" stopColor="#8A867D" />
        </LinearGradient>
      </Defs>
      {/* Bg circle */}
      <Circle cx="50" cy="60" r="52" fill="url(#ih_bg)" />
      {/* Pauldrons */}
      <Ellipse cx="27" cy="68" rx="12" ry="9" fill="#8A867D" />
      <Ellipse cx="73" cy="68" rx="12" ry="9" fill="#8A867D" />
      {/* Body armour */}
      <Rect x="31" y="62" width="38" height="36" rx="10" fill="url(#ih_body)" />
      {/* Chest shield emblem */}
      <Polygon points="50,71 43,75 43,83 50,87 57,83 57,75" fill="#3A3D44" />
      <Polygon points="50,73 45,76 45,82 50,86 55,82 55,76" fill="#B7B2A6" opacity="0.5" />
      {/* Head */}
      <Circle cx="50" cy="44" r="20" fill="url(#ih_body)" />
      {/* Helmet top (darker plate) */}
      <Path d="M31,44 Q31,24 50,24 Q69,24 69,44 Z" fill="#3A3D44" />
      {/* Visor, T slot */}
      <Rect x="36" y="41" width="28" height="5" rx="2" fill="#1F2125" />
      <Rect x="47" y="34" width="6" height="15" rx="2" fill="#1F2125" />
      {/* Visor glow */}
      <Rect x="36" y="41" width="28" height="2" rx="1" fill="#8C8F7A" opacity="0.5" />
      {/* Feet */}
      <Rect x="35" y="95" width="12" height="8" rx="4" fill="#3A3D44" />
      <Rect x="53" y="95" width="12" height="8" rx="4" fill="#3A3D44" />
    </G>
  );
}

// ── 2 · LONGARM, Stretch Mechanic ───────────────────────────────────────────
function Longarm() {
  return (
    <G>
      <Defs>
        <LinearGradient id="la_bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#9E7620" /><Stop offset="1" stopColor="#1F2125" />
        </LinearGradient>
        <LinearGradient id="la_body" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C99A2E" /><Stop offset="1" stopColor="#9E7620" />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="60" r="52" fill="url(#la_bg)" />
      {/* Extra-long arms, the defining feature */}
      <Ellipse cx="19" cy="72" rx="19" ry="7" fill="#C99A2E" opacity="0.9" transform="rotate(-10,19,72)" />
      <Ellipse cx="81" cy="72" rx="19" ry="7" fill="#C99A2E" opacity="0.9" transform="rotate(10,81,72)" />
      {/* Wrench at left hand */}
      <Rect x="2" y="68" width="10" height="3" rx="1" fill="#888" />
      <Rect x="3" y="65" width="4" height="3" rx="1" fill="#888" />
      <Rect x="3" y="71" width="4" height="3" rx="1" fill="#888" />
      {/* Body */}
      <Rect x="32" y="60" width="36" height="36" rx="10" fill="url(#la_body)" />
      {/* Overalls straps */}
      <Rect x="40" y="62" width="5" height="36" rx="2" fill="#9E7620" opacity="0.6" />
      <Rect x="55" y="62" width="5" height="36" rx="2" fill="#9E7620" opacity="0.6" />
      <Rect x="38" y="70" width="24" height="3" rx="1" fill="#9E7620" opacity="0.6" />
      {/* Head */}
      <Circle cx="50" cy="44" r="18" fill="#C99A2E" />
      {/* Hair */}
      <Path d="M33,40 Q34,26 50,26 Q66,26 67,40" fill="#1A1508" />
      {/* Goggles */}
      <Circle cx="43" cy="44" r="7" fill="#1F2125" />
      <Circle cx="57" cy="44" r="7" fill="#1F2125" />
      <Rect x="43" y="40" width="14" height="2" rx="1" fill="#1A1508" />
      <Circle cx="43" cy="44" r="5" fill="#C99A2E" opacity="0.7" />
      <Circle cx="57" cy="44" r="5" fill="#C99A2E" opacity="0.7" />
      <Circle cx="44" cy="43" r="2" fill="#ECE7DC" opacity="0.5" />
      <Circle cx="58" cy="43" r="2" fill="#ECE7DC" opacity="0.5" />
      {/* Feet */}
      <Ellipse cx="40" cy="97" rx="8" ry="5" fill="#9E7620" />
      <Ellipse cx="60" cy="97" rx="8" ry="5" fill="#9E7620" />
    </G>
  );
}

// ── 3 · QUICKSILVER, Speedster ──────────────────────────────────────────────
function Quicksilver() {
  return (
    <G>
      <Defs>
        <LinearGradient id="qs_bg" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#2A2C31" /><Stop offset="1" stopColor="#8C8F7A" />
        </LinearGradient>
        <LinearGradient id="qs_body" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8C8F7A" /><Stop offset="1" stopColor="#8A867D" />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="60" r="52" fill="url(#qs_bg)" />
      {/* Speed lines, trailing left */}
      <Rect x="2" y="54" width="28" height="3" rx="1.5" fill="#8C8F7A" opacity="0.6" />
      <Rect x="6" y="62" width="22" height="3" rx="1.5" fill="#8C8F7A" opacity="0.4" />
      <Rect x="4" y="70" width="18" height="3" rx="1.5" fill="#8C8F7A" opacity="0.25" />
      {/* Body */}
      <Ellipse cx="52" cy="72" rx="16" ry="20" fill="url(#qs_body)" />
      {/* Lightning bolt on chest */}
      <Polygon points="52,62 46,74 52,72 48,84 58,68 52,70" fill="#C99A2E" />
      {/* Helmet */}
      <Ellipse cx="52" cy="44" rx="18" ry="20" fill="url(#qs_body)" />
      {/* Helmet visor */}
      <Path d="M38,47 Q38,38 52,38 Q66,38 66,47" fill="#2A2C31" />
      {/* Visor glow slit */}
      <Rect x="40" y="46" width="24" height="4" rx="2" fill="#8C8F7A" opacity="0.8" />
      {/* Ear fins */}
      <Polygon points="34,44 30,36 36,36" fill="#B7B2A6" />
      <Polygon points="66,44 70,36 64,36" fill="#B7B2A6" />
      {/* Feet (pointed/aerodynamic) */}
      <Ellipse cx="43" cy="95" rx="8" ry="5" fill="#8A867D" />
      <Ellipse cx="60" cy="97" rx="8" ry="5" fill="#8A867D" />
    </G>
  );
}

// ── 4 · SECOND WIND, Field Medic ────────────────────────────────────────────
function SecondWind() {
  return (
    <G>
      <Defs>
        <LinearGradient id="sw_bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#9E7620" /><Stop offset="1" stopColor="#16171A" />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="60" r="52" fill="url(#sw_bg)" />
      {/* Body, white coat */}
      <Rect x="30" y="60" width="40" height="38" rx="12" fill="#ECE7DC" />
      {/* Coat lapels */}
      <Path d="M50,60 L38,68 L38,98 L50,90 L62,98 L62,68 Z" fill="#ECE7DC" />
      {/* Red cross on chest */}
      <Rect x="46" y="70" width="8" height="18" rx="2" fill="#B4533A" />
      <Rect x="40" y="76" width="20" height="7" rx="2" fill="#B4533A" />
      {/* Head */}
      <Circle cx="50" cy="44" r="18" fill="#C99A2E" />
      {/* Nurse cap */}
      <Rect x="36" y="26" width="28" height="16" rx="4" fill="#ECE7DC" />
      <Rect x="44" y="24" width="12" height="20" rx="3" fill="#ECE7DC" />
      {/* Cross on cap */}
      <Rect x="48" y="27" width="4" height="12" rx="1" fill="#B4533A" />
      <Rect x="44" y="30" width="12" height="4" rx="1" fill="#B4533A" />
      {/* Eyes, caring */}
      <Ellipse cx="44" cy="46" rx="4" ry="4.5" fill="#1F2125" />
      <Ellipse cx="56" cy="46" rx="4" ry="4.5" fill="#1F2125" />
      <Circle cx="45" cy="45" r="1.5" fill="#ECE7DC" />
      <Circle cx="57" cy="45" r="1.5" fill="#ECE7DC" />
      {/* Smile */}
      <Path d="M44,54 Q50,59 56,54" stroke="#9E7620" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Floating hearts */}
      <Path d="M72,28 Q75,22 80,28 Q85,22 88,28 Q88,34 80,40 Q72,34 72,28 Z" fill="#B4533A" opacity="0.85" />
      {/* Feet */}
      <Rect x="35" y="95" width="12" height="7" rx="5" fill="#B7B2A6" />
      <Rect x="53" y="95" width="12" height="7" rx="5" fill="#B7B2A6" />
    </G>
  );
}

// ── 5 · PROSPECTOR, Gold Miner ──────────────────────────────────────────────
function Prospector() {
  return (
    <G>
      <Defs>
        <LinearGradient id="pr_bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#9E7620" /><Stop offset="1" stopColor="#16171A" />
        </LinearGradient>
        <LinearGradient id="pr_body" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C99A2E" /><Stop offset="1" stopColor="#C99A2E" />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="60" r="52" fill="url(#pr_bg)" />
      {/* Body / vest */}
      <Rect x="31" y="62" width="38" height="35" rx="11" fill="#9E7620" />
      <Rect x="36" y="62" width="28" height="35" rx="8" fill="#C99A2E" />
      {/* Arm holding magnet (right) */}
      <Ellipse cx="74" cy="74" rx="12" ry="7" fill="#C99A2E" transform="rotate(15,74,74)" />
      {/* Horseshoe magnet */}
      <Path d="M82,68 Q92,68 92,78 Q92,88 82,88" stroke="#B4533A" strokeWidth="5" fill="none" strokeLinecap="round" />
      <Path d="M82,68 Q72,68 72,78 Q72,88 82,88" stroke="#8C8F7A" strokeWidth="5" fill="none" strokeLinecap="round" />
      <Rect x="77" y="64" width="10" height="6" rx="2" fill="#888" />
      {/* Head */}
      <Circle cx="50" cy="44" r="18" fill="#C99A2E" />
      {/* Mining helmet */}
      <Path d="M32,44 Q33,24 50,24 Q67,24 68,44" fill="#C99A2E" />
      <Rect x="33" y="40" width="34" height="6" rx="3" fill="#C99A2E" />
      {/* Helmet lamp */}
      <Circle cx="50" cy="30" r="6" fill="#C99A2E" />
      <Circle cx="50" cy="30" r="3" fill="#ECE7DC" opacity="0.8" />
      {/* Eyes */}
      <Ellipse cx="44" cy="46" rx="4" ry="4" fill="#1F2125" />
      <Ellipse cx="56" cy="46" rx="4" ry="4" fill="#1F2125" />
      <Circle cx="45" cy="45" r="1.5" fill="#ECE7DC" />
      <Circle cx="57" cy="45" r="1.5" fill="#ECE7DC" />
      {/* Grin */}
      <Path d="M43,53 Q50,58 57,53" stroke="#9E7620" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Boots */}
      <Rect x="34" y="94" width="13" height="8" rx="5" fill="#9E7620" />
      <Rect x="53" y="94" width="13" height="8" rx="5" fill="#9E7620" />
    </G>
  );
}

// ── 6 · AFTERSHOCK, Demo Expert ─────────────────────────────────────────────
function Aftershock() {
  return (
    <G>
      <Defs>
        <LinearGradient id="as_bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2A2C31" /><Stop offset="1" stopColor="#16171A" />
        </LinearGradient>
        <LinearGradient id="as_body" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8C8F7A" /><Stop offset="1" stopColor="#2A2C31" />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="60" r="52" fill="url(#as_bg)" />
      {/* Fuse hair, zigzag line up with flame ball */}
      <Path d="M50,24 L47,17 L53,12 L49,6 L55,2" stroke="#C99A2E" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="55" cy="2" r="4" fill="#B4533A" />
      <Circle cx="55" cy="2" r="2" fill="#C99A2E" />
      {/* Body armour */}
      <Rect x="28" y="60" width="44" height="37" rx="10" fill="url(#as_body)" />
      {/* Armour panels */}
      <Rect x="32" y="64" width="16" height="10" rx="3" fill="#8C8F7A" opacity="0.7" />
      <Rect x="52" y="64" width="16" height="10" rx="3" fill="#8C8F7A" opacity="0.7" />
      {/* Bomb on chest */}
      <Circle cx="50" cy="82" r="7" fill="#1F2125" />
      <Path d="M50,75 L50,70 L56,66" stroke="#C99A2E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Circle cx="57" cy="65" r="2" fill="#B4533A" />
      {/* Rivets */}
      <Circle cx="32" cy="74" r="2.5" fill="#2A2C31" />
      <Circle cx="68" cy="74" r="2.5" fill="#2A2C31" />
      <Circle cx="32" cy="90" r="2.5" fill="#2A2C31" />
      <Circle cx="68" cy="90" r="2.5" fill="#2A2C31" />
      {/* Head */}
      <Circle cx="50" cy="44" r="19" fill="#8C8F7A" />
      {/* Head armour ridge */}
      <Path d="M32,42 Q32,24 50,24 Q68,24 68,42" fill="#2A2C31" />
      {/* Orange glowing eyes */}
      <Ellipse cx="43" cy="46" rx="5" ry="5" fill="#C99A2E" />
      <Ellipse cx="57" cy="46" rx="5" ry="5" fill="#C99A2E" />
      <Ellipse cx="43" cy="46" rx="3" ry="3" fill="#C99A2E" />
      <Ellipse cx="57" cy="46" rx="3" ry="3" fill="#C99A2E" />
      {/* Scowl */}
      <Path d="M43,55 Q50,51 57,55" stroke="#2A2C31" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Boots */}
      <Rect x="33" y="94" width="13" height="8" rx="4" fill="#2A2C31" />
      <Rect x="54" y="94" width="13" height="8" rx="4" fill="#2A2C31" />
    </G>
  );
}

// ── 7 · TIME WARP, Chrono Mage ──────────────────────────────────────────────
function TimeWarp() {
  return (
    <G>
      <Defs>
        <LinearGradient id="tw_bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2A2C31" /><Stop offset="1" stopColor="#16171A" />
        </LinearGradient>
        <LinearGradient id="tw_robe" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8C8F7A" /><Stop offset="1" stopColor="#8C8F7A" />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="60" r="52" fill="url(#tw_bg)" />
      {/* Floating star runes */}
      <Circle cx="20" cy="35" r="3" fill="#8C8F7A" opacity="0.5" />
      <Circle cx="80" cy="28" r="2" fill="#8C8F7A" opacity="0.4" />
      <Circle cx="15" cy="80" r="2" fill="#8C8F7A" opacity="0.35" />
      <Circle cx="85" cy="75" r="3" fill="#8C8F7A" opacity="0.45" />
      {/* Wide robe */}
      <Path d="M22,65 Q26,62 50,62 Q74,62 78,65 L82,102 L18,102 Z" fill="url(#tw_robe)" />
      {/* Robe trim */}
      <Path d="M22,65 Q26,62 50,62 Q74,62 78,65" stroke="#8C8F7A" strokeWidth="2" fill="none" opacity="0.6" />
      {/* Hood */}
      <Circle cx="50" cy="44" r="20" fill="#8C8F7A" />
      {/* Inner hood shadow */}
      <Circle cx="50" cy="47" r="15" fill="#2A2C31" />
      {/* Glowing cyan eyes */}
      <Ellipse cx="43" cy="46" rx="5" ry="5" fill="#8C8F7A" opacity="0.9" />
      <Ellipse cx="57" cy="46" rx="5" ry="5" fill="#8C8F7A" opacity="0.9" />
      <Ellipse cx="43" cy="46" rx="3" ry="3" fill="#ECE7DC" opacity="0.7" />
      <Ellipse cx="57" cy="46" rx="3" ry="3" fill="#ECE7DC" opacity="0.7" />
      {/* Hood point */}
      <Path d="M38,26 Q50,8 62,26 Q50,24 38,26 Z" fill="#8C8F7A" />
      {/* Hourglass in sleeve */}
      <Ellipse cx="76" cy="74" rx="6" ry="4" fill="#8C8F7A" opacity="0.8" />
      <Ellipse cx="76" cy="84" rx="6" ry="4" fill="#8C8F7A" opacity="0.8" />
      <Path d="M70,74 L70,84 L82,84 L82,74 Z" fill="#8C8F7A" opacity="0.3" />
      <Rect x="70" y="78" width="12" height="2" rx="1" fill="#8C8F7A" opacity="0.6" />
      {/* Falling sand */}
      <Rect x="74" y="80" width="4" height="2" rx="1" fill="#C99A2E" opacity="0.7" />
    </G>
  );
}

// ── 8 · BULWARK, Stone Titan ────────────────────────────────────────────────
function Bulwark() {
  return (
    <G>
      <Defs>
        <LinearGradient id="bk_bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1F2125" /><Stop offset="1" stopColor="#16171A" />
        </LinearGradient>
        <LinearGradient id="bk_stone" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8A867D" /><Stop offset="1" stopColor="#3A3D44" />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="60" r="52" fill="url(#bk_bg)" />
      {/* Massive body */}
      <Rect x="16" y="57" width="68" height="45" rx="8" fill="url(#bk_stone)" />
      {/* Red cracks */}
      <Path d="M30,60 L38,72 L34,85" stroke="#B4533A" strokeWidth="2.5" fill="none" opacity="0.8" />
      <Path d="M60,58 L55,70 L62,82 L58,95" stroke="#B4533A" strokeWidth="2" fill="none" opacity="0.7" />
      <Path d="M20,75 L32,80" stroke="#B4533A" strokeWidth="2" fill="none" opacity="0.6" />
      <Path d="M68,72 L78,78 L74,88" stroke="#B4533A" strokeWidth="2" fill="none" opacity="0.6" />
      {/* Fists */}
      <Rect x="6" y="78" width="20" height="18" rx="6" fill="url(#bk_stone)" />
      <Rect x="74" y="78" width="20" height="18" rx="6" fill="url(#bk_stone)" />
      <Path d="M6,83 L18,83" stroke="#B4533A" strokeWidth="1.5" fill="none" opacity="0.7" />
      <Path d="M82,83 L94,83" stroke="#B4533A" strokeWidth="1.5" fill="none" opacity="0.7" />
      {/* Square-ish head */}
      <Rect x="28" y="26" width="44" height="34" rx="8" fill="url(#bk_stone)" />
      {/* Cracks on head */}
      <Path d="M38,28 L44,40" stroke="#B4533A" strokeWidth="2" fill="none" opacity="0.7" />
      <Path d="M60,30 L56,42" stroke="#B4533A" strokeWidth="2" fill="none" opacity="0.7" />
      {/* Thick angry brows */}
      <Path d="M30,36 L46,32" stroke="#16171A" strokeWidth="5" strokeLinecap="round" />
      <Path d="M54,32 L70,36" stroke="#16171A" strokeWidth="5" strokeLinecap="round" />
      {/* Deep-set red eyes */}
      <Ellipse cx="40" cy="44" rx="5" ry="4" fill="#B4533A" />
      <Ellipse cx="60" cy="44" rx="5" ry="4" fill="#B4533A" />
      <Ellipse cx="40" cy="44" rx="2.5" ry="2" fill="#B4533A" />
      <Ellipse cx="60" cy="44" rx="2.5" ry="2" fill="#B4533A" />
      {/* Grim mouth */}
      <Rect x="38" y="52" width="24" height="4" rx="2" fill="#16171A" />
    </G>
  );
}

// ── 9 · PHOENIX, Fire Warrior ───────────────────────────────────────────────
function Phoenix() {
  return (
    <G>
      <Defs>
        <LinearGradient id="px_bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2A2C31" /><Stop offset="1" stopColor="#16171A" />
        </LinearGradient>
        <LinearGradient id="px_body" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#B4533A" /><Stop offset="1" stopColor="#B4533A" />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="60" r="52" fill="url(#px_bg)" />
      {/* Wings behind body */}
      <Path d="M50,68 Q20,50 8,65 Q18,85 50,82 Z" fill="#B4533A" opacity="0.8" />
      <Path d="M50,68 Q80,50 92,65 Q82,85 50,82 Z" fill="#B4533A" opacity="0.8" />
      {/* Wing feathers left */}
      <Path d="M50,70 Q28,52 14,56" stroke="#B4533A" strokeWidth="2.5" fill="none" opacity="0.7" />
      <Path d="M50,72 Q24,58 10,68" stroke="#C99A2E" strokeWidth="2" fill="none" opacity="0.5" />
      {/* Wing feathers right */}
      <Path d="M50,70 Q72,52 86,56" stroke="#B4533A" strokeWidth="2.5" fill="none" opacity="0.7" />
      <Path d="M50,72 Q76,58 90,68" stroke="#C99A2E" strokeWidth="2" fill="none" opacity="0.5" />
      {/* Body */}
      <Circle cx="50" cy="74" r="18" fill="url(#px_body)" />
      {/* Belly light */}
      <Ellipse cx="50" cy="76" rx="9" ry="7" fill="#C99A2E" opacity="0.5" />
      {/* Head */}
      <Circle cx="50" cy="47" r="18" fill="#B4533A" />
      {/* Flame crown, 5 flame tongues */}
      <Path d="M50,30 Q47,18 50,10 Q53,18 50,30 Z" fill="#C99A2E" />
      <Path d="M42,32 Q36,22 40,14 Q45,22 42,32 Z" fill="#C99A2E" />
      <Path d="M58,32 Q64,22 60,14 Q55,22 58,32 Z" fill="#C99A2E" />
      <Path d="M36,37 Q28,30 34,22 Q40,30 36,37 Z" fill="#B4533A" opacity="0.8" />
      <Path d="M64,37 Q72,30 66,22 Q60,30 64,37 Z" fill="#B4533A" opacity="0.8" />
      {/* Bright orange eyes */}
      <Ellipse cx="43" cy="48" rx="5" ry="5" fill="#C99A2E" />
      <Ellipse cx="57" cy="48" rx="5" ry="5" fill="#C99A2E" />
      <Ellipse cx="43" cy="48" rx="3" ry="3" fill="#ECE7DC" opacity="0.8" />
      <Ellipse cx="57" cy="48" rx="3" ry="3" fill="#ECE7DC" opacity="0.8" />
      {/* Beak-like pointed chin / mouth */}
      <Path d="M44,56 Q50,62 56,56" stroke="#B4533A" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Feather boots */}
      <Path d="M38,92 Q32,88 30,96 Q36,100 42,96 Z" fill="#B4533A" />
      <Path d="M62,92 Q68,88 70,96 Q64,100 58,96 Z" fill="#B4533A" />
    </G>
  );
}

// ── 10 · MIDAS TOUCH, Golden King ───────────────────────────────────────────
function MidasTouch() {
  return (
    <G>
      <Defs>
        <LinearGradient id="mt_bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#16171A" /><Stop offset="1" stopColor="#16171A" />
        </LinearGradient>
        <LinearGradient id="mt_gold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C99A2E" /><Stop offset="1" stopColor="#C99A2E" />
        </LinearGradient>
        <LinearGradient id="mt_cape" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8C8F7A" /><Stop offset="1" stopColor="#2A2C31" />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="60" r="52" fill="url(#mt_bg)" />
      {/* Purple royal cape behind */}
      <Path d="M30,64 Q18,68 14,90 L50,102 L86,90 Q82,68 70,64 Z" fill="url(#mt_cape)" />
      {/* Cape ermine trim */}
      <Circle cx="22" cy="82" r="3" fill="#ECE7DC" opacity="0.7" />
      <Circle cx="78" cy="82" r="3" fill="#ECE7DC" opacity="0.7" />
      <Circle cx="28" cy="94" r="3" fill="#ECE7DC" opacity="0.7" />
      <Circle cx="72" cy="94" r="3" fill="#ECE7DC" opacity="0.7" />
      {/* Golden armour body */}
      <Rect x="30" y="62" width="40" height="38" rx="12" fill="url(#mt_gold)" />
      {/* Chest plate detail */}
      <Ellipse cx="50" cy="75" rx="10" ry="12" fill="#C99A2E" opacity="0.6" />
      {/* Gold trim lines */}
      <Rect x="30" y="72" width="40" height="3" rx="1" fill="#C99A2E" />
      <Rect x="30" y="82" width="40" height="2" rx="1" fill="#C99A2E" opacity="0.7" />
      {/* Head */}
      <Circle cx="50" cy="45" r="18" fill="#C99A2E" />
      {/* Face skin under gold tint */}
      <Ellipse cx="50" cy="48" rx="13" ry="11" fill="#C99A2E" />
      {/* Crown, 5 points */}
      <Path d="M32,34 L32,26 L38,32 L44,20 L50,28 L56,20 L62,32 L68,26 L68,34 Z" fill="url(#mt_gold)" />
      {/* Crown gems */}
      <Ellipse cx="44" cy="22" rx="3" ry="4" fill="#8C8F7A" />
      <Ellipse cx="50" cy="27" rx="4" ry="5" fill="#B4533A" />
      <Ellipse cx="56" cy="22" rx="3" ry="4" fill="#8C8F7A" />
      {/* Crown band */}
      <Rect x="32" y="32" width="36" height="5" rx="2" fill="#C99A2E" />
      {/* Eyes, regal */}
      <Ellipse cx="43" cy="47" rx="4.5" ry="4.5" fill="#16171A" />
      <Ellipse cx="57" cy="47" rx="4.5" ry="4.5" fill="#16171A" />
      <Circle cx="44" cy="46" r="1.5" fill="#ECE7DC" opacity="0.7" />
      <Circle cx="58" cy="46" r="1.5" fill="#ECE7DC" opacity="0.7" />
      {/* Regal smirk */}
      <Path d="M44,55 Q50,58 57,55" stroke="#9E7620" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Gold shoulders */}
      <Circle cx="30" cy="66" r="10" fill="url(#mt_gold)" />
      <Circle cx="70" cy="66" r="10" fill="url(#mt_gold)" />
    </G>
  );
}

// ── Character map ─────────────────────────────────────────────────────────────
const CHARACTERS: Record<string, React.FC> = {
  ironhide:    Ironhide,
  longarm:     Longarm,
  quicksilver: Quicksilver,
  secondwind:  SecondWind,
  prospector:  Prospector,
  aftershock:  Aftershock,
  timewarp:    TimeWarp,
  bulwark:     Bulwark,
  phoenix:     Phoenix,
  midas:       MidasTouch,
};

// ── Main export ───────────────────────────────────────────────────────────────
export function RelicCharacter({ relicId, size = 100 }: Props) {
  const Char = CHARACTERS[relicId];
  if (!Char) return <View style={{ width: size, height: size }} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 120">
      <Char />
    </Svg>
  );
}
