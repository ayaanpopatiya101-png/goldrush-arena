import { Router, type IRouter } from 'express';
import { db, arenaPlayers, storeReservations } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { GetStoreOffersQueryParams, StartOfferCheckoutBody, VerifyNativePurchaseBody, GetStoreOffersResponse, StartOfferCheckoutResponse, VerifyNativePurchaseResponse } from '@workspace/api-zod';
import { requireArenaIdentity, limited } from '../lib/arenaIdentity.js';
import { storeCampaigns, campaignState, assertCampaign, sameSkins, type StoreCampaign } from '../lib/storeCampaigns.js';
import { getUncachableStripeClient } from '../stripeClient.js';
import { nativeCustomerId, nativeCampaignProduct, verifiedNativeTransaction, revenueCatGet, revenueCatProject } from '../lib/revenueCatProvider.js';
import { deliverVerifiedPurchase } from '../lib/storeDelivery.js';
import { nativeReward, rewardFromMetadata } from '../lib/storeRewards.js';

const router: IRouter = Router();
router.use(['/store/offers', '/store/offer-checkout', '/store/native-verify'], requireArenaIdentity, (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (limited(`paid-store:${res.locals.arenaPlayer.id}`, 60)) { res.status(429).json({ error: 'Try again shortly.' }); return; }
  next();
});

export async function stripeCampaignPrice(campaign: StoreCampaign) {
  const stripe = await getUncachableStripeClient();
  const price = await stripe.prices.retrieve(campaign.stripePriceId, { expand: ['product'] });
  const product = price.product;
  if (!price.active || price.type !== 'one_time' || price.unit_amount === null || price.unit_amount <= 0
    || typeof product === 'string' || product.deleted || !product.active
    || product.metadata.store_campaign !== campaign.id) throw new Error('This offer has no available provider price.');
  const reward = rewardFromMetadata(product.metadata);
  if (reward.rewardType !== 'skins' || !sameSkins(reward.rewardSkins ?? [], campaign.reward.rewardSkins))
    throw new Error('The provider rewards do not match this offer.');
  return { stripe, price };
}

router.get('/store/offers', async (req, res): Promise<void> => {
  const parsed = GetStoreOffersQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: 'Choose web, ios or android.' }); return; }
  try {
    const platform = parsed.data.platform;
    const player = res.locals.arenaPlayer;
    const now = Date.now();
    const reservations = await db.select().from(storeReservations).where(eq(storeReservations.playerId, player.id));
    const offers = await Promise.all(storeCampaigns.filter(c => c.approvedByOwner).map(async c => {
      let status: string = campaignState(c, now);
      let reason = status === 'available' ? 'One purchase per guest. Includes both skins; no refund for a skin already owned.'
        : status === 'upcoming' ? 'Not started yet.' : status === 'expired' ? 'Offer ended.' : 'Offer unavailable.';
      let priceLabel: string | null = null;
      const reservation = reservations.find(r => r.campaignId === c.id);
      if (reservation?.status === 'fulfilled') { status = 'claimed'; reason = 'Already purchased by this guest.'; }
      else if (reservation?.status === 'pending') { status = 'pending'; reason = 'Purchase reserved. Resume the same checkout or retry receipt delivery.'; }
      // Price is never advertised without a real, currently active provider mapping.
      try {
        if (platform === 'web') {
          const { price } = await stripeCampaignPrice(c);
          const digits = new Intl.NumberFormat('en', { style: 'currency', currency: price.currency }).resolvedOptions().maximumFractionDigits ?? 2;
          priceLabel = new Intl.NumberFormat(undefined, { style: 'currency', currency: price.currency }).format(price.unit_amount! / 10 ** digits);
          if (status === 'available' && Date.parse(c.endsAt) - now < 31 * 60_000) {
            status = 'unavailable'; reason = 'Too little time remains to safely open hosted checkout.';
          }
        } else {
          const mapping = c.native[platform];
          if (!mapping) throw new Error('Not available on this store.');
          await nativeCampaignProduct(mapping, c);
        }
      } catch {
        if (!['claimed', 'expired', 'upcoming'].includes(status)) status = 'unavailable';
        reason = 'This provider product is unavailable. No purchase can start.';
      }
      const mapping = platform === 'web' ? undefined : c.native[platform];
      return { id: c.id, title: c.title, startsAt: c.startsAt, endsAt: c.endsAt,
        rewardLabel: c.reward.label, skins: c.reward.rewardSkins, status, reason, priceLabel,
        packageId: mapping?.packageId, productId: mapping?.productId };
    }));
    let nativeVerificationAvailable = false;
    if (platform !== 'web') {
      try {
        await revenueCatGet(`${revenueCatProject()}/offerings?limit=1`);
        nativeVerificationAvailable = true;
      } catch { /* Fail before any store sheet opens; never accept a receipt locally. */ }
    }
    res.json(GetStoreOffersResponse.parse({ serverTime: new Date(now).toISOString(), nativeCustomerId: nativeCustomerId(player.id), nativeVerificationAvailable, offers }));
  } catch {
    res.status(503).json({ error: 'Offer availability could not be verified. Your purchases are unchanged.' });
  }
});

