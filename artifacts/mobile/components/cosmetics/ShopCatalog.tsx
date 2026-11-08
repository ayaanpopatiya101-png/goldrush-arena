// Server-verified cosmetic shop: online wallet, buy/equip/try, Cobalt matching offer.
// Purchases only go through useCosmetics().purchase. The legacy device balance is
// displayed for context but never sent, spent or used as proof here.
import React, { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import {
  PADDLE_FINISHES, THEME_FINISHES, STRIKE_FINISHES, COBALT_SET, artworkFor, cobaltQuote, cosmeticItem,
} from '@workspace/goldrush-catalog/cosmetics';
import type { CosmeticState } from '@workspace/api-client-react';

import { useCosmetics, secureUUID, cosmeticErrorMessage } from '@/hooks/useCosmetics';
import { usePlayer } from '@/context/PlayerContext';
import { useBlockingOverlay } from '@/context/OverlayQueue';
import { PaddleArt } from '@/components/cosmetics/PaddleArt';
import { gridItemWidth } from '@/components/ui/Primitives';
import { palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';

export type CosmeticKind = 'skin' | 'theme' | 'strike';
const DAY = 24 * 60 * 60 * 1000;

// ─── Shared helpers ────────────────────────────────────────────────────────────
export function startTrial(kind: CosmeticKind, id: string) {
  router.push({ pathname: '/warmup', params: { kind, id } });
}
export function startDesignTrial(designId: string) {
  router.push({ pathname: '/warmup', params: { design: designId } });
}

/** Ownership merges server entitlements with untouched legacy device ownership. */
export function useCosmeticOwnership() {
  const cos = useCosmetics();
  const { profile, equipSkin, equipTheme } = usePlayer();
  const owned = cos.state?.owned ?? [];
  const serverOwns = (k: CosmeticKind, id: string) => id === 'default' || owned.includes(`${k}:${id}`);
  const legacyOwns = (k: CosmeticKind, id: string) =>
    k === 'skin' ? profile.ownedSkins.includes(id) : k === 'theme' ? (profile.ownedThemes ?? []).includes(id) : false;
  const isOwned = (k: CosmeticKind, id: string) => serverOwns(k, id) || legacyOwns(k, id);
  const equippedId = (k: CosmeticKind): string => {
    const st = cos.state;
    // 'legacy' sentinel = use the preserved device selection.
    if (k === 'skin') return !st || st.equippedSkin === 'legacy' ? profile.currentSkin : st.equippedSkin;
    if (k === 'theme') {
      if (st && st.equippedTheme !== 'legacy') return st.equippedTheme;
      const local = profile.currentArenaTheme ?? 'default';
      return legacyOwns('theme', local) ? local : 'default';
    }
    return st?.equippedStrike ?? 'default';
  };
  async function equipItem(k: CosmeticKind, id: string) {
    if (k === 'strike') { await cos.equip('strike', id); return; }
    if (id === 'default' || owned.includes(`${k}:${id}`)) {
      await cos.equip(k, id);
      if (k === 'theme' && id === 'default') await equipTheme('default');
      return;
    }
    // Legacy device-owned: hand selection back to the device profile, then equip locally.
    if (k === 'skin') { await cos.equip('skin', 'legacy'); await equipSkin(id); return; }
    await cos.equip('theme', 'legacy');
    await equipTheme(id);
  }
  return { cos, profile, serverOwns, legacyOwns, isOwned, equippedId, equipItem };
}

function isDefiniteFailure(err: unknown) {
  const st = (err as { status?: number })?.status;
  return typeof st === 'number' && st >= 400 && st < 500;
}

// ─── Swatches ──────────────────────────────────────────────────────────────────
export function ThemeSwatch({ id, size }: { id: string; size: number }) {
  const t = THEME_FINISHES.find(x => x.id === id) ?? THEME_FINISHES[0];
  const m = size * 0.12;
  return (
    <Svg width={size} height={size * 0.62}>
      <Rect x={0} y={0} width={size} height={size * 0.62} fill={t.floor} />
      <Rect x={m} y={m} width={size - 2 * m} height={size * 0.62 - 2 * m} fill="none" stroke={t.line} strokeWidth={2} />
      {t.motif === 'rings' && [0.1, 0.18, 0.26].map(r => (
        <Circle key={r} cx={size / 2} cy={size * 0.31} r={size * r} fill="none" stroke={t.line} strokeOpacity={0.5} strokeWidth={1.5} />
      ))}
      {t.motif === 'lines' && [0.3, 0.5, 0.7].map(x => (
        <Line key={x} x1={size * x} y1={m} x2={size * x} y2={size * 0.62 - m} stroke={t.line} strokeOpacity={0.45} strokeWidth={1.5} />
      ))}
      <Line x1={m} y1={size * 0.31} x2={size - m} y2={size * 0.31} stroke={t.line} strokeOpacity={0.6} strokeWidth={1} />
      <Rect x={size * 0.38} y={size * 0.62 - m - 6} width={size * 0.24} height={5} fill={palette.orange} />
      <Circle cx={size * 0.58} cy={size * 0.22} r={4} fill={palette.stone} />
    </Svg>
  );
}

export function StrikeSwatch({ id, size }: { id: string; size: number }) {
  const s = STRIKE_FINISHES.find(x => x.id === id) ?? STRIKE_FINISHES[0];
  const h = size * 0.62; const cx = size / 2; const cy = h / 2;
  return (
    <Svg width={size} height={h}>
      <Rect x={0} y={0} width={size} height={h} fill={palette.navy} />
      {s.motif === 'rays' && Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return <Line key={i} x1={cx + Math.cos(a) * 8} y1={cy + Math.sin(a) * 8} x2={cx + Math.cos(a) * h * 0.38} y2={cy + Math.sin(a) * h * 0.38} stroke={s.color} strokeWidth={2.5} />;
      })}
      {s.motif === 'rings' && [0.14, 0.26, 0.38].map(r => (
        <Circle key={r} cx={cx} cy={cy} r={h * r} fill="none" stroke={s.color} strokeWidth={2.5} strokeOpacity={1 - r} />
      ))}
      <Circle cx={cx} cy={cy} r={5} fill={palette.stone} />
    </Svg>
  );
}

