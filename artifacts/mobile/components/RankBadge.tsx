import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RANKS } from '@/context/PlayerContext';

interface RankBadgeProps {
  rank: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const RANK_SYMBOLS: Record<string, string> = {
  Iron: 'I',
  Bronze: 'II',
  Silver: 'III',
  Gold: 'IV',
  Platinum: 'V',
  Diamond: 'VI',
  Master: 'VII',
  Legend: 'VIII',
};

export function RankBadge({ rank, size = 'md', showLabel = true }: RankBadgeProps) {
  const rankData = RANKS.find(r => r.name === rank) ?? RANKS[0];
  const color = rankData.color;

  const dim = size === 'sm' ? 28 : size === 'lg' ? 52 : 38;
  const fontSize = size === 'sm' ? 9 : size === 'lg' ? 16 : 11;
  const labelSize = size === 'sm' ? 9 : size === 'lg' ? 13 : 11;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.badge,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            borderColor: color,
            backgroundColor: color + '22',
            shadowColor: color,
          },
        ]}
      >
        <Text style={[styles.symbol, { color, fontSize }]}>{RANK_SYMBOLS[rank] ?? 'I'}</Text>
      </View>
      {showLabel && (
        <Text style={[styles.label, { color, fontSize: labelSize }]}>{rank.toUpperCase()}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 3,
  },
  badge: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  symbol: {
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  label: {
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
  },
});
