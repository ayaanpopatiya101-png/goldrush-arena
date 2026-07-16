import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RANKS } from '@/context/PlayerContext';

interface RankBadgeProps {
  rank: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

// Tier emoji used as the main badge icon
const RANK_ICONS: Record<string, string> = {
  'Bronze 1':    '🥉', 'Bronze 2':    '🥉', 'Bronze 3':    '🥉',
  'Silver 1':    '🥈', 'Silver 2':    '🥈', 'Silver 3':    '🥈',
  'Gold 1':      '🥇', 'Gold 2':      '🥇', 'Gold 3':      '🥇',
  'Diamond 1':   '💎', 'Diamond 2':   '💎', 'Diamond 3':   '💎',
  'Master 1':    '⚡', 'Master 2':    '⚡', 'Master 3':    '⚡',
  'Champion 1':  '👑', 'Champion 2':  '👑', 'Champion 3':  '👑',
  'Champion 4':  '👑', 'Champion 5':  '🏆',
};

// Tier-level number badge (1/2/3/4/5)
const RANK_NUM: Record<string, string> = {
  'Bronze 1': '1', 'Bronze 2': '2', 'Bronze 3': '3',
  'Silver 1': '1', 'Silver 2': '2', 'Silver 3': '3',
  'Gold 1':   '1', 'Gold 2':   '2', 'Gold 3':   '3',
  'Diamond 1':'1', 'Diamond 2':'2', 'Diamond 3':'3',
  'Master 1': '1', 'Master 2': '2', 'Master 3': '3',
  'Champion 1':'1','Champion 2':'2','Champion 3':'3',
  'Champion 4':'4','Champion 5':'5',
};

export function RankBadge({ rank, size = 'md', showLabel = true }: RankBadgeProps) {
  const rankData = RANKS.find(r => r.name === rank) ?? RANKS[0];
  const color = rankData.color;

  const dim       = size === 'sm' ? 28 : size === 'lg' ? 52 : 38;
  const iconSize  = size === 'sm' ? 12 : size === 'lg' ? 20 : 16;
  const numSize   = size === 'sm' ? 7  : size === 'lg' ? 11 : 9;
  const labelSize = size === 'sm' ? 9  : size === 'lg' ? 13 : 11;

  const icon = RANK_ICONS[rank] ?? '🎮';
  const num  = RANK_NUM[rank]  ?? '';

  return (
    <View style={styles.wrapper}>
      <View style={[styles.badge, {
        width: dim, height: dim, borderRadius: dim / 2,
        borderColor: color, backgroundColor: color + '22', shadowColor: color,
      }]}>
        <Text style={{ fontSize: iconSize, lineHeight: iconSize + 4 }}>{icon}</Text>
        {num ? (
          <View style={[styles.numPip, { backgroundColor: color, borderColor: color + '66' }]}>
            <Text style={[styles.numTxt, { fontSize: numSize, color: '#000000CC' }]}>{num}</Text>
          </View>
        ) : null}
      </View>
      {showLabel && (
        <Text style={[styles.label, { color, fontSize: labelSize }]}>{rank.toUpperCase()}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 3 },
  badge: {
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 4,
  },
  numPip: {
    position: 'absolute', bottom: -2, right: -2,
    minWidth: 13, height: 13, borderRadius: 7, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2,
  },
  numTxt: { fontFamily: 'Inter_700Bold', letterSpacing: 0 },
  label:  { fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
});
