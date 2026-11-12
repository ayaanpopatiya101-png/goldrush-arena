import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { db, pool, arenaPlayers, storeReservations, storeReceipts, purchaseCodes } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { issueIdentity } from '../src/lib/arenaIdentity.js';
import { storeCampaigns, campaignState, type StoreCampaign } from '../src/lib/storeCampaigns.js';
import offers from '../src/routes/storeOffers.js';
import stripeRoutes from '../src/routes/stripe.js';
import { WebhookHandlers } from '../src/webhookHandlers.js';
import { fixture } from './store-provider-fixture.js';

// Production provider imports are replaced at bundle time. No real provider, charge or activation is possible.
process.env.REVENUECAT_PROJECT_ID = 'fixture-project';
const app = express(); app.use(express.json()); app.use(offers); app.use(stripeRoutes);
const server = app.listen(0, '127.0.0.1');
const ready = new Promise<void>(resolve => server.once('listening', resolve));
const owners: Awaited<ReturnType<typeof issueIdentity>>[] = [];
const realNow = Date.now;
const now = realNow();
fixture.startsAt = new Date(now - 60_000).toISOString();
fixture.endsAt = new Date(now + 3_600_000).toISOString();
fixture.chargeAt = now;
const campaign: StoreCampaign = {
  id: fixture.campaignId, title: 'Fixture skins', approvedByOwner: true, startsAt: fixture.startsAt, endsAt: fixture.endsAt,
  reward: { rewardType: 'skins', rewardSkins: ['chrome', 'cosmic'], label: 'Chrome + Cosmic' },
  stripePriceId: 'price_fixture',
  native: { ios: { offeringId: 'offering_fixture', packageId: 'fixture_bundle', productId: 'fixture_native_bundle', appId: 'app_fixture' } },
};
(storeCampaigns as StoreCampaign[]).push(campaign);
fixture.products.set('prod_native_campaign', {
  id: 'prod_native_campaign', store_identifier: 'fixture_native_bundle', app_id: 'app_fixture', state: 'active',
  type: 'one_time', one_time: { is_consumable: false },
});
fixture.products.set('prod_native_coins', {
  id: 'prod_native_coins', store_identifier: 'com.goldrush.arena.starter_sack', app_id: 'app_fixture', state: 'active', type: 'one_time',
});
async function owner() { const identity = await issueIdentity(); owners.push(identity); return identity; }
async function call(token: string, path: string, body?: object) {
  await ready;
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  return fetch(base + path, { method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
async function json(response: Response): Promise<any> { return response.json(); }
after(async () => {
  Date.now = realNow;
  for (const o of owners) {
    await db.delete(storeReceipts).where(eq(storeReceipts.playerId, o.playerId));
    await db.delete(storeReservations).where(eq(storeReservations.playerId, o.playerId));
    await db.delete(purchaseCodes).where(eq(purchaseCodes.claimedBy, o.playerId));
    await db.delete(arenaPlayers).where(eq(arenaPlayers.id, o.playerId));
  }
  await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
  await pool.end();
});

test('scheduled offers and provider fulfillment fail safely without charging', async t => {
  const a = await owner(), b = await owner();
  const checkout = { offerId: campaign.id, platform: 'web' };
  await t.test('UTC boundaries and owner approval are exclusive at the end', () => {
    assert.equal(campaignState(campaign, Date.parse(campaign.startsAt) - 1), 'upcoming');
    assert.equal(campaignState(campaign, Date.parse(campaign.startsAt)), 'available');
    assert.equal(campaignState(campaign, Date.parse(campaign.endsAt) - 1), 'available');
    assert.equal(campaignState(campaign, Date.parse(campaign.endsAt)), 'expired');
    assert.equal(campaignState({ ...campaign, approvedByOwner: false }, now), 'unavailable');
  });
  await t.test('owners, unknown offers and client prices cannot bypass the contract', async () => {
    assert.equal((await call('invalid', '/store/offer-checkout', checkout)).status, 401);
    assert.equal((await call(a.token, '/store/offer-checkout', { ...checkout, price: 1 })).status, 400);
    assert.equal((await call(a.token, '/store/offer-checkout', { ...checkout, offerId: 'missing' })).status, 409);
    campaign.approvedByOwner = false;
    assert.equal((await call(a.token, '/store/offer-checkout', checkout)).status, 409);
    campaign.approvedByOwner = true;
    assert.equal((await call(a.token, '/store/checkout', { priceId: 'price_fixture' })).status, 409);
  });
  await t.test('inactive and unavailable providers cannot purchase', async () => {
    fixture.priceActive = false;
    assert.equal((await call(a.token, '/store/offer-checkout', checkout)).status, 409);
    fixture.priceActive = true; fixture.productActive = false;
    assert.equal((await call(a.token, '/store/offer-checkout', checkout)).status, 409);
    fixture.productActive = true; fixture.down = true;
    assert.equal((await call(a.token, '/store/offer-checkout', checkout)).status, 409);
    fixture.down = false; fixture.availableNative = false;
    assert.equal((await call(a.token, '/store/offer-checkout', { ...checkout, platform: 'ios' })).status, 409);
    fixture.availableNative = true;
    fixture.startsAt = new Date(Date.parse(campaign.startsAt) + 1000).toISOString();
    assert.equal((await call(a.token, '/store/offer-checkout', { ...checkout, platform: 'ios' })).status, 409);
    fixture.startsAt = campaign.startsAt;
    Date.now = () => Date.parse(campaign.startsAt) - 1;
    assert.equal((await call(a.token, '/store/offer-checkout', checkout)).status, 409);
    Date.now = realNow;
  });
  let reservationId: string, session: any;
  await t.test('repeated taps reserve a single checkout and prevent cross-provider purchases', async () => {
    const responses = await Promise.all([call(a.token, '/store/offer-checkout', checkout), call(a.token, '/store/offer-checkout', checkout)]);
    assert.deepEqual(responses.map(r => r.status), [200, 200]);
    reservationId = (await json(responses[0]!)).reservationId;
    assert.equal(fixture.creates, 1);
    session = [...fixture.sessions.values()][0];
    assert.ok(session.expires_at * 1000 <= Date.parse(campaign.endsAt));
    assert.equal((await call(a.token, '/store/offer-checkout', { ...checkout, platform: 'ios' })).status, 409);
  });
  await t.test('cancelled, unpaid, pending and forged paid webhook bodies grant nothing', async () => {
    assert.equal(await WebhookHandlers.fulfillCheckoutSession(session), null);
    // Client body says paid; provider says unpaid.
    assert.equal(await WebhookHandlers.fulfillCheckoutSession({ ...session, payment_status: 'paid' }), null);
    fixture.webhookSecret = '';
    await assert.rejects(WebhookHandlers.processWebhook(Buffer.from('{}'), 'fake'));
    fixture.webhookSecret = 'fixture-only-signing-secret';
    await assert.rejects(WebhookHandlers.processWebhook(Buffer.from('{}'), 'fake'));
    assert.equal((await db.select().from(storeReceipts).where(eq(storeReceipts.playerId, a.playerId))).length, 0);
  });
  let code = '';
  await t.test('failed payment, altered line items and out-of-window charges grant nothing', async () => {
    Object.assign(session, { payment_status: 'paid', status: 'complete', payment_intent: 'pi_fixture' });
    fixture.intentStatus = 'processing';
    await assert.rejects(WebhookHandlers.fulfillCheckoutSession(session));
    fixture.intentStatus = 'succeeded'; fixture.linePrice = 'price_tampered';
    await assert.rejects(WebhookHandlers.fulfillCheckoutSession(session));
    fixture.linePrice = 'price_fixture'; fixture.chargeAt = Date.parse(campaign.endsAt);
    await assert.rejects(WebhookHandlers.fulfillCheckoutSession(session));
    fixture.chargeAt = now;
  });
  await t.test('successful status retries and duplicate webhooks award one owner-bound receipt', async () => {
    code = (await WebhookHandlers.fulfillCheckoutSession(session))!;
    const event = Buffer.from(JSON.stringify({ type: 'checkout.session.completed', data: { object: session } }));
    await WebhookHandlers.processWebhook(event, fixture.signature);
    assert.equal(await WebhookHandlers.fulfillCheckoutSession(session), code);
    assert.equal((await db.select().from(storeReceipts).where(eq(storeReceipts.playerId, a.playerId))).length, 1);
    assert.equal((await call(b.token, '/store/verify-code', { code })).status, 404);
    assert.equal((await call(a.token, '/store/verify-code', { code })).status, 200);
    assert.equal((await call(a.token, '/store/verify-code', { code })).status, 200); // Lost response recovery
    assert.equal((await call(a.token, '/store/offer-checkout', checkout)).status, 409);
  });
  const nativeOwner = await owner();
  let nativeReservation: string;
  const transactionIdentifier = randomUUID();
  await t.test('native checkout checks current offerings and both campaign dates', async () => {
    const response = await call(nativeOwner.token, '/store/offer-checkout', { ...checkout, platform: 'ios' });
    assert.equal(response.status, 200);
    nativeReservation = (await json(response)).reservationId;
    fixture.purchases = [{
      id: 'purchase_' + transactionIdentifier, product_id: 'prod_native_campaign',
      store_purchase_identifier: transactionIdentifier, purchased_at: realNow() + 100, quantity: 1,
      ownership: 'purchased', status: 'owned', environment: 'sandbox', store: 'test_store',
    }];
    assert.equal((await call(b.token, '/store/native-verify', { productIdentifier: 'fixture_native_bundle', transactionIdentifier, reservationId: nativeReservation })).status, 409);
  });
  await t.test('native pending, refunded, wrong products and expiry races grant nothing', async () => {
    const body = { productIdentifier: 'fixture_native_bundle', transactionIdentifier, reservationId: nativeReservation };
    const purchase = fixture.purchases[0];
    purchase.status = 'refunded';
    assert.equal((await call(nativeOwner.token, '/store/native-verify', body)).status, 409);
    purchase.status = 'owned';
    process.env.NODE_ENV = 'production';
    assert.equal((await call(nativeOwner.token, '/store/native-verify', body)).status, 409);
    process.env.NODE_ENV = 'test';
    assert.equal((await call(nativeOwner.token, '/store/native-verify', { ...body, productIdentifier: 'com.goldrush.arena.starter_sack' })).status, 409);
    assert.equal((await call(nativeOwner.token, '/store/native-verify', { ...body, transactionIdentifier: 'pending' })).status, 409);
    const purchasedAt = purchase.purchased_at;
    purchase.purchased_at = Date.parse(campaign.endsAt);
    assert.equal((await call(nativeOwner.token, '/store/native-verify', body)).status, 409);
    purchase.purchased_at = purchasedAt;
  });
  await t.test('native verified success, restore and receipt retries return one code after expiry', async () => {
    const body = { productIdentifier: 'fixture_native_bundle', transactionIdentifier, reservationId: nativeReservation };
    const result = await call(nativeOwner.token, '/store/native-verify', body);
    assert.equal(result.status, 200, JSON.stringify(await result.clone().json()));
    const nativeCode = (await json(result)).code;
    fixture.purchases[0].id = 'another-revenuecat-wrapper-for-the-same-store-transaction';
    Date.now = () => Date.parse(campaign.endsAt) + 1;
    assert.equal((await call(b.token, '/store/offer-checkout', checkout)).status, 409);
    const replay = await call(nativeOwner.token, '/store/native-verify', { productIdentifier: body.productIdentifier, transactionIdentifier });
    assert.equal((await json(replay)).code, nativeCode);
    assert.equal((await db.select().from(storeReceipts).where(eq(storeReceipts.playerId, nativeOwner.playerId))).length, 1);
    Date.now = realNow;
  });
  await t.test('an authentic standard coin receipt remains separate from the online balance', async () => {
    const c = await owner(), id = randomUUID();
    fixture.purchases = [{ id, product_id: 'prod_native_coins', store_purchase_identifier: id, status: 'owned', environment: 'sandbox', store: 'test_store', quantity: 1, ownership: 'purchased' }];
    const response = await call(c.token, '/store/native-verify', { productIdentifier: 'com.goldrush.arena.starter_sack', transactionIdentifier: id });
    assert.equal(response.status, 200);
    const rewardCode = (await json(response)).code;
    const claim = await call(c.token, '/store/verify-code', { code: rewardCode });
    assert.equal((await json(claim)).reward.rewardAmount, 1000);
    const [player] = await db.select().from(arenaPlayers).where(eq(arenaPlayers.id, c.playerId));
    assert.equal(player!.earnedCoins, 0);
    assert.equal((await call(b.token, '/store/native-verify', { productIdentifier: 'com.goldrush.arena.starter_sack', transactionIdentifier: id })).status, 409);
  });
});
