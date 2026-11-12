// Imported ONLY by the test bundler. Never imported by application code.
export const fixture = {
  down: false, webhookSecret: 'fixture-only-signing-secret', signature: 'valid-fixture-signature',
  creates: 0, productActive: true, priceActive: true, availableNative: true,
  campaignId: 'fixture-offer', startsAt: '', endsAt: '',
  sessions: new Map<string, any>(), purchases: [] as any[], products: new Map<string, any>(),
  chargeAt: 0, chargePaid: true, intentStatus: 'succeeded', linePrice: 'price_fixture',
};
export const logger = { warn() {}, error() {}, info() {} };
const price = () => ({
  id: 'price_fixture', active: fixture.priceActive, type: 'one_time', unit_amount: 499, currency: 'usd',
  product: { id: 'prod_fixture', active: fixture.productActive, metadata: {
    store_campaign: fixture.campaignId, reward_type: 'skins', reward_skins: 'chrome,cosmic',
  } },
});
export const stripeFixture: any = {
  prices: { retrieve: async () => { if (fixture.down) throw new Error('Fixture provider unavailable'); return price(); } },
  products: { list: async () => ({ data: [] }) },
  checkout: { sessions: {
    create: async (input: any) => {
      fixture.creates++;
      const session = { ...input, id: `cs_fixture_${fixture.creates}`, status: 'open', payment_status: 'unpaid', url: 'https://checkout.stripe.com/fixture' };
      fixture.sessions.set(session.id, session);
      return session;
    },
    retrieve: async (id: string) => { const s = fixture.sessions.get(id); if (!s) throw new Error('Missing fixture session'); return s; },
    update: async (id: string, input: any) => Object.assign(fixture.sessions.get(id), input),
    listLineItems: async () => ({ data: [{ price: { id: fixture.linePrice }, quantity: 1 }] }),
  } },
  paymentIntents: { retrieve: async () => ({
    status: fixture.intentStatus, latest_charge: { paid: fixture.chargePaid, refunded: false, created: fixture.chargeAt / 1000 },
  }) },
  webhooks: { constructEvent: (payload: Buffer, signature: string) => {
    if (signature !== fixture.signature) throw new Error('Invalid fixture signature');
    return JSON.parse(payload.toString());
  } },
};
export async function getUncachableStripeClient() { if (fixture.down) throw new Error('Fixture provider unavailable'); return stripeFixture; }
export async function getStripeWebhookSecret() { return fixture.webhookSecret; }
export class ReplitConnectors {
  async proxy(_connector: string, path: string) {
    if (fixture.down) return new Response('{}', { status: 503 });
    if (path.includes('/customers/') && path.includes('/purchases')) return Response.json({ items: fixture.purchases });
    if (path.includes('/products/')) {
      const id = path.split('/products/')[1];
      return fixture.products.has(id) ? Response.json(fixture.products.get(id)) : new Response('{}', { status: 404 });
    }
    if (path.endsWith('/packages/pkg_fixture/products')) return Response.json({ items: fixture.availableNative ? [{ product: fixture.products.get('prod_native_campaign') }] : [] });
    if (path.includes('/packages?')) return Response.json({ items: fixture.availableNative ? [{ id: 'pkg_fixture', lookup_key: 'fixture_bundle' }] : [] });
    if (path.endsWith('/offerings/offering_fixture')) return Response.json({
      is_current: true, state: 'active', metadata: { campaign_id: fixture.campaignId, starts_at: fixture.startsAt, ends_at: fixture.endsAt },
    });
    if (path.includes('/offerings?')) return Response.json({ items: [] });
    throw new Error(`Unexpected fixture API path ${path}`);
  }
}
