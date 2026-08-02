import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { RankBadge } from '@/components/RankBadge';
import { useColors } from '@/hooks/useColors';
import { ShimmerCard } from '@/components/effects';

interface PlayerCardProps {
  name: string;
  rank: string;
  color: string;
  wins?: number;
  level?: number;
  isBot?: boolean;
  isReady?: boolean;
  size?: 'sm' | 'lg';
}

export function PlayerCard({
  name, rank, color, wins, level, isBot, isReady, size = 'lg',
}: PlayerCardProps) {
  const colors = useColors();
  const isSmall = size === 'sm';

  // Spring-bump when transitioning to READY
  const bumpScale = useSharedValue(1);
  const prevReady = useRef(isReady);
  useEffect(() => {
    if (isReady && !prevReady.current) {
      bumpScale.value = withSequence(
        withSpring(1.07, { damping: 4, stiffness: 350 }),
        withSpring(1,    { damping: 12, stiffness: 220 }),
      );
    }
    prevReady.current = isReady;
  }, [isReady]);

  const bumpStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bumpScale.value }],
  }));

  return (
    <Reanimated.View style={bumpStyle}>
    <ShimmerCard active={isReady === true} borderRadius={isSmall ? 10 : 14} shimmerColor="rgba(0,255,136,0.1)">
      <LinearGradient
        colors={[color + '18', color + '06']}
        style={[styles.card, isSmall && styles.cardSmall, { borderColor: color + '44' }]}
      >
        <View style={[styles.avatar, { backgroundColor: color + '33', borderColor: color }]}>
          <Text style={[styles.avatarText, { color, fontSize: isSmall ? 16 : 22 }]}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground, fontSize: isSmall ? 12 : 15 }]} numberOfLines={1}>
              {name}
            </Text>
            {isBot && (
              <View style={[styles.botBadge, { borderColor: colors.mutedForeground }]}>
                <Text style={[styles.botText, { color: colors.mutedForeground }]}>BOT</Text>
              </View>
            )}
          </View>
          <View style={styles.stats}>
            <RankBadge rank={rank} size="sm" showLabel={false} />
            <Text style={[styles.rankText, { color: colors.mutedForeground, fontSize: isSmall ? 10 : 11 }]}>
              {rank}
            </Text>
            {level != null && (
              <Text style={[styles.levelText, { color: colors.mutedForeground }]}>
                {' '}· Lv {level}
              </Text>
            )}
            {wins != null && (
              <Text style={[styles.wins, { color: colors.mutedForeground }]}>
                {' '}· {wins}W
              </Text>
            )}
          </View>
        </View>
        {isReady != null && (
          <View style={[styles.readyDot, { backgroundColor: isReady ? '#00FF88' : colors.muted }]} />
        )}
      </LinearGradient>
    </ShimmerCard>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  cardSmall: {
    padding: 8,
    borderRadius: 10,
    gap: 7,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter_700Bold',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontFamily: 'Inter_700Bold',
    flex: 1,
  },
  botBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  botText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 8,
    letterSpacing: 0.5,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rankText: {
    fontFamily: 'Inter_500Medium',
  },
  levelText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  wins: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  readyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
