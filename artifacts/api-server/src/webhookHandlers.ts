import { getUncachableStripeClient } from './stripeClient.js';
import { db, purchaseCodes } from '@workspace/db';
import { randomBytes } from 'crypto';

function generateCode(): string {
  const part = (n: number) => randomBytes(n).toString('hex').toUpperCase();
  return `GR-${part(3)}-${part(3)}`;
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const stripe = await getUncachableStripeClient();

    // Verify webhook signature (best-effort — webhook secret may be unset in dev)
    let event: any;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      // Dev fallback: parse without verification
      try {
        event = JSON.parse(payload.toString());
      } catch {
        return;
      }
    }

    if (event?.type === 'checkout.session.completed') {
      const session = event.data?.object;
      if (session?.payment_status === 'paid') {
        const meta = session.metadata ?? {};
        const rewardJson = JSON.stringify({
          rewardType:   meta.reward_type   ?? 'coins',
          rewardAmount: meta.reward_amount ? Number(meta.reward_amount) : undefined,
          rewardSkins:  meta.reward_skins  ? (meta.reward_skins as string).split(',') : undefined,
          seasonPass:   meta.reward_type === 'season_pass',
          label:        meta.reward_label  ?? 'Purchase reward',
        });

        const code = generateCode();
        try {
          await db.insert(purchaseCodes).values({ code, rewardJson }).onConflictDoNothing();

          // Best-effort: update session metadata with code (useful for success page)
          await stripe.checkout.sessions.update(session.id, {
            metadata: { ...meta, purchase_code: code },
          });
        } catch {
          /* non-fatal — log but continue */
        }
      }
    }
  }
}
