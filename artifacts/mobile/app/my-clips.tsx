/**
 * My Clips, library of saved highlight clips.
 * Tap a clip to open it in the full clip viewer/editor.
 * Long-press to delete.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Dimensions, Pressable,
  RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from '@/components/ui/Flat';
import Reanimated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { getClipLibrary, deleteClipFromLibrary, type SavedClip } from '@/store/clipLibrary';
import { Glyph } from '@/components/ui/Glyph';

const { width: SW } = Dimensions.get('window');
const CELL_W = (SW - 48) / 2;
const CELL_H = CELL_W * 0.75 + 60; // gif area + info bar

const TYPE_LABEL: Record<string, string> = {
  multi_block: 'MULTI-BLOCK',
  near_death:  'NEAR-DEATH',
  hot_streak:  'HOT STREAK',
  manual:      'SAVED',
};

function ClipCell({ clip, onOpen, onDelete }: {
  clip: SavedClip;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const gifUri = `data:image/gif;base64,${clip.gifBase64}`;

  function confirmDelete() {
    Alert.alert('Delete clip?', 'This clip will be permanently removed from your library.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(clip.id) },
    ]);
  }

  const date = new Date(clip.timestamp);
  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <Reanimated.View entering={ZoomIn.duration(350).springify()} style={mc.cell}>
      <Pressable
        onPress={() => onOpen(clip.id)}
        onLongPress={confirmDelete}
        delayLongPress={600}
        style={({ pressed }) => [mc.cellInner, { opacity: pressed ? 0.85 : 1 }]}
      >
        {/* GIF thumbnail */}
        <View style={mc.gifWrap}>
          <Image
            source={{ uri: gifUri }}
            style={mc.gif}
            contentFit="cover"
            autoplay
          />
          {/* Sticker overlay */}
          {clip.sticker && (
            <Glyph style={mc.stickerOverlay} value={clip.sticker} />
          )}
          {/* Tier badge */}
          <View style={[mc.tierBadge, { backgroundColor: clip.tierColor + '30', borderColor: clip.tierColor + '66' }]}>
            <Text style={[mc.tierTxt, { color: clip.tierColor }]}>{clip.tier.toUpperCase()}</Text>
          </View>
          {/* Play indicator */}
          <View style={mc.playDot} />
        </View>

        {/* Info row */}
        <View style={mc.infoRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={mc.typeLabel}>{TYPE_LABEL[clip.type] ?? clip.type.toUpperCase()}</Text>
            {clip.caption ? (
              <Text style={mc.caption} numberOfLines={1}>{clip.caption}</Text>
            ) : (
              <Text style={mc.dateLabel}>{dateStr} · {clip.score} hits</Text>
            )}
          </View>
          <Feather name="chevron-right" size={14} color="#ECE7DC22" />
        </View>
      </Pressable>
    </Reanimated.View>
  );
}

export default function MyClipsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [clips,     setClips]     = useState<SavedClip[]>([]);
  const [loading,   setLoading]   = useState(true);

  async function load() {
    setLoading(true);
    const lib = await getClipLibrary();
    setClips(lib);
    setLoading(false);
  }

  // Reload every time the screen comes into focus (after saving from clip-viewer)
  useFocusEffect(useCallback(() => { load(); }, []));

  async function handleDelete(id: string) {
    await deleteClipFromLibrary(id);
    setClips(prev => prev.filter(c => c.id !== id));
  }

  return (
    <View style={mc.root}>
      <LinearGradient colors={['#16171A', '#16171A', '#16171A']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[mc.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} style={mc.backBtn} hitSlop={12}>
          <Feather name="chevron-left" size={22} color="#ECE7DC88" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={mc.title}>MY CLIPS</Text>
          <Text style={mc.subtitle}>{clips.length} / 10 saved</Text>
        </View>
        {/* Sort hint */}
        <Text style={mc.sortHint}>Newest first</Text>
      </View>

      {/* Empty state */}
      {!loading && clips.length === 0 && (
        <Reanimated.View entering={FadeIn.duration(500)} style={mc.emptyWrap}>
          <Glyph style={{ fontSize: 52 }} value="🎬" />
          <Text style={mc.emptyTitle}>No clips yet</Text>
          <Text style={mc.emptySub}>
            Record a highlight during a match and save it to see it here.
          </Text>
          <Pressable onPress={() => router.replace('/lobby')}
            style={mc.playBtn}>
            <LinearGradient colors={['#C99A2E', '#C99A2E']} style={mc.playBtnGrad}>
              <Text style={mc.playBtnTxt}>PLAY NOW</Text>
            </LinearGradient>
          </Pressable>
        </Reanimated.View>
      )}

      {/* Clip grid */}
      {clips.length > 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#C99A2E" />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 80, gap: 12 }}
        >
          {/* Stats row */}
          <Reanimated.View entering={FadeInDown.duration(400)} style={mc.statsRow}>
            {[
              { label: 'SAVED', value: String(clips.length) },
              { label: 'TOP TIER', value: clips.find(c => c.tier === 'Legendary')?.tier ?? clips[0]?.tier ?? '-' },
              { label: 'BEST SCORE', value: String(Math.max(...clips.map(c => c.clipScore))) },
            ].map(s => (
              <View key={s.label} style={mc.statCell}>
                <Text style={mc.statVal}>{s.value}</Text>
                <Text style={mc.statLbl}>{s.label}</Text>
              </View>
            ))}
          </Reanimated.View>

          {/* Grid */}
          <View style={mc.grid}>
            {clips.map(clip => (
              <ClipCell
                key={clip.id}
                clip={clip}
                onOpen={id => router.push(`/clip-viewer?savedClipId=${id}`)}
                onDelete={handleDelete}
              />
            ))}
          </View>

          <Text style={mc.hintTxt}>Long-press a clip to delete it</Text>
        </ScrollView>
      )}
    </View>
  );
}

