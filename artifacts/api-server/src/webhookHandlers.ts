import { getStripeWebhookSecret, getUncachableStripeClient } from './stripeClient.js';
import { db, purchaseCodes } from '@workspace/db';
import { createHmac } from 'crypto';
import { logger } from './lib/logger.js';

function generateCode(sessionId: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is required for purchase-code generation');
  const digest = createHmac('sha256', secret).update(sessionId).digest('hex').toUpperCase();
  return `GR-${digest.slice(0, 6)}-${digest.slice(6, 12)}`;
}

export class WebhookHandlers {
  static async fulfillCheckoutSession(session: any): Promise<string | null> {
    if (!session?.id || session.payment_status !== 'paid') return null;

    const meta = session.metadata ?? {};
    const rewardJson = JSON.stringify({
      rewardType:   meta.reward_type   ?? 'coins',
      rewardAmount: meta.reward_amount ? Number(meta.reward_amount) : undefined,
      rewardSkins:  meta.reward_skins  ? (meta.reward_skins as string).split(',') : undefined,
      seasonPass:   meta.reward_type === 'season_pass',
      label:        meta.reward_label  ?? 'Purchase reward',
    });

    const code = generateCode(session.id);
    await db.insert(purchaseCodes).values({ code, rewardJson }).onConflictDoNothing();

    if (meta.purchase_code !== code) {
      const stripe = await getUncachableStripeClient();
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

    // Stripe's signature is mandatory outside local development.
    let event: any;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? await getStripeWebhookSecret();
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else if (process.env.NODE_ENV === 'development') {
      try {
        event = JSON.parse(payload.toString());
      } catch {
        throw new Error('Invalid Stripe webhook payload');
      }
    } else {
      throw new Error('STRIPE_WEBHOOK_SECRET is required outside development');
    }

    if (event?.type === 'checkout.session.completed') {
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
