// Paddle Studio: manual artwork editor, saved designs rack, and AI revision bench.
// Paddle artwork stays cosmetic; the separate workshop isolates custom rules to practice/private play.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PaddleDesign } from '@workspace/api-client-react';

import { palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { ColorPicker } from '@/components/appearance/ColorPicker';
import { PaddleArt, sanitizeArtwork } from '@/components/cosmetics/PaddleArt';
import { AssistPanel } from '@/components/cosmetics/AssistPanel';
import { ColorSlotTabs, DensityStepper, MotifGrid, Notice, PlateButton, SectionLabel, TextureRow, type ColorSlot } from '@/components/cosmetics/StudioControls';
import { WorkshopPanel } from '@/components/cosmetics/WorkshopPanel';
import { cosmeticErrorMessage, MAX_DESIGNS, newDesignId, useCosmetics } from '@/hooks/useCosmetics';

const PRESETS = ['#F36B3F', '#EDBA3C', '#23344B', '#252A2B', '#575D5C', '#EEE9DE', '#E3DFD3', '#B4533A', '#7F9065', '#A9D3D5', '#C27E49', '#594824'] as const;

function freshDraft(): PaddleDesign | null {
  try { return { id: newDesignId(), name: 'Workshop plate', motif: 'chevron', base: '#23344B', ink: '#EEE9DE', accent: '#EDBA3C', density: 4, texture: 'etched' }; }
  catch { return null; }
}
const same = (a: PaddleDesign, b: PaddleDesign) =>
  a.name === b.name && a.motif === b.motif && a.base === b.base && a.ink === b.ink && a.accent === b.accent && a.density === b.density && a.texture === b.texture;

export default function PaddleStudio() {
  const params = useLocalSearchParams<{ id?: string; workshop?: string }>();
  const fromRoom = params.workshop === '1';
  const [section, setSection] = useState<'paddle' | 'workshop'>(fromRoom ? 'workshop' : 'paddle');
  useEffect(() => { if (fromRoom) setSection('workshop'); }, [fromRoom]);
  const { state, loading, error, reload, saveDesign, deleteDesign, equip, assist } = useCosmetics();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 900;
  const top = Platform.OS === 'web' ? 67 : insets.top;
  const bottom = Platform.OS === 'web' ? 34 : insets.bottom;

  const [draft, setDraft] = useState<PaddleDesign | null>(() => freshDraft());
  const [slot, setSlot] = useState<ColorSlot>('base');
  const [busy, setBusy] = useState<null | 'save' | 'equip' | string>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PaddleDesign | null>(null);
  const [drawer, setDrawer] = useState(false);
  const openedFor = useRef<string | null>(null);

  const designs = useMemo(() => state?.designs ?? [], [state]);
  const savedVersion = draft ? designs.find(d => d.id === draft.id) : undefined;
  const dirty = !!draft && (!savedVersion || !same(savedVersion, draft));
  const equipped = !!draft && state?.equippedSkin === draft.id;
  const full = !savedVersion && designs.length >= MAX_DESIGNS;
  const nameErr = draft && (draft.name.trim().length < 1 || draft.name.length > 32) ? 'Name needs 1 to 32 characters.' : null;

  // Open ?id=custom_... once the server list arrives.
  useEffect(() => {
    const id = typeof params.id === 'string' ? params.id : null;
    if (!id || openedFor.current === id || !state) return;
    openedFor.current = id;
    const found = state.designs.find(d => d.id === id);
    if (found) setDraft({ ...found });
    else setActionError('That design is not in your saved list. You are editing a new plate instead.');
  }, [params.id, state]);

  const patch = (p: Partial<PaddleDesign>) => { setStatus(null); setDraft(d => (d ? { ...d, ...p } : d)); };

  const doSave = async (thenEquip = false) => {
    if (!draft || nameErr) return;
    setBusy(thenEquip ? 'equip' : 'save'); setActionError(null); setStatus(null);
    try {
      const clean: PaddleDesign = { ...draft, ...sanitizeArtwork(draft), name: draft.name.trim() };
      if (dirty) await saveDesign(clean);
      if (thenEquip) await equip('skin', clean.id);
      setDraft(clean);
      setStatus(thenEquip ? 'Saved and equipped for your next match.' : 'Saved to your rack.');
    } catch (e) { setActionError(cosmeticErrorMessage(e)); }
    finally { setBusy(null); }
  };

  const doDelete = async (d: PaddleDesign) => {
    setBusy(d.id); setActionError(null); setStatus(null);
    try {
      await deleteDesign(d.id);
      setConfirmDelete(null);
      if (draft?.id === d.id) setDraft(freshDraft());
      setStatus(`Deleted ${d.name}.`);
    } catch (e) { setActionError(cosmeticErrorMessage(e)); }
    finally { setBusy(null); }
  };

  const newPlate = () => { setActionError(null); setStatus(null); const f = freshDraft(); if (f) setDraft(f); else setActionError('This device cannot create a secure design id.'); };

  const header = (
    <View style={[s.header, { paddingTop: top + 8 }]}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button" accessibilityLabel="Back" style={s.back} testID="studio-back">
        <Text style={s.backText}>Back</Text>
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={s.kicker}>Equipment workshop</Text>
        <Text style={s.title} accessibilityRole="header">{section === 'paddle' ? 'Paddle Studio' : 'Court Workshop'}</Text>
      </View>
      {state ? (
        <View style={s.coins} accessibilityLabel={`${state.balance} verified online coins`}>
          <Text style={s.coinNum}>{state.balance}</Text><Text style={s.coinLbl}>online coins</Text>
        </View>
      ) : null}
      <View style={[s.switcher, {width:'100%'}]} accessibilityRole="tablist">
        {(['paddle', 'workshop'] as const).map(k => (
          <Pressable key={k} onPress={() => setSection(k)} accessibilityRole="tab" accessibilityState={{ selected: section === k }} aria-selected={section === k} testID={`studio-tab-${k}`}
            style={[s.switchTab, {flex:1}, section === k && s.switchOn]}>
            <Text style={[s.switchText, section === k && { color: palette.onAccent }]}>{k === 'paddle' ? 'Paddle' : 'Court, hits, rules'}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  if (!draft) {
    return <View style={s.screen}><Stack.Screen options={{ headerShown: false }} />{header}
      <View style={s.pad}><Notice tone="error" text="This device cannot create a secure design id, so designs cannot be saved here." /></View></View>;
  }

  if (section === 'workshop') {
    return (
      <View style={s.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        {header}
        <ScrollView contentContainerStyle={[s.pad, { paddingBottom: bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <WorkshopPanel initialMode={fromRoom ? 'private' : 'preview'} />
        </ScrollView>
      </View>
    );
  }

  const preview = (
    <View style={s.bench}>
      <View style={s.court}>
        <View style={s.courtLine} />
        <View style={s.paddleWrap}><PaddleArt design={draft} width={Math.min(width - 96, 300)} height={56} /></View>
        <Text style={s.courtNote}>Artwork only. Paddle size and handling stay identical.</Text>
      </View>
      <View style={s.nameRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.fieldLbl} nativeID="name-lbl">Name</Text>
          <TextInput testID="design-name" value={draft.name} maxLength={32} onChangeText={t => patch({ name: t })}
            accessibilityLabel="Design name" aria-invalid={!!nameErr} style={[s.nameInput, nameErr && s.inputErr]} />
          <Text style={s.hint}>{nameErr ?? `${draft.name.length}/32${savedVersion ? (dirty ? '  Unsaved changes' : '  Saved') : '  New, not saved'}${equipped ? '  Equipped' : ''}`}</Text>
        </View>
      </View>
      <View style={s.actions}>
        <PlateButton tone="orange" label={equipped && !dirty ? 'Equipped' : 'Save and equip'} onPress={() => doSave(true)}
          busy={busy === 'equip'} disabled={!!busy || !!nameErr || full || !state || (equipped && !dirty)} testID="save-equip" style={{ flex: 1 }} />
        <PlateButton label="Save" onPress={() => doSave(false)} busy={busy === 'save'} disabled={!!busy || !!nameErr || !dirty || full || !state} testID="save" style={{ flex: 1 }} />
      </View>
      {full ? <Notice tone="error" text={`Your rack holds ${MAX_DESIGNS} designs. Delete one to save this plate.`} /> : null}
      {actionError ? <Notice tone="error" text={actionError} action="Dismiss" onAction={() => setActionError(null)} /> : null}
      {status ? <Notice tone="info" text={status} /> : null}
    </View>
  );

  const editor = (
    <View style={{ gap: 22 }}>
      <View><SectionLabel aside="8 patterns">Motif</SectionLabel><MotifGrid draft={draft} onPick={m => patch({ motif: m })} /></View>
      <View>
        <SectionLabel aside="3 inks">Colour</SectionLabel>
        <ColorSlotTabs draft={draft} slot={slot} onSlot={setSlot} />
        <View style={{ marginTop: 12 }}>
          <ColorPicker key={slot} testID={`picker-${slot}`} value={draft[slot]} presets={PRESETS} onChange={hex => patch({ [slot]: hex.toUpperCase() } as Partial<PaddleDesign>)} />
        </View>
      </View>
      <View><SectionLabel aside={`${draft.density} of 8`}>Density</SectionLabel><DensityStepper value={draft.density} onChange={n => patch({ density: Math.max(2, Math.min(8, n)) })} /></View>
      <View><SectionLabel>Texture</SectionLabel><TextureRow value={draft.texture} onPick={t => patch({ texture: t })} /></View>
    </View>
  );

  const rack = (
    <View>
      <SectionLabel aside={state ? `${designs.length} of ${MAX_DESIGNS}` : undefined}>Your rack</SectionLabel>
      {loading ? (
        <View style={s.loadingRow} accessibilityLiveRegion="polite"><ActivityIndicator color={palette.foreground} /><Text style={s.hint}>Loading saved designs from the arena server.</Text></View>
      ) : error ? (
        <Notice tone="error" text={`Saved designs could not load. ${error}`} action="Retry" onAction={() => reload()} />
      ) : designs.length === 0 ? (
        <View style={s.empty}><Text style={s.emptyTitle}>Empty rack</Text><Text style={s.hint}>Save your first plate and it hangs here, ready to equip from any device signed into this player.</Text></View>
      ) : (
        <View style={{ gap: 8 }}>
          {designs.map(d => {
            const active = d.id === draft.id;
            const on = state?.equippedSkin === d.id;
            return (
              <View key={d.id} style={[s.rackItem, active && s.rackActive]}>
                <Pressable style={s.rackMain} onPress={() => { setStatus(null); setActionError(null); setDraft({ ...d }); }} accessibilityRole="button"
                  accessibilityLabel={`Edit ${d.name}${on ? ', equipped' : ''}`} testID={`rack-${d.id}`}>
                  <PaddleArt design={d} width={84} height={20} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.rackName} numberOfLines={1}>{d.name}</Text>
                    <Text style={s.hint}>{on ? 'Equipped' : active ? 'Editing' : 'Tap to edit'}</Text>
                  </View>
                </Pressable>
                <PlateButton label="Delete" onPress={() => setConfirmDelete(d)} disabled={!!busy} testID={`delete-${d.id}`} />
              </View>
            );
          })}
        </View>
      )}
      <PlateButton tone="navy" label="New plate" onPress={newPlate} testID="new-plate" style={{ marginTop: 12 }} />
    </View>
  );

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      {header}
      <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column' }}>
        <ScrollView contentContainerStyle={[s.pad, { paddingBottom: bottom + (wide ? 24 : 96) }]} style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <View style={wide ? s.wideGrid : { gap: 24 }}>
            <View style={wide ? { flex: 1, gap: 24 } : { gap: 24 }}>{preview}{rack}</View>
            <View style={wide ? { flex: 1.2 } : undefined}>{editor}</View>
          </View>
        </ScrollView>
        {wide ? (
          <ScrollView style={s.side} contentContainerStyle={[s.pad, { paddingBottom: bottom + 24 }]} keyboardShouldPersistTaps="handled">
            <AssistPanel draft={draft} assist={assist} onApply={d => { setDraft(d); setStatus('Suggestion applied to your draft. Save to keep it.'); }} />
          </ScrollView>
        ) : null}
      </View>

      {!wide ? (
        <View style={[s.dock, { paddingBottom: bottom + 10 }]}>
          <PlateButton tone="gold" label="Design help" onPress={() => setDrawer(true)} testID="open-assist" style={{ flex: 1 }} />
        </View>
      ) : null}

      <Modal visible={drawer && !wide} transparent animationType="slide" onRequestClose={() => setDrawer(false)}>
        <View style={s.scrim}>
          <Pressable style={{ flex: 1 }} onPress={() => setDrawer(false)} accessibilityLabel="Close design help" />
          <ScrollView style={s.drawer} contentContainerStyle={[s.pad, { paddingBottom: bottom + 24 }]} keyboardShouldPersistTaps="handled">
            <AssistPanel draft={draft} assist={assist} onClose={() => setDrawer(false)}
              onApply={d => { setDraft(d); setDrawer(false); setStatus('Suggestion applied to your draft. Save to keep it.'); }} />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={!!confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
        <View style={[s.scrim, { justifyContent: 'center', padding: 20 }]}>
          {confirmDelete ? (
            <View style={s.dialog} accessibilityViewIsModal>
              <Text style={s.dialogTitle}>Delete {confirmDelete.name}?</Text>
              <PaddleArt design={confirmDelete} width={180} height={40} />
              <Text style={s.hint}>{state?.equippedSkin === confirmDelete.id ? 'It is equipped now. Your paddle returns to the server default.' : 'This removes it from your rack on every device.'}</Text>
              {actionError ? <Notice tone="error" text={actionError} /> : null}
              <View style={s.actions}>
                <PlateButton tone="orange" label="Delete" busy={busy === confirmDelete.id} onPress={() => doDelete(confirmDelete)} testID="confirm-delete" style={{ flex: 1 }} />
                <PlateButton label="Keep" onPress={() => setConfirmDelete(null)} disabled={!!busy} testID="cancel-delete" style={{ flex: 1 }} />
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  header: { flexDirection: 'row', flexWrap:'wrap', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: palette.surface, borderBottomWidth: 3, borderColor: palette.edge },
  back: { minHeight: 44, minWidth: 64, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: palette.edge, borderRadius: 8, backgroundColor: palette.background },
  backText: { fontFamily: fonts.display, fontSize: 16, letterSpacing: 1, color: palette.foreground, textTransform: 'uppercase' },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 2, color: palette.supporting, textTransform: 'uppercase' },
  title: { fontFamily: fonts.display, fontSize: 26, color: palette.foreground, letterSpacing: 0.5 },
  coins: { backgroundColor: palette.gold, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.edge, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center', borderRadius: 8 },
  coinNum: { fontFamily: fonts.display, fontSize: 20, color: palette.onAccent },
  coinLbl: { fontFamily: fonts.bodyBold, fontSize: 11, color: palette.onAccent, textTransform: 'uppercase' },
  pad: { padding: 16, gap: 24 },
  wideGrid: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  bench: { gap: 12 },
  court: { backgroundColor: palette.inset, borderWidth: 3, borderBottomWidth: 7, borderColor: palette.edge, paddingVertical: 28, alignItems: 'center', gap: 16, borderRadius: 8, overflow: 'hidden' },
  courtLine: { position: 'absolute', left: 0, right: 0, top: '50%', height: 2, backgroundColor: palette.background, opacity: 0.25 },
  paddleWrap: { borderRadius: 10, borderWidth: 2, borderColor: palette.edge },
  courtNote: { fontFamily: fonts.bodyMedium, fontSize: 13, color: palette.foreground },
  nameRow: { flexDirection: 'row' },
  fieldLbl: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 1, color: palette.foreground, textTransform: 'uppercase', marginBottom: 4 },
  nameInput: { minHeight: 48, borderWidth: 2, borderColor: palette.edge, backgroundColor: palette.surface, paddingHorizontal: 12, fontFamily: fonts.display, fontSize: 22, color: palette.foreground, borderRadius: 8 },
  inputErr: { borderColor: palette.primary, borderRadius: 10, borderWidth: 3 },
  hint: { fontFamily: fonts.body, fontSize: 14, color: palette.supporting, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8 },
  loadingRow: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12 },
  empty: { padding: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: palette.border, borderRadius: 8 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: palette.foreground, textTransform: 'uppercase' },
  rackItem: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderWidth: 2, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: 8 },
  rackActive: { borderColor: palette.edge, borderLeftWidth: 8, borderLeftColor: palette.primary },
  rackMain: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rackName: { fontFamily: fonts.display, fontSize: 18, color: palette.foreground },
  side: { width: 380, flexGrow: 0, backgroundColor: palette.surface, borderLeftWidth: 3, borderColor: palette.edge },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, backgroundColor: palette.surface, borderTopWidth: 3, borderColor: palette.edge },
  scrim: { flex: 1, backgroundColor: 'rgba(37,42,43,0.55)' },
  drawer: { maxHeight: '85%', flexGrow: 0, backgroundColor: palette.surface, borderTopWidth: 3, borderColor: palette.edge },
  dialog: { backgroundColor: palette.background, borderWidth: 3, borderBottomWidth: 7, borderColor: palette.edge, padding: 18, gap: 14, alignItems: 'stretch', maxWidth: 420, width: '100%', alignSelf: 'center', borderRadius: 8 },
  switcher: { flexDirection: 'row', gap: 6, marginTop: 6 },
  switchTab: { minHeight: 36, paddingHorizontal: 10, justifyContent: 'center', borderWidth: 2, borderColor: palette.edge, borderRadius: 8, backgroundColor: palette.background },
  switchOn: { backgroundColor: palette.gold },
  switchText: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.foreground, textTransform: 'uppercase', letterSpacing: 0.8 },
  dialogTitle: { fontFamily: fonts.display, fontSize: 24, color: palette.foreground },
});
