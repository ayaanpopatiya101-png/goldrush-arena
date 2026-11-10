// Saved players on this device: continue, delete with confirmation, or open by exact name.
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Glyph } from '@/components/ui/Glyph';
import { Button } from '@/components/ui/Primitives';
import { palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { SavedAccountMeta } from '@/context/PlayerContext';
import { findSavedPlayer } from '@/utils/onboarding';
import { Heading, StepFrame, k } from './kit';
import { LegalLinks } from './Steps';

interface Props {
  accounts: SavedAccountMeta[]; loaded: boolean; loadError: boolean; onRetryLoad: () => void;
  onBack: () => void; onOpen: (a: SavedAccountMeta) => void; onDelete: (name: string) => Promise<void>;
  onNew: () => void; busyName: string | null; error: string; onLegal: (d: 'terms' | 'privacy') => void;
}

export function SavedStep({ accounts, loaded, loadError, onRetryLoad, onBack, onOpen, onDelete, onNew, busyName, error, onLegal }: Props) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState('');
  const [query, setQuery] = useState('');
  const [queryErr, setQueryErr] = useState('');

  async function del(name: string) {
    setDeleting(true); setDelError('');
    try { await onDelete(name); setConfirm(null); }
    catch { setDelError(`${name} could not be deleted completely. Connect to the internet to remove its server photo and online access, then retry.`); }
    finally { setDeleting(false); }
  }
  function openByName() {
    const q = query.trim();
    if (!q) { setQueryErr('Enter the player name saved on this device.'); return; }
    const hit = findSavedPlayer(q, accounts);
    if (!hit) { setQueryErr(`No player named ${q} is saved on this device.`); return; }
    onOpen(hit);
  }

  return (
    <StepFrame testID="entry-saved-step" onBack={onBack} backLabel="Back"
      footer={<Button testID="entry-saved-new" label="Create a new player instead" variant="secondary" size="lg" onPress={onNew} />}>
      <Heading kicker="This device" title="Saved players" body="Local saves, not online accounts. Pick up where you left off." />

      {!loaded ? (
        <View style={[s.row, { height: 72, backgroundColor: palette.raised }]} accessibilityLabel="Loading saved players" />
      ) : loadError ? (
        <View style={s.empty}>
          <Text style={k.error} accessibilityRole="alert">Saved players could not be read.</Text>
          <Button testID="entry-saved-retry" label="Try again" size="sm" variant="secondary" onPress={onRetryLoad} />
        </View>
      ) : accounts.length === 0 ? (
        <View style={s.empty}>
          <Feather name="user-x" size={22} color={palette.muted} />
          <Text style={k.help}>No players are saved on this device yet.</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {accounts.map(a => (
            <View key={a.username} style={s.row}>
              {confirm === a.username ? (
                <View style={s.confirm}>
                   <Text style={s.confirmText}>Delete {a.username}, its saved photo and all local progress? This cannot be undone. Online players need a connection to revoke their photo and online access safely.</Text>
                  {delError ? <Text style={k.error} accessibilityRole="alert">{delError}</Text> : null}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}><Button testID={`entry-saved-keep-${a.username}`} label="Keep" variant="secondary" size="sm" onPress={() => { setConfirm(null); setDelError(''); }} /></View>
                    <View style={{ flex: 1 }}><Button testID={`entry-saved-confirm-delete-${a.username}`} label="Delete" variant="danger" size="sm" loading={deleting} onPress={() => void del(a.username)} /></View>
                  </View>
                </View>
              ) : (
                <>
                  <Pressable
                    testID={`entry-saved-open-${a.username}`}
                    onPress={() => onOpen(a)}
                    disabled={!!busyName}
                    accessibilityRole="button"
                    accessibilityLabel={`Continue as ${a.username}, ${a.rank}`}
                    accessibilityState={{ disabled: !!busyName, busy: busyName === a.username }}
                    aria-disabled={!!busyName}
                    style={({ pressed }) => [s.main, pressed && { backgroundColor: palette.raised }]}
                  >
                    <View style={[s.avatar, { borderColor: a.avatarColor }]}>
                      <Glyph value={a.avatarEmoji} size={22} color={palette.foreground} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.name} numberOfLines={1}>{a.username}</Text>
                      <Text style={k.help}>{a.rank}</Text>
                    </View>
                    <Text style={s.cont}>{busyName === a.username ? 'Opening' : 'Continue'}</Text>
                  </Pressable>
                  <Pressable
                    testID={`entry-saved-delete-${a.username}`}
                    onPress={() => { setConfirm(a.username); setDelError(''); }}
                    style={s.del}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${a.username} from this device`}
                  >
                    <Feather name="trash-2" size={18} color={palette.supporting} />
                  </Pressable>
                </>
              )}
            </View>
          ))}
        </View>
      )}

      {error ? <Text style={k.error} accessibilityRole="alert">{error}</Text> : null}

      {loaded && accounts.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Text style={k.label}>Open by name</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              testID="entry-saved-name"
              style={s.input}
              placeholder="Saved player name"
              placeholderTextColor={palette.muted}
              value={query}
              onChangeText={v => { setQuery(v); setQueryErr(''); }}
              autoCapitalize="none" autoCorrect={false} returnKeyType="go"
              onSubmitEditing={openByName}
              accessibilityLabel="Saved player name"
            />
            <Button testID="entry-saved-name-open" label="Open" onPress={openByName} />
          </View>
          {queryErr ? <Text style={k.error} accessibilityLiveRegion="polite">{queryErr}</Text> : null}
        </View>
      ) : null}
      <LegalLinks onOpen={onLegal} />
    </StepFrame>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', borderWidth: 2, borderBottomWidth: 5, borderColor: palette.edge, backgroundColor: palette.background, borderRadius: 0, overflow: 'hidden' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 64 },
  avatar: { width: 44, height: 44, borderWidth: 3, borderRadius: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
  name: { fontFamily: fonts.display, fontSize: 22, color: palette.foreground, textTransform: 'uppercase' },
  cont: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.foreground },
  del: { width: 52, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 2, borderLeftColor: palette.edge, backgroundColor: palette.surface },
  confirm: { flex: 1, padding: 12, gap: 10 },
  confirmText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: palette.foreground },
  empty: { gap: 10, alignItems: 'flex-start', padding: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.border, backgroundColor: palette.surface },
  input: { flex: 1, minHeight: 48, borderWidth: 2, borderColor: palette.edge, borderRadius: 0, backgroundColor: palette.background, color: palette.foreground, fontFamily: fonts.body, fontSize: 17, paddingHorizontal: 12 },
});