const mc = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#16171A' },

  // Header
  header:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#ECE7DC0A' },
  backBtn:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title:    { fontFamily: 'BarlowCondensed_700Bold', fontSize: 22, color: '#ECE7DC', letterSpacing: 2 },
  subtitle: { fontFamily: 'SourceSans3_400Regular', fontSize: 10, color: '#ECE7DC44', letterSpacing: 0.5 },
  sortHint: { fontFamily: 'SourceSans3_400Regular', fontSize: 9, color: '#ECE7DC33', letterSpacing: 0.5 },

  // Empty
  emptyWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 24, color: '#ECE7DC88', letterSpacing: 1 },
  emptySub:   { fontFamily: 'SourceSans3_400Regular', fontSize: 13, color: '#ECE7DC44', textAlign: 'center', lineHeight: 20 },
  playBtn:    { borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  playBtnGrad:{ paddingHorizontal: 32, paddingVertical: 14 },
  playBtnTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 15, color: '#16171A', letterSpacing: 1 },

  // Stats
  statsRow: { flexDirection: 'row', backgroundColor: '#ECE7DC06', borderRadius: 3, borderWidth: 1, borderColor: '#ECE7DC0D', padding: 14, justifyContent: 'space-around' },
  statCell: { alignItems: 'center', gap: 2 },
  statVal:  { fontFamily: 'BarlowCondensed_700Bold', fontSize: 20, color: '#C99A2E', letterSpacing: 1 },
  statLbl:  { fontFamily: 'SourceSans3_700Bold', fontSize: 8, color: '#ECE7DC44', letterSpacing: 2 },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' },
  cell: { width: CELL_W },
  cellInner: { borderRadius: 3, overflow: 'hidden', backgroundColor: '#16171A', borderWidth: 1, borderColor: '#ECE7DC0D' },

  // GIF thumbnail
  gifWrap:      { width: CELL_W, height: CELL_W * 0.75, backgroundColor: '#16171A', position: 'relative' },
  gif:          { width: '100%', height: '100%' },
  stickerOverlay: { position: 'absolute', bottom: 6, right: 6, fontSize: 26 },
  tierBadge:    { position: 'absolute', top: 6, left: 6, borderRadius: 3, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  tierTxt:      { fontFamily: 'SourceSans3_700Bold', fontSize: 7, letterSpacing: 1 },
  playDot:      { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#B4533A', borderWidth: 1, borderColor: '#ECE7DC55' },

  // Info row
  infoRow:  { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 6 },
  typeLabel:{ fontFamily: 'SourceSans3_700Bold', fontSize: 9, color: '#ECE7DC88', letterSpacing: 1.5 },
  caption:  { fontFamily: 'SourceSans3_400Regular', fontSize: 10, color: '#ECE7DC55', letterSpacing: 0.2 },
  dateLabel:{ fontFamily: 'SourceSans3_400Regular', fontSize: 9, color: '#ECE7DC33' },

  hintTxt: { fontFamily: 'SourceSans3_400Regular', fontSize: 10, color: '#ECE7DC22', textAlign: 'center', paddingVertical: 8 },
});
