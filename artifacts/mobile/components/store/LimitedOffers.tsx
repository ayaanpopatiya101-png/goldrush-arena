import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  getStoreOffers,
  getGetStoreOffersQueryKey,
  useGetStoreOffers,
  startOfferCheckout,
  type StoreOffer,
} from '@workspace/api-client-react';
import { palette } from '@/constants/colors';
import { SKINS, usePlayer } from '@/context/PlayerContext';
import { useRevenueCat } from '@/lib/revenuecat';
import { arenaRequestOptions } from '@/utils/arenaSession';
import { trackEvent } from '@/utils/analytics';

import { fonts } from '@/constants/typography';
type StorePlatform = 'web' | 'ios' | 'android';
export const storePlatform: StorePlatform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

type RevenueCatValue = ReturnType<typeof useRevenueCat>;

/** Fetches the server-assigned native customer id and logs RevenueCat into it before any SDK purchase/restore. */
export async function identifyNativeCustomer(revenueCat: RevenueCatValue, username: string, knownId?: string): Promise<string> {
  const state = await getStoreOffers({ platform: storePlatform }, await arenaRequestOptions(username));
  if (!state.nativeVerificationAvailable) throw new Error('App-store receipt verification is unavailable. No purchase was started.');
  const id = knownId ?? state.nativeCustomerId;
  if (!id) throw new Error('Store account could not be linked on this device. Try again shortly.');
  await revenueCat.identify(id);
  return id;
}

function xAlert(title: string, msg: string) {
  if (Platform.OS === 'web') { window.alert(`${title}\n\n${msg}`); return; }
  Alert.alert(title, msg);
}

