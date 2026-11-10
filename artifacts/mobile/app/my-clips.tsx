// My Clips: highlights saved on this device (max 10). Visible delete with confirmation.
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton, ScreenTitle, Shell, gridItemWidth, paperText } from '@/components/ui/Primitives';
import { tactile } from '@/constants/colors';
import { palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { deleteClipFromLibrary, getClipLibrary, type SavedClip } from '@/store/clipLibrary';

const TYPE_LABEL: Record<string, string> = {
  multi_block: 'Multi-block', near_death: 'Near-miss save', hot_streak: 'Hot streak', manual: 'Saved moment',
};

function thumbUri(clip: SavedClip): string | null {
  if (clip.gifBase64) return `data:image/gif;base64,${clip.gifBase64}`;
  const f = Array.isArray(clip.frames) ? clip.frames[0] : undefined;
  return f ? `data:image/jpeg;base64,${f}` : null;
}

function ClipCell({ clip, width, onOpen, onDelete }: { clip: SavedClip; width: number; onOpen: () => void; onDelete: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const uri = thumbUri(clip);
  const playable = Array.isArray(clip.frames) && clip.frames.length > 0;
  const date = new Date(clip.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return (
    <View style={[mc.cell, { width }]}>
      <Pressable
        onPress={playable ? onOpen : undefined}
        disabled={!playable}
        accessibilityRole="button"
        accessibilityLabel={`${TYPE_LABEL[clip.type] ?? 'Clip'}, ${clip.score} hits, ${date}${playable ? '' : ', unavailable'}`}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      >
        <View style={mc.thumb}>
          {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" autoplay={false} /> : (
            <View style={mc.noThumb}><Feather name="film" size={20} color={palette.muted} /><Text style={mc.meta}>No preview</Text></View>
          )}
          <View style={mc.tier}><Text style={mc.tierText}>{clip.tier}</Text></View>
        </View>
        <View style={mc.info}>
          <Text style={mc.name} numberOfLines={1}>{clip.caption || TYPE_LABEL[clip.type] || 'Clip'}</Text>
          <Text style={mc.meta}>{date} · {clip.score} hits{playable ? '' : ' · frames missing'}</Text>
        </View>
      </Pressable>
      {confirming ? (
        <View style={mc.confirm}>
          <Text style={mc.confirmText}>Delete this clip from this device?</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Button label="Keep" size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => setConfirming(false)} />
            <Button label="Delete" size="sm" variant="danger" style={{ flex: 1 }} loading={busy}
              onPress={async () => { setBusy(true); await onDelete(); }} />
          </View>
        </View>
      ) : (
        <Button label="Delete" icon="trash-2" size="sm" variant="ghost" onPress={() => setConfirming(true)} style={{ margin: 8, marginTop: 0 }} />
      )}
    </View>
  );
}

export default function MyClipsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [clips, setClips] = useState<SavedClip[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setState('loading');
    try { setClips(await getClipLibrary()); setState('ready'); }
    catch { setState('error'); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const cellW = gridItemWidth(Math.min(width, 1160) - 36, 220, 12);

  return (
    <View style={mc.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }}>
        <Shell style={{ gap: 16 }}>
          <View style={mc.header}>
            <IconButton icon="arrow-left" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
            <View style={{ flex: 1 }}>
              <ScreenTitle kicker="Saved highlights" title="My clips" />
              <Text style={mc.meta}>{state === 'ready' ? `${clips.length} of 10 saved on this device` : 'Saved on this device only'}</Text>
            </View>
          </View>

          {state === 'loading' ? (
            <View style={mc.grid}>
              {[0, 1].map(i => <View key={i} style={[mc.skel, { width: cellW, height: cellW * 0.75 + 96 }]} />)}
            </View>
          ) : state === 'error' ? (
            <View style={mc.empty}>
              <Text style={mc.emptyTitle}>Clips could not be read</Text>
              <Text style={[mc.body, mc.emptyBody]}>Local storage returned an error. Your clips have not been changed.</Text>
              <Button label="Try again" onPress={() => void load()} />
            </View>
          ) : clips.length === 0 ? (
            <View style={mc.empty}>
              <Feather name="film" size={24} color={paperText.muted} />
              <Text style={mc.emptyTitle}>No clips yet</Text>
              <Text style={[mc.body, mc.emptyBody]}>During a match, use the capture button to keep a highlight. Save it from the results screen to see it here. Clips stay on this device and are not uploaded.</Text>
              <Button label="Go to Play" onPress={() => router.replace('/')} />
            </View>
          ) : (
            <View style={mc.grid}>
              {clips.map(clip => (
                <ClipCell
                  key={clip.id}
                  clip={clip}
                  width={cellW}
                  onOpen={() => router.push(`/clip-viewer?savedClipId=${clip.id}`)}
                  onDelete={async () => { await deleteClipFromLibrary(clip.id); setClips(prev => prev.filter(c => c.id !== clip.id)); }}
                />
              ))}
            </View>
          )}
        </Shell>
      </ScrollView>
    </View>
  );
}

const mc = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontFamily: fonts.display, fontSize: 32, color: palette.foreground },
  meta: { fontFamily: fonts.body, fontSize: 13, color: palette.muted },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: palette.supporting, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  skel: { backgroundColor: palette.surface, borderRadius: 3 },
  cell: { backgroundColor: palette.surface, borderWidth: 2, borderColor: palette.border, borderRadius: 0, overflow: 'hidden' },
  thumb: { width: '100%', aspectRatio: 4 / 3, backgroundColor: palette.background },
  noThumb: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  tier: { position: 'absolute', top: 8, left: 8, backgroundColor: palette.background, borderWidth: 2, borderColor: palette.border, borderRadius: 0, paddingHorizontal: 6, paddingVertical: 2 },
  tierText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: palette.foreground },
  info: { padding: 10, gap: 2 },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.foreground },
  confirm: { padding: 8, gap: 6, borderTopWidth: 1, borderTopColor: palette.border },
  confirmText: { fontFamily: fonts.body, fontSize: 14, color: palette.foreground },
  empty: { alignItems: 'center', gap: 12, padding: 24, borderWidth: 2, borderColor: palette.edge, borderRadius: 0, backgroundColor: palette.surface },
  emptyTitle: { fontFamily: fonts.display, fontSize: 24, color: paperText.ink },
  emptyBody: { color: paperText.ink },
});
