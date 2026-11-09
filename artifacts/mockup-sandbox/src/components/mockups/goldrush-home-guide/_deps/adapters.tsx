import React, { useEffect, useState } from 'react';
import { View, Text, type TextProps } from './native';
import { Text as AppText } from './Text';
import { palette } from './colors';
import { fonts } from './typography';
export { SampleStateProvider } from './state';

// PhotoAvatarEditor.AvatarPhoto's exact no-photo branch: useAvatar is the stub
// boundary, set to { uri: null }. No profile-photo request or upload is performed.
export function AvatarPhoto({ children }: { username: string; size: number; children?: React.ReactNode }) {
  return <>{children}</>;
}
// QuietEffects.GlowText's source implementation, without its unrelated exports.
export function GlowText({
  color = palette.charcoal,
  glowColor: _glow, intensity: _intensity, pulse: _pulse, glitch: _glitch,
  ...props
}: TextProps & { color?: string }) {
  return <AppText {...props} style={[props.style, { color }]} />;
}
// Explicit engine boundary, not a fake court. The initial opt-in preview is the
// unmodified source JSX in Current.tsx. Only pressing Try a rally reaches this.
export function GameArena({ arenaSize }: { arenaSize: number; [key: string]: unknown }) {
  return (
    <View style={{ width: arenaSize, height: arenaSize, backgroundColor: palette.navy, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.stone, textAlign: 'center' }}>
        Preview only: the game engine is not included in this isolated Home extraction. No rally, rank or rewards are running. Press Stop to return.
      </Text>
    </View>
  );
}
export function ActionNotice() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    const onAction = (event: Event) => setMessage((event as CustomEvent<string>).detail);
    window.addEventListener('goldrush-guide-action', onAction);
    return () => window.removeEventListener('goldrush-guide-action', onAction);
  }, []);
  if (!message) return null;
  return <div className="extraction-notice" role="status">{message}<button onClick={() => setMessage('')}>Close</button></div>;
}
