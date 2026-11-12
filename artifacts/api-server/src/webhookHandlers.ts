import { getStripeWebhookSecret, getUncachableStripeClient } from './stripeClient.js';
import { db, purchaseCodes, storeReservations } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { createHmac } from 'crypto';
import { logger } from './lib/logger.js';
import { deliverVerifiedPurchase } from './lib/storeDelivery.js';
import { rewardFromMetadata } from './lib/storeRewards.js';

function generateCode(sessionId: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is required for purchase-code generation');
  const digest = createHmac('sha256', secret).update(sessionId).digest('hex').toUpperCase();
  return `GR-${digest.slice(0, 6)}-${digest.slice(6, 12)}`;
}

export class WebhookHandlers {
  static async fulfillCheckoutSession(session: any): Promise<string | null> {
    if (!session?.id || session.payment_status !== 'paid') return null;
    // Never trust a webhook body (including local development payloads) as payment authority.
    const stripe = await getUncachableStripeClient();
    session = await stripe.checkout.sessions.retrieve(session.id);
    if (session.payment_status !== 'paid' || session.status !== 'complete') return null;
    const meta = session.metadata ?? {};
    if (meta.store_reservation) {
      const [reservation] = await db.select().from(storeReservations).where(eq(storeReservations.id, meta.store_reservation));
      if (!reservation || reservation.provider !== 'stripe' || reservation.providerSession !== session.id)
        throw new Error('Checkout does not match its reserved offer.');
      const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 2 });
      if (items.data.length !== 1 || items.data[0]?.price?.id !== reservation.productId || items.data[0]?.quantity !== 1)
        throw new Error('Checkout product does not match the reserved offer.');
      if (typeof session.payment_intent !== 'string') throw new Error('Offer payment has no verified payment intent.');
      const intent = await stripe.paymentIntents.retrieve(session.payment_intent, { expand: ['latest_charge'] });
      const charge = intent.latest_charge;
      if (intent.status !== 'succeeded' || !charge || typeof charge === 'string' || !charge.paid || charge.refunded
        || charge.created * 1000 < reservation.startsAt.getTime() || charge.created * 1000 >= reservation.endsAt.getTime())
        throw new Error('Payment was not completed within the reserved offer window. Contact support with this checkout receipt.');
      return deliverVerifiedPurchase({
        receiptId: `stripe:${session.id}`, playerId: reservation.playerId, reward: reservation.reward, reservationId: reservation.id,
      });
    }
    const rewardJson = JSON.stringify(rewardFromMetadata(meta));

    const code = generateCode(session.id);
    await db.insert(purchaseCodes).values({ code, rewardJson }).onConflictDoNothing();

    if (meta.purchase_code !== code) {
      await stripe.checkout.sessions.update(session.id, {
        metadata: { ...meta, purchase_code: code },
      });
    }

    return code;
  }

  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const stripe = await getUncachableStripeClient();

    // Signature verification is required in every environment.
    let event: any;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? await getStripeWebhookSecret();
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      throw new Error('A Stripe webhook signing secret is required');
    }

    if (event?.type === 'checkout.session.completed' || event?.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data?.object;
      if (session?.payment_status === 'paid') {
        try {
          await WebhookHandlers.fulfillCheckoutSession(session);
        } catch (error) {
          logger.error({ err: error, sessionId: session.id }, 'Failed to fulfill Stripe checkout session');
          throw error;
        }
      }
    }
  }
}