// ─── Wallet strip ──────────────────────────────────────────────────────────────
export function ShopWalletStrip() {
  const { cos, profile } = useCosmeticOwnership();
  return (
    <View style={st.wallet}>
      <View style={st.walletMain}>
        <Text style={st.kicker}>Online coins, server verified</Text>
        {cos.loading ? <Text style={st.walletValue}>Checking</Text>
          : cos.error ? (
            <View style={{ gap: 6 }}>
              <Text style={st.errorText}>{cos.error}</Text>
              <Plate label="Retry wallet" tone="navy" onPress={() => { void cos.reload(); }} />
            </View>
          ) : <Text style={st.walletValue} accessibilityLabel={`${cos.state?.balance ?? 0} online coins`}>{cos.state?.balance ?? 0}</Text>}
      </View>
      <View style={st.walletSide}>
        <Text style={st.kickerDim}>Device coins</Text>
        <Text style={st.walletSideValue}>{profile.coins}</Text>
        <Text style={st.tiny}>Kept on this device. Online items use only coins earned in online matches.</Text>
      </View>
    </View>
  );
}

// ─── Small UI atoms ────────────────────────────────────────────────────────────
type Tone = 'orange' | 'gold' | 'navy' | 'plain';
export function Plate({ label, onPress, tone = 'plain', disabled, busy, hint }: {
  label: string; onPress: () => void; tone?: Tone; disabled?: boolean; busy?: boolean; hint?: string;
}) {
  const bg = tone === 'orange' ? palette.orange : tone === 'gold' ? palette.gold : tone === 'navy' ? palette.navy : palette.stone;
  const fg = tone === 'navy' ? palette.stone : palette.charcoal;
  const off = !!(disabled || busy);
  return (
    <Pressable onPress={onPress} disabled={off} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint}
      accessibilityState={{ disabled: off, busy: !!busy }}
      style={({ pressed }) => [st.plate, { backgroundColor: bg, opacity: off ? 0.55 : 1, transform: [{ translateY: pressed ? 2 : 0 }] }, pressed && { borderBottomWidth: 2 }]}>
      <Text style={[st.plateText, { color: fg }]} numberOfLines={1}>{busy ? 'Working' : label}</Text>
    </Pressable>
  );
}

