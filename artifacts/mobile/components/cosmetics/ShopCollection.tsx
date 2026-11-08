// Collection view: owned finishes (server + preserved device ownership), saved
// Studio designs, themes and hit effects. Equip/try/edit/delete all wired.
import React, { useRef, useState } from 'react';
import { Modal, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { PADDLE_FINISHES, THEME_FINISHES, STRIKE_FINISHES, artworkFor, type Artwork } from '@workspace/goldrush-catalog/cosmetics';

import { cosmeticErrorMessage, MAX_DESIGNS } from '@/hooks/useCosmetics';
import { useBlockingOverlay } from '@/context/OverlayQueue';
import { PaddleArt } from '@/components/cosmetics/PaddleArt';
import { gridItemWidth } from '@/components/ui/Primitives';
import {
  Plate, ShopWalletStrip, StrikeSwatch, ThemeSwatch, startDesignTrial, startTrial, st, useCosmeticOwnership,
  type CosmeticKind,
} from '@/components/cosmetics/ShopCatalog';

export function CollectionPanel({ section }: { section: 'skins' | 'themes' | 'hits' }) {
  const own = useCosmeticOwnership();
  const { cos } = own;
  const { width } = useWindowDimensions();
  const cardW = gridItemWidth(Math.min(width, 1160) - 36, 160, 10);
  const lock = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const delVisible = useBlockingOverlay(!!deleting);

  async function act(key: string, fn: () => Promise<unknown>, fail: string) {
    if (lock.current) return;
    lock.current = true; setBusy(key); setErr(null);
    try { await fn(); } catch (e) { setErr(cosmeticErrorMessage(e, fail)); }
    finally { lock.current = false; setBusy(null); }
  }

  const ready = !!cos.state;
  const kind: CosmeticKind = section === 'skins' ? 'skin' : section === 'themes' ? 'theme' : 'strike';
  const list = (kind === 'skin' ? PADDLE_FINISHES : kind === 'theme' ? THEME_FINISHES : STRIKE_FINISHES)
    .filter(i => own.isOwned(kind, i.id));
  const equipped = own.equippedId(kind);
  const designs = cos.state?.designs ?? [];

  const status = cos.loading ? (
    <View style={st.banner}><Text style={st.bannerText}>Loading your online collection</Text></View>
  ) : cos.error ? (
    <View style={[st.banner, { borderColor: '#F36B3F' }]}>
      <Text style={st.bannerText}>{cos.error} Device-owned items are shown; online items appear once connected.</Text>
      <Plate label="Retry" tone="orange" onPress={() => { void cos.reload(); }} />
    </View>
  ) : null;

  return (
    <View style={{ gap: 14 }}>
      {section === 'skins' && <ShopWalletStrip />}
      {status}
      {err && (
        <View style={[st.banner, { borderColor: '#F36B3F' }]} accessibilityLiveRegion="polite">
          <Text style={st.bannerText}>{err}</Text>
          <Plate label="Dismiss" onPress={() => setErr(null)} />
        </View>
      )}

      <View style={st.secHead}>
        <Text style={st.secTitle} accessibilityRole="header">
          {kind === 'skin' ? 'Paddle finishes' : kind === 'theme' ? 'Court themes' : 'Hit effects'}
        </Text>
        <View style={st.rule} />
        <Text style={st.secAside}>{list.length} owned</Text>
      </View>
      <View style={st.grid}>
        {list.map(item => {
          const key = `${kind}:${item.id}`;
          const on = equipped === item.id;
          const deviceOnly = !own.serverOwns(kind, item.id);
          return (
            <View key={key} style={[st.card, { width: cardW }, on && st.cardOn]}>
              <View style={st.preview}>
                {kind === 'skin' && <PaddleArt design={artworkFor(item.id)} width={Math.min(cardW - 28, 150)} height={22} />}
                {kind === 'theme' && <ThemeSwatch id={item.id} size={Math.min(cardW - 24, 150)} />}
                {kind === 'strike' && <StrikeSwatch id={item.id} size={Math.min(cardW - 24, 150)} />}
              </View>
              <Text style={st.cardName} numberOfLines={1}>{item.name}</Text>
              <Text style={st.cardMeta}>{on ? 'Equipped' : deviceOnly ? 'Owned on this device' : 'Owned online'}</Text>
              {!on && <Plate label="Equip" tone="gold" busy={busy === key} disabled={!!busy || (!ready && !deviceOnly)}
                onPress={() => { void act(key, () => own.equipItem(kind, item.id), 'Could not equip. Nothing changed.'); }} />}
              <Plate label="Try on court" onPress={() => startTrial(kind, item.id)} />
            </View>
          );
        })}
      </View>
      {kind === 'strike' && (
        <Text style={st.tiny}>Hit effects mark paddle contacts and goals. They are visual only and separate from Gold Strike reward blocks.</Text>
      )}

      {kind === 'skin' && (
        <>
          <View style={st.secHead}>
            <Text style={st.secTitle} accessibilityRole="header">Your designs</Text>
            <View style={st.rule} />
            <Text style={st.secAside}>{designs.length}/{MAX_DESIGNS}</Text>
          </View>
          {designs.length === 0 ? (
            <View style={st.setCard}>
              <PaddleArt design={artworkFor('default')} width={120} height={22} />
              <View style={{ flex: 1, gap: 6, minWidth: 180 }}>
                <Text style={st.setTitle}>No saved designs</Text>
                <Text style={st.setBody}>Paint a paddle in the Studio. Designs are free and saved to your online profile.</Text>
                <Plate label="Open Paddle Studio" tone="orange" onPress={() => router.push('/paddle-studio')} />
              </View>
            </View>
          ) : (
            <View style={st.grid}>
              {designs.map(d => {
                const key = `design:${d.id}`;
                const on = cos.state?.equippedSkin === d.id;
                return (
                  <View key={d.id} style={[st.card, { width: cardW }, on && st.cardOn]}>
                    <View style={st.preview}><PaddleArt design={d as unknown as Artwork} width={Math.min(cardW - 28, 150)} height={22} /></View>
                    <Text style={st.cardName} numberOfLines={1}>{d.name}</Text>
                    <Text style={st.cardMeta}>{on ? 'Equipped' : 'Custom design'}</Text>
                    {!on && <Plate label="Equip" tone="gold" busy={busy === key} disabled={!!busy}
                      onPress={() => { void act(key, () => cos.equip('skin', d.id), 'Could not equip this design.'); }} />}
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <View style={{ flex: 1 }}><Plate label="Edit" onPress={() => router.push({ pathname: '/paddle-studio', params: { id: d.id } })} /></View>
                      <View style={{ flex: 1 }}><Plate label="Try" onPress={() => startDesignTrial(d.id)} /></View>
                    </View>
                    <Plate label="Delete" disabled={!!busy} onPress={() => setDeleting({ id: d.id, name: d.name })} />
                  </View>
                );
              })}
            </View>
          )}
          {designs.length > 0 && designs.length < MAX_DESIGNS && (
            <Plate label="New design in Studio" tone="orange" onPress={() => router.push('/paddle-studio')} />
          )}
        </>
      )}

      {list.length <= 1 && kind !== 'skin' && (
        <View style={st.banner}>
          <Text style={st.bannerText}>More {kind === 'theme' ? 'court themes' : 'hit effects'} are in the Shop. Try any of them on court first.</Text>
          <Plate label="Browse Shop" onPress={() => router.push('/shop')} />
        </View>
      )}

      <Modal visible={delVisible} transparent animationType="fade" onRequestClose={() => { if (!busy) setDeleting(null); }}>
        <View style={st.backdrop}>
          {deleting && (
            <View style={st.sheet} accessibilityViewIsModal>
              <Text style={st.sheetTitle} accessibilityRole="header">Delete {deleting.name}?</Text>
              <Text style={st.sheetLine}>This removes the saved design from your online profile. If it is equipped, your paddle returns to Classic.</Text>
              <View style={st.sheetRow}>
                <View style={{ flex: 1 }}><Plate label="Keep" disabled={!!busy} onPress={() => setDeleting(null)} /></View>
                <View style={{ flex: 1 }}><Plate label="Delete" tone="orange" busy={busy === `del:${deleting.id}`}
                  onPress={() => {
                    const id = deleting.id;
                    void act(`del:${id}`, async () => { await cos.deleteDesign(id); setDeleting(null); }, 'Could not delete. The design is still saved.')
                      .then(() => setDeleting(cur => (cur?.id === id ? null : cur)));
                  }} /></View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

export default CollectionPanel;