function formatRemaining(ms: number) {
  if (ms <= 0) return 'Ended';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m ${String(sec).padStart(2, '0')}s left`;
}

const STATUS_COPY: Record<StoreOffer['status'], string> = {
  available: 'LIVE', upcoming: 'SOON', expired: 'ENDED', claimed: 'CLAIMED', pending: 'PENDING', unavailable: 'UNAVAILABLE',
};

interface Props {
  busyKey: string | null;
  setBusyKey: (key: string | null) => void;
}

export function LimitedOffers({ busyKey, setBusyKey }: Props) {
  const { currentUsername, profile, applyStorePurchases, replayPendingStorePurchases } = usePlayer();
  const lockRef = useRef(false);
  const revenueCat = useRevenueCat();
  const params = { platform: storePlatform };
  const query = useGetStoreOffers(params, {
    query: {
      queryKey: [...getGetStoreOffersQueryKey(params), currentUsername],
      queryFn: async ({ signal }) => getStoreOffers(params, { ...(await arenaRequestOptions(currentUsername)), signal }),
      refetchInterval: 60_000,
      staleTime: 15_000,
    },
  });
  const refetchRef = useRef(query.refetch);
  refetchRef.current = query.refetch;
  useFocusEffect(useCallback(() => { void refetchRef.current(); }, []));

  // Server clock offset, recomputed from each response.
  const offset = useMemo(() => {
    if (!query.data) return 0;
    return new Date(query.data.serverTime).getTime() - query.dataUpdatedAt;
  }, [query.data, query.dataUpdatedAt]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const serverNow = now + offset;

  const native = Platform.OS !== 'web';
  const owned = new Set(profile.ownedSkins);

  async function retryDelivery(offer: StoreOffer) {
    if (lockRef.current || busyKey) return;
    lockRef.current = true;
    setBusyKey(`offer:${offer.id}`);
    let resume = false;
    try {
      await replayPendingStorePurchases();
      await identifyNativeCustomer(revenueCat, currentUsername);
      const info = await revenueCat.restore();
      const receipts = info.nonSubscriptionTransactions
        .filter(p => p.productIdentifier === offer.productId && p.transactionIdentifier)
        .map(p => ({ productIdentifier: p.productIdentifier, transactionIdentifier: p.transactionIdentifier }));
      if (receipts.length) {
        const restored = await applyStorePurchases(receipts);
        xAlert('Delivery verified', restored.message);
      } else {
        // Campaign products are server-checked non-consumables. A cancelled store
        // sheet can safely resume the same SKU; it cannot buy a second copy.
        resume = true;
      }
    } catch (error: any) {
      xAlert('Delivery not completed', error?.message ?? 'Could not verify the saved receipt yet.');
    } finally {
      lockRef.current = false;
      setBusyKey(null);
      void refetchRef.current();
    }
    if (resume) await claim(offer);
  }

  async function claim(offer: StoreOffer) {
    if (lockRef.current || busyKey) return;
    lockRef.current = true;
    const key = `offer:${offer.id}`;
    setBusyKey(key);
    trackEvent('store_offer_checkout_started', { offer: offer.id, platform: storePlatform });
    try {
      const options = await arenaRequestOptions(currentUsername);
      const checkout = await startOfferCheckout({ offerId: offer.id, platform: storePlatform }, options);
      if (!native) {
        if (!checkout.url) throw new Error('Checkout is not available for this offer right now.');
        await Linking.openURL(checkout.url);
        return;
      }
      const packageId = checkout.packageId ?? offer.packageId;
      const productId = checkout.productId ?? offer.productId;
      const pkg = packageId ? revenueCat.getPackage(packageId) : undefined;
      if (!pkg || !productId || pkg.product.identifier !== productId) throw new Error('This offer is not available from your app store.');
      await identifyNativeCustomer(revenueCat, currentUsername, checkout.nativeCustomerId ?? query.data?.nativeCustomerId);
      const result = await revenueCat.purchase(pkg);
      const transactionIdentifier = result.transaction.transactionIdentifier;
      if (!transactionIdentifier) throw new Error('The app store did not return a transaction receipt. Use Restore to retry verification.');
      const applied = await applyStorePurchases([{
        productIdentifier: result.productIdentifier,
        transactionIdentifier,
        reservationId: checkout.reservationId,
      }]);
      trackEvent('store_offer_purchase_completed', { offer: offer.id });
      xAlert('Offer claimed', applied.message);
    } catch (error: any) {
      if (!error?.userCancelled) xAlert('Offer not completed', error?.message ?? 'Could not start this offer.');
    } finally {
      lockRef.current = false;
      setBusyKey(null);
      void refetchRef.current();
    }
  }

  return (
    <View style={s.wrap}>
      <View style={s.headRow}>
        <Text style={s.kicker}>LIMITED OFFERS</Text>
        <View style={s.rule} />
        {query.data && <Text style={s.small}>Times shown from server clock</Text>}
      </View>

      {query.isLoading && (
        <View accessibilityLabel="Loading limited offers" accessibilityState={{ busy: true }} style={[s.card, { gap: 10 }]}>
          <View style={[s.skel, { width: '45%', height: 16 }]} />
          <View style={[s.skel, { width: '75%', height: 10 }]} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[0, 1, 2].map(i => <View key={i} style={[s.skel, { width: 54, height: 12, borderRadius: 6 }]} />)}
          </View>
        </View>
      )}

      {query.isError && !query.isLoading && (
        <View style={[s.card, { borderColor: palette.danger, alignItems: 'center' }]}>
          <Text style={s.body}>Could not load limited offers. Standard items below are unaffected.</Text>
          <Pressable accessibilityRole="button" onPress={() => void query.refetch()} style={({ pressed }) => [s.ghostBtn, pressed && s.pressed]}>
            <Text style={s.ghostTxt}>{query.isFetching ? 'RETRYING' : 'RETRY'}</Text>
          </Pressable>
        </View>
      )}

      {query.data && query.data.offers.length === 0 && (
        <View style={[s.card, s.empty]}>
          <Feather name="calendar" size={22} color={palette.muted} />
          <View style={{ flex: 1 }}>
            <Text style={s.title}>No limited offers right now</Text>
            <Text style={s.body}>When a timed paddle bundle is approved it will appear here with its real store price and end time. Limited offers contain cosmetics only.</Text>
          </View>
        </View>
      )}

      {query.data?.offers.map(offer => {
        const ended = new Date(offer.endsAt).getTime() <= serverNow;
        const notStarted = new Date(offer.startsAt).getTime() > serverNow;
        const allOwned = offer.skins.length > 0 && offer.skins.every(id => owned.has(id));
        const pkg = native && offer.packageId ? revenueCat.getPackage(offer.packageId) : undefined;
        const pkgMatches = !!pkg && !!offer.productId && pkg.product.identifier === offer.productId;
        const price = native ? (pkgMatches ? pkg!.product.priceString : null) : offer.priceLabel;
        const status = ended && offer.status === 'available' ? 'expired' : offer.status;
        const inWindow = !ended && !notStarted;
        const nativePending = native && status === 'pending';
        const webResume = !native && status === 'pending' && inWindow && !!offer.priceLabel;
        const blockedReason =
          nativePending ? (offer.reason || 'Payment received by the store; delivery is waiting on verification')
          : webResume ? (offer.reason || 'Checkout started but not finished')
          : status !== 'available' ? (offer.reason || STATUS_COPY[status])
          : notStarted ? 'Not started yet'
          : allOwned ? 'You already own every paddle in this offer'
          : native && (!revenueCat.available || revenueCat.error) ? 'App store products unavailable'
          : native && !pkgMatches ? 'Not offered by your app store yet'
          : !price ? 'Price unavailable'
          : null;
        const isBusy = busyKey === `offer:${offer.id}`;
        const actionable = nativePending || webResume;
        const disabled = (!!blockedReason && !actionable) || !!busyKey;
        const live = status === 'available' && !ended;
        return (
          <View key={offer.id} style={[s.card, live && { borderColor: palette.gold }]}>
            <View style={s.topRow}>
              <View style={[s.pill, live ? { backgroundColor: palette.gold, borderColor: palette.edge } : null]}>
                <Text style={[s.pillTxt, live && { color: palette.onAccent }]}>{STATUS_COPY[status]}</Text>
              </View>
              <Text style={[s.small, { marginLeft: 'auto' }]}>
                {notStarted ? `Starts in ${formatRemaining(new Date(offer.startsAt).getTime() - serverNow).replace(' left', '')}` : formatRemaining(new Date(offer.endsAt).getTime() - serverNow)}
              </Text>
            </View>
            <Text style={s.title}>{offer.title}</Text>
            <Text style={s.body}>{offer.rewardLabel}</Text>
            <Text style={s.small}>UTC: {offer.startsAt} — {offer.endsAt}</Text>

            <View style={s.skinRow}>
              {offer.skins.map(id => {
                const skin = SKINS.find(k => k.id === id);
                const has = owned.has(id);
                return (
                  <View key={id} style={s.skinChip} accessibilityLabel={`${skin?.name ?? id}${has ? ', owned' : ''}`}>
                    <View style={s.court}>
                      <View style={[s.paddle, { backgroundColor: skin?.color ?? palette.muted }]} />
                    </View>
                    <Text style={s.skinName} numberOfLines={1}>{skin?.name ?? id}</Text>
                    {has && <Text style={s.ownedTag}>OWNED</Text>}
                  </View>
                );
              })}
            </View>

            {blockedReason && <Text style={s.reason}>{blockedReason}</Text>}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled, busy: isBusy }}
              accessibilityLabel={`${offer.title}${price ? `, ${price}` : ''}`}
              disabled={disabled}
              onPress={() => void (nativePending ? retryDelivery(offer) : claim(offer))}
              style={({ pressed }) => [s.cta, disabled && s.ctaOff, pressed && !disabled && s.pressed]}
            >
              <Text style={[s.ctaTxt, disabled && { color: palette.muted }]}>
                {isBusy ? 'WORKING' : nativePending ? 'RETRY DELIVERY' : webResume ? `RESUME CHECKOUT ${price}` : allOwned ? 'ALL OWNED' : blockedReason ? 'UNAVAILABLE' : `GET FOR ${price}`}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 10, marginBottom: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kicker: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: palette.gold },
  rule: { flex: 1 },
  small: { fontFamily: 'SourceSans3_400Regular', fontSize: 11, color: palette.muted },
  card: { backgroundColor: palette.surface, borderRadius: 10, borderWidth: 2, borderBottomWidth: 5, borderColor: palette.border, padding: 14, gap: 6 },
  empty: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: palette.inset },
  skel: { backgroundColor: palette.raised, borderRadius: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { borderRadius: 6, borderWidth: 2, borderColor: palette.border, paddingHorizontal: 7, paddingVertical: 2 },
  pillTxt: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 1, color: palette.supporting },
  title: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 0.4, color: palette.foreground, textTransform: 'uppercase' },
  body: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, lineHeight: 18, color: palette.supporting },
  reason: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: palette.supporting },
  skinRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  skinChip: { width: 84, alignItems: 'center', gap: 3 },
  court: { width: 84, height: 44, borderRadius: 8, borderWidth: 2, borderColor: palette.border, backgroundColor: palette.inset, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8 },
  paddle: { width: 46, height: 9, borderRadius: 5 },
  skinName: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: palette.foreground },
  ownedTag: { fontFamily: 'SourceSans3_700Bold', fontSize: 10, letterSpacing: 1, color: palette.primary },
  cta: { marginTop: 6, minHeight: 46, borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.edge, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  ctaOff: { backgroundColor: palette.raised, borderColor: palette.border },
  ctaTxt: { fontFamily: fonts.display, fontSize: 17, letterSpacing: 1, color: palette.onAccent },
  ghostBtn: { marginTop: 8, borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.edge, backgroundColor: palette.raised, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  ghostTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1, color: palette.foreground },
  pressed: { borderBottomWidth: 2, transform: [{ translateY: 2 }] },
});
