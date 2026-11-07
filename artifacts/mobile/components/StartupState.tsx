import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import colors from '@/constants/colors';

export function StartupState({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>GOLDRUSH ARENA</Text>
      <Text accessibilityRole="alert" style={styles.body}>
        {error ?? 'Loading your arena and saved progress…'}
      </Text>
      {error ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Retry loading saved progress"
          onPress={onRetry} style={styles.retry}>
          <Text style={styles.retryText}>RETRY</Text>
        </Pressable>
      ) : <ActivityIndicator color={colors.dark.primary} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.background, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 20 },
  title: { fontSize: 24, fontWeight: '700', color: colors.dark.foreground, letterSpacing: 2 },
  body: { color: colors.dark.foreground, textAlign: 'center', fontSize: 16, maxWidth: 380 },
  retry: { backgroundColor: colors.dark.primary, minHeight: 48, paddingHorizontal: 28, justifyContent: 'center', borderRadius: 2 },
  retryText: { color: colors.dark.primaryForeground, fontWeight: '700' },
});