router.post('/store/offer-checkout', async (req, res): Promise<void> => {
  const parsed = StartOfferCheckoutBody.strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid offer request. Prices and rewards cannot be supplied by a client.' }); return; }
  const { offerId, platform } = parsed.data;
  const campaign = storeCampaigns.find(c => c.id === offerId);
  try {
    assertCampaign(campaign, Date.now());
    const player = res.locals.arenaPlayer;
    const provider = platform === 'web' ? 'stripe' : 'revenuecat';
    const mapping = platform === 'web' ? undefined : campaign.native[platform];
    const stripeData = platform === 'web' ? await stripeCampaignPrice(campaign) : undefined;
    if (platform !== 'web') {
      if (!mapping || nativeReward(mapping.productId)) throw new Error('A dedicated approved native campaign product is required.');
      await nativeCampaignProduct(mapping, campaign);
    }
    const result = await db.transaction(async tx => {
      const [owner] = await tx.select().from(arenaPlayers).where(eq(arenaPlayers.id, player.id)).for('update');
      if (!owner || owner.tokenHash !== player.tokenHash) throw new Error('Guest purchase identity expired.');
      assertCampaign(campaign, Date.now()); // Recheck after provider latency and lock wait.
      const reservationId = `${campaign.id}:${player.id}`;
      const [existing] = await tx.select().from(storeReservations).where(eq(storeReservations.id, reservationId)).for('update');
      if (existing?.status === 'fulfilled') throw new Error('This offer has already been claimed.');
      if (existing && existing.provider !== provider) throw new Error('This offer is already reserved with the other payment provider.');
      if (stripeData && existing?.providerSession) {
        const session = await stripeData.stripe.checkout.sessions.retrieve(existing.providerSession);
        if (session.status === 'complete') throw new Error('Payment is complete. Open the existing success page to collect your reward.');
        if (session.status === 'open' && session.url) return { reservationId, url: session.url };
        // Only Stripe-confirmed expired sessions may be replaced. Never rely on client cancellation.
        if (session.status !== 'expired') throw new Error('Checkout is pending. Retry shortly.');
      }
      if (!existing) await tx.insert(storeReservations).values({
        id: reservationId, playerId: player.id, campaignId: campaign.id, provider,
        reward: campaign.reward, productId: stripeData ? campaign.stripePriceId : mapping!.productId,
        appId: mapping?.appId, startsAt: new Date(campaign.startsAt), endsAt: new Date(campaign.endsAt),
      });
      if (stripeData) {
        // Stripe Checkout needs at least 30 minutes. Never extend a campaign to satisfy that requirement.
        const expiresAt = Math.min(Math.floor(Date.parse(campaign.endsAt) / 1000), Math.floor(Date.now() / 1000) + 3600);
        if (expiresAt < Math.floor(Date.now() / 1000) + 1860) throw new Error('Too little time remains to safely start hosted checkout.');
        const host = process.env.REPLIT_DOMAINS?.split(',')[0];
        if (!host) throw new Error('Hosted checkout return URL is not configured.');
        const session = await stripeData.stripe.checkout.sessions.create({
          mode: 'payment', line_items: [{ price: campaign.stripePriceId, quantity: 1 }], expires_at: expiresAt,
          success_url: `https://${host}/api/store/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `https://${host}/api/store/cancel`,
          metadata: { store_reservation: reservationId, reward_label: campaign.reward.label },
        }, { idempotencyKey: `offer:${reservationId}:${existing?.providerSession ?? 'first'}` });
        if (!session.url) throw new Error('Hosted checkout is unavailable.');
        await tx.update(storeReservations).set({ providerSession: session.id, checkoutUrl: session.url }).where(eq(storeReservations.id, reservationId));
        return { reservationId, url: session.url };
      }
      return { reservationId, packageId: mapping!.packageId, productId: mapping!.productId, nativeCustomerId: nativeCustomerId(player.id) };
    });
    res.json(StartOfferCheckoutResponse.parse(result));
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : 'Offer unavailable. No reward granted.' });
  }
});

router.post('/store/native-verify', async (req, res): Promise<void> => {
  const parsed = VerifyNativePurchaseBody.strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'A valid store receipt is required.' }); return; }
  try {
    const { productIdentifier, transactionIdentifier } = parsed.data;
    let { reservationId } = parsed.data;
    const player = res.locals.arenaPlayer;
    const { purchase, product } = await verifiedNativeTransaction(player.id, productIdentifier, transactionIdentifier);
    let reward = nativeReward(productIdentifier);
    if (!reward && !reservationId) {
      // Store restoration can recover a campaign after the UTC window without reopening sales.
      const [reserved] = await db.select().from(storeReservations).where(and(eq(storeReservations.playerId, player.id), eq(storeReservations.productId, productIdentifier)));
      reservationId = reserved?.id;
    }
    if (reservationId) {
      const [r] = await db.select().from(storeReservations).where(and(eq(storeReservations.id, reservationId), eq(storeReservations.playerId, player.id)));
      if (!r || r.provider !== 'revenuecat' || r.productId !== productIdentifier || r.appId !== product.app_id
        || purchase.purchased_at < Math.max(r.startsAt.getTime(), r.createdAt.getTime())
        || purchase.purchased_at >= r.endsAt.getTime() || purchase.quantity !== 1 || purchase.ownership !== 'purchased')
        throw new Error('Receipt does not match this guest, product, or reserved UTC offer window. If charged, keep the receipt and contact support; do not buy again.');
      reward = r.reward;
    }
    if (!reward) throw new Error('This product is not mapped to an approved reward. Keep the receipt and contact support.');
    // Store transaction identity survives RevenueCat aliases/transfers or a changed
    // RevenueCat purchase record id. Never treat a new wrapper id as new money.
    const code = await deliverVerifiedPurchase({
      receiptId: `native:${purchase.store}:${product.app_id}:${purchase.store_purchase_identifier}`,
      playerId: player.id, reward, reservationId,
    });
    res.json(VerifyNativePurchaseResponse.parse({ code }));
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : 'Receipt could not be verified. Retry without buying again.' });
  }
});
export default router;