function Banner({ text, tone, action, onAction }: { text: string; tone: 'error' | 'info' | 'ok'; action?: string; onAction?: () => void }) {
  return (
    <View accessibilityLiveRegion="polite" style={[st.banner, tone === 'error' ? { borderColor: palette.orange } : tone === 'ok' ? { borderColor: palette.gold } : null]}>
      <Text style={st.bannerText}>{text}</Text>
      {action && onAction ? <Plate label={action} onPress={onAction} tone={tone === 'error' ? 'orange' : 'plain'} /> : null}
    </View>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────────────
type Listing = { kind: CosmeticKind; id: string; name: string; price: number; exclusive?: boolean };
type Confirm = { key: string; title: string; price: number; lines: string[] };

const SECTIONS: Record<'skins' | 'court', Array<{ title: string; kind: CosmeticKind; items: Listing[] }>> = {
  skins: [{ title: 'Paddle finishes', kind: 'skin', items: PADDLE_FINISHES.map(p => ({ kind: 'skin' as const, id: p.id, name: p.name, price: p.price, exclusive: 'exclusive' in p ? p.exclusive : false })) }],
  court: [
    { title: 'Court themes', kind: 'theme', items: THEME_FINISHES.map(t => ({ kind: 'theme' as const, id: t.id, name: t.name, price: t.price })) },
    { title: 'Hit effects', kind: 'strike', items: STRIKE_FINISHES.map(t => ({ kind: 'strike' as const, id: t.id, name: t.name, price: t.price })) },
  ],
};

export function ShopCatalogPanel({ section }: { section: 'skins' | 'court' }) {
  const own = useCosmeticOwnership();
  const { cos } = own;
  const { width } = useWindowDimensions();
  const cardW = gridItemWidth(Math.min(width, 1160) - 36, 160, 10);
  const pendingIds = useRef<Record<string, string>>({});
  const inflight = useRef(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'error' | 'info' | 'ok'; text: string; retryKey?: string } | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const confirmVisible = useBlockingOverlay(!!confirm);
  const offerVisible = useBlockingOverlay(offerOpen && !confirm);
  const balance = cos.state?.balance ?? 0;
  const ready = !!cos.state && !cos.loading;

  async function runPurchase(key: string): Promise<CosmeticState | null> {
    if (inflight.current) return null;
    inflight.current = true;
    setBusyKey(key); setNotice(null);
    try {
      // Same requestId is reused after an unknown result so a retry can never double charge.
      const rid = pendingIds.current[key] ?? (pendingIds.current[key] = secureUUID());
      const next = await cos.purchase(key, rid);
      delete pendingIds.current[key];
      return next;
    } catch (err) {
      if (isDefiniteFailure(err)) {
        delete pendingIds.current[key];
        setNotice({ tone: 'error', text: cosmeticErrorMessage(err, 'The server declined this purchase. No coins were spent.') });
      } else {
        setNotice({ tone: 'error', retryKey: key, text: `${cosmeticErrorMessage(err)} The result is unknown. Retry checks the same request, so you cannot be charged twice.` });
      }
      return null;
    } finally {
      inflight.current = false;
      setBusyKey(null);
    }
  }

  async function maybeOffer(next: CosmeticState) {
    if (!next.offerAvailable || next.offerDismissed) return;
    const last = next.offerLastShown < 1e12 ? next.offerLastShown * 1000 : next.offerLastShown;
    if (Date.now() - last <= DAY) return;
    if (cobaltQuote(next.owned).remaining.length === 0) return;
    try { await cos.offer('shown'); setOfferOpen(true); } catch { /* frequency claim failed: show nothing */ }
  }

  async function confirmPurchase() {
    if (!confirm) return;
    const key = confirm.key;
    const next = await runPurchase(key);
    setConfirm(null);
    if (!next) return;
    if (key === COBALT_SET.id) {
      setOfferOpen(false);
      setNotice({ tone: 'ok', text: 'Cobalt pieces added to your collection. Equip them below or in Collection.' });
      return;
    }
    const item = cosmeticItem(key);
    setNotice({ tone: 'ok', text: `${item?.name ?? 'Item'} is yours. Equip it when you are ready.` });
    await maybeOffer(next);
  }

  function openBuy(l: Listing) {
    setNotice(null);
    const key = `${l.kind}:${l.id}`;
    setConfirm({ key, title: `Buy ${l.name}`, price: l.price, lines: [`${l.name}: ${l.price} online coins`, 'Cosmetic only. No change to paddle size, speed or scoring.'] });
  }

  function openSetConfirm() {
    const q = cobaltQuote(cos.state?.owned ?? []);
    const lines = COBALT_SET.items.map(k => {
      const it = cosmeticItem(k);
      return q.remaining.includes(k) ? `${it?.name}: ${it?.price} separately` : `${it?.name}: already owned, not charged`;
    });
    lines.push(`Separately ${q.separate}, set price ${q.price}, you save ${q.savings}.`);
    setConfirm({ key: COBALT_SET.id, title: 'Buy Cobalt matching set', price: q.price, lines });
  }

  async function doEquip(l: Listing) {
    const key = `${l.kind}:${l.id}`;
    if (inflight.current) return;
    inflight.current = true; setBusyKey(key); setNotice(null);
    try { await own.equipItem(l.kind, l.id); }
    catch (err) { setNotice({ tone: 'error', text: cosmeticErrorMessage(err, 'Could not equip. Nothing changed.') }); }
    finally { inflight.current = false; setBusyKey(null); }
  }

  const quote = cobaltQuote(cos.state?.owned ?? []);

  return (
    <View style={{ gap: 14 }}>
      <ShopWalletStrip />
      {notice && (
        <Banner tone={notice.tone} text={notice.text}
          action={notice.retryKey ? 'Retry same purchase' : 'Dismiss'}
          onAction={() => {
            const k = notice.retryKey;
            if (k) {
              void (async () => {
                const next = await runPurchase(k);
                if (next) {
                  setNotice({ tone: 'ok', text: 'Purchase confirmed by the server.' });
                  if (k !== COBALT_SET.id) await maybeOffer(next);
                }
              })();
            } else setNotice(null);
          }} />
      )}

      {SECTIONS[section].map(sec => (
        <View key={sec.title} style={{ gap: 10 }}>
          <View style={st.secHead}>
            <Text style={st.secTitle} accessibilityRole="header">{sec.title}</Text>
            <View style={st.rule} />
            <Text style={st.secAside}>Cosmetic only</Text>
          </View>
          <View style={st.grid}>
            {sec.items.map(l => {
              const key = `${l.kind}:${l.id}`;
              const owned = own.isOwned(l.kind, l.id);
              const legacyOnly = owned && !own.serverOwns(l.kind, l.id);
              const equipped = own.equippedId(l.kind) === l.id;
              const busy = busyKey === key;
              const locked = !owned && !!l.exclusive;
              const short = !owned && !locked && ready && balance < l.price;
              return (
                <View key={key} style={[st.card, { width: cardW }, equipped && st.cardOn]}>
                  <View style={st.preview}>
                    {l.kind === 'skin' && <PaddleArt design={artworkFor(l.id)} width={Math.min(cardW - 28, 150)} height={22} />}
                    {l.kind === 'theme' && <ThemeSwatch id={l.id} size={Math.min(cardW - 24, 150)} />}
                    {l.kind === 'strike' && <StrikeSwatch id={l.id} size={Math.min(cardW - 24, 150)} />}
                  </View>
                  <Text style={st.cardName} numberOfLines={1}>{l.name}</Text>
                  <Text style={st.cardMeta} numberOfLines={2}>
                    {equipped ? 'Equipped' : owned ? (legacyOnly ? 'Owned on this device' : 'Owned') : locked ? 'Pass reward only' : `${l.price} online coins`}
                  </Text>
                  <View style={{ gap: 6 }}>
                    {equipped ? null : owned ? (
                      <Plate label="Equip" tone="gold" busy={busy} disabled={!!busyKey || !ready} onPress={() => { void doEquip(l); }} />
                    ) : locked ? (
                      <Plate label="Locked" disabled onPress={() => {}} />
                    ) : (
                      <Plate label={short ? `Need ${l.price - balance} more` : `Buy ${l.price}`} tone="orange"
                        busy={busy} disabled={!!busyKey || !ready || short} onPress={() => openBuy(l)}
                        hint="Opens a confirmation. Nothing is charged until you confirm." />
                    )}
                    <Plate label="Try on court" onPress={() => startTrial(l.kind, l.id)} hint="Practice with this item. Does not buy or equip." />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}

      {section === 'court' && quote.remaining.length > 0 && (
        <View style={st.setCard}>
          <ThemeSwatch id="cobalt_court" size={96} />
          <View style={{ flex: 1, gap: 4, minWidth: 180 }}>
            <Text style={st.setTitle}>{COBALT_SET.name}</Text>
            <Text style={st.setBody}>
              {quote.remaining.map(k => cosmeticItem(k)?.name).join(' and ')}. Separately {quote.separate}, together {quote.price}. Pieces you own are never charged.
            </Text>
            <Plate label={ready && balance < quote.price ? `Need ${quote.price - balance} more` : `Review set ${quote.price}`} tone="navy"
              disabled={!ready || !!busyKey || balance < quote.price} onPress={openSetConfirm} />
          </View>
        </View>
      )}

      <Pressable accessibilityRole="button" onPress={() => router.push('/paddle-studio')} style={({ pressed }) => [st.studioLink, pressed && { opacity: 0.8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={st.setTitle}>Paddle Studio</Text>
          <Text style={st.setBody}>Design your own finish for free. Saved designs live in your Collection.</Text>
        </View>
        <Text style={st.studioGo}>OPEN</Text>
      </Pressable>

      {/* Confirm purchase */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => { if (!busyKey) setConfirm(null); }}>
        <View style={st.backdrop}>
          {confirm && (
            <View style={st.sheet} accessibilityViewIsModal>
              <Text style={st.sheetTitle} accessibilityRole="header">{confirm.title}</Text>
              {confirm.lines.map(line => <Text key={line} style={st.sheetLine}>{line}</Text>)}
              <View style={st.sheetTotals}>
                <Text style={st.sheetLine}>Online balance {balance}</Text>
                <Text style={st.sheetStrong}>After purchase {balance - confirm.price}</Text>
              </View>
              <Text style={st.tiny}>Paid with server-verified online coins. Your device coins are not touched.</Text>
              <View style={st.sheetRow}>
                <View style={{ flex: 1 }}><Plate label="Cancel" disabled={!!busyKey} onPress={() => setConfirm(null)} /></View>
                <View style={{ flex: 1 }}><Plate label={`Pay ${confirm.price}`} tone="orange" busy={busyKey === confirm.key}
                  disabled={balance < confirm.price} onPress={() => { void confirmPurchase(); }} /></View>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Matching offer: only after a successful purchase and after the server claims the slot. */}
      <Modal visible={offerVisible} transparent animationType="fade" onRequestClose={() => setOfferOpen(false)}>
        <View style={st.backdrop}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 18 }}>
            <View style={st.sheet} accessibilityViewIsModal>
              <Text style={st.kickerDim}>Optional matching set</Text>
              <Text style={st.sheetTitle} accessibilityRole="header">Complete the Cobalt look</Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                <ThemeSwatch id="cobalt_court" size={120} />
                <StrikeSwatch id="cobalt_strike" size={120} />
              </View>
              {COBALT_SET.items.map(k => {
                const it = cosmeticItem(k);
                const has = !quote.remaining.includes(k);
                return <Text key={k} style={st.sheetLine}>{it?.name}: {has ? 'already owned, excluded' : `${it?.price} separately`}</Text>;
              })}
              <View style={st.sheetTotals}>
                <Text style={st.sheetLine}>Separately {quote.separate}</Text>
                <Text style={st.sheetStrong}>Set price {quote.price}, save {quote.savings}</Text>
                <Text style={st.sheetLine}>Your online balance {balance}</Text>
              </View>
              <Text style={st.tiny}>Cosmetic only. Nothing is charged unless you review and pay.</Text>
              <View style={st.sheetRow}>
                <View style={{ flex: 1 }}><Plate label="No thanks" onPress={() => { setOfferOpen(false); void cos.offer('dismissed').catch(() => {}); }} /></View>
                <View style={{ flex: 1 }}><Plate label={balance < quote.price ? `Need ${quote.price - balance} more` : 'Review set'} tone="navy"
                  disabled={balance < quote.price || quote.remaining.length === 0} onPress={openSetConfirm} /></View>
              </View>
              <Plate label="Try Cobalt Court" onPress={() => { setOfferOpen(false); startTrial('theme', 'cobalt_court'); }} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

export const st = StyleSheet.create({
  wallet: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 2, borderColor: palette.charcoal, backgroundColor: palette.navy },
  walletMain: { flexGrow: 1, minWidth: 180, padding: 14, gap: 2 },
  walletSide: { flexGrow: 1, minWidth: 160, maxWidth: 360, padding: 14, gap: 2, backgroundColor: palette.sandstone, borderLeftWidth: 2, borderLeftColor: palette.charcoal },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.4, color: palette.gold, textTransform: 'uppercase' },
  kickerDim: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.4, color: palette.slate, textTransform: 'uppercase' },
  walletValue: { fontFamily: fonts.display, fontSize: 40, color: palette.stone, lineHeight: 44 },
  walletSideValue: { fontFamily: fonts.display, fontSize: 24, color: palette.charcoal },
  tiny: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: palette.slate },
  errorText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: palette.stone },
  plate: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderBottomWidth: 4, borderColor: palette.charcoal },
  plateText: { fontFamily: fonts.display, fontSize: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  banner: { borderWidth: 2, borderColor: palette.slate, backgroundColor: palette.sandstone, padding: 12, gap: 8 },
  bannerText: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 19, color: palette.charcoal },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secTitle: { fontFamily: fonts.display, fontSize: 20, color: palette.charcoal, textTransform: 'uppercase', letterSpacing: 0.6 },
  secAside: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: palette.slate, letterSpacing: 1 },
  rule: { flex: 1, height: 2, backgroundColor: palette.charcoal, opacity: 0.18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { borderWidth: 2, borderColor: palette.charcoal, backgroundColor: palette.sandstone, padding: 10, gap: 6 },
  cardOn: { borderColor: palette.orange, borderWidth: 3, backgroundColor: palette.stone },
  preview: { height: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.stone, borderWidth: 1, borderColor: palette.slate },
  cardName: { fontFamily: fonts.display, fontSize: 19, color: palette.charcoal, textTransform: 'uppercase' },
  cardMeta: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: palette.slate, minHeight: 18 },
  setCard: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center', borderWidth: 2, borderColor: palette.charcoal, backgroundColor: palette.sandstone, padding: 14 },
  setTitle: { fontFamily: fonts.display, fontSize: 22, color: palette.charcoal, textTransform: 'uppercase' },
  setBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: palette.slate },
  studioLink: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: palette.charcoal, backgroundColor: palette.gold, padding: 14, minHeight: 64 },
  studioGo: { fontFamily: fonts.display, fontSize: 18, color: palette.charcoal, borderWidth: 2, borderColor: palette.charcoal, paddingHorizontal: 12, paddingVertical: 10 },
  backdrop: { flex: 1, backgroundColor: 'rgba(37,42,43,0.72)', justifyContent: 'center', padding: 18 },
  sheet: { alignSelf: 'center', width: '100%', maxWidth: 460, backgroundColor: palette.stone, borderWidth: 3, borderColor: palette.charcoal, padding: 18, gap: 10 },
  sheetTitle: { fontFamily: fonts.display, fontSize: 28, color: palette.charcoal, textTransform: 'uppercase' },
  sheetLine: { fontFamily: fonts.body, fontSize: 15, lineHeight: 20, color: palette.charcoal },
  sheetStrong: { fontFamily: fonts.bodyBold, fontSize: 16, color: palette.charcoal },
  sheetTotals: { borderTopWidth: 2, borderBottomWidth: 2, borderColor: palette.charcoal, paddingVertical: 8, gap: 2 },
  sheetRow: { flexDirection: 'row', gap: 10 },
});
