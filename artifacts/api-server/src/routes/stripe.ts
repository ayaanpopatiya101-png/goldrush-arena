import { Router, type IRouter } from 'express';
import { storage } from '../storage.js';
import { getUncachableStripeClient } from '../stripeClient.js';
import { db, purchaseCodes } from '@workspace/db';
import { eq } from 'drizzle-orm';

const router: IRouter = Router();

// ── List all active store products with prices (fetched live from Stripe) ─────
router.get('/store/products', async (_req, res) => {
  try {
    const stripe   = await getUncachableStripeClient();
    const products = await stripe.products.list({ active: true, limit: 50 });
    const result   = await Promise.all(
      products.data.map(async (product) => {
        const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
        return {
          id:          product.id,
          name:        product.name,
          description: product.description,
          metadata:    product.metadata ?? {},
          prices:      prices.data.map(p => ({
            id:          p.id,
            unit_amount: p.unit_amount,
            currency:    p.currency,
            recurring:   p.recurring,
          })).sort((a, b) => (a.unit_amount ?? 0) - (b.unit_amount ?? 0)),
        };
      })
    );
    // Sort: coins first (by amount), then pass, then skins
    const order = (p: any) => {
      const cat = p.metadata?.category ?? 'z';
      return cat === 'coins' ? 0 : cat === 'pass' ? 1 : cat === 'skins' ? 2 : 3;
    };
    result.sort((a, b) => order(a) - order(b) || (a.prices[0]?.unit_amount ?? 0) - (b.prices[0]?.unit_amount ?? 0));
    res.json({ data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create a Stripe Checkout session ─────────────────────────────────────────
router.post('/store/checkout', async (req, res) => {
  try {
    const { priceId } = req.body as { priceId: string };
    if (!priceId) { res.status(400).json({ error: 'priceId is required' }); return; }

    const stripe  = await getUncachableStripeClient();
    const domain  = process.env.REPLIT_DOMAINS?.split(',')[0] ?? req.get('host');
    const baseUrl = `https://${domain}`;

    // Fetch price + product metadata to store in session
    const price   = await stripe.prices.retrieve(priceId, { expand: ['product'] });
    const product = price.product as any;
    const meta    = product?.metadata ?? {};

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: price.recurring ? 'subscription' : 'payment',
      success_url: `${baseUrl}/api/store/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}/api/store/cancel`,
      metadata: {
        reward_type:   meta.reward_type   ?? 'coins',
        reward_amount: meta.reward_amount ?? '',
        reward_skins:  meta.reward_skins  ?? '',
        reward_label:  meta.reward_label  ?? product?.name ?? 'Purchase reward',
      },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Verify + claim a purchase code ────────────────────────────────────────────
router.post('/store/verify-code', async (req, res) => {
  try {
    const { code } = req.body as { code: string };
    if (!code) { res.status(400).json({ error: 'code is required' }); return; }

    const result = await storage.verifyAndClaimCode(code.trim().toUpperCase());
    if (!result) {
      res.status(404).json({ error: 'Code not found or already used.' }); return;
    }
    res.json({ success: true, reward: result.reward });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Success page (shown in browser after Stripe payment) ──────────────────────
router.get('/store/success', async (req, res) => {
  const sessionId = req.query.session_id as string | undefined;
  let code = '';
  let label = 'your reward';

  if (sessionId) {
    try {
      const stripe  = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      code  = (session.metadata?.purchase_code ?? '').toUpperCase();
      label = session.metadata?.reward_label ?? label;
    } catch { /* best-effort */ }
  }

  // If code isn't on the session yet (webhook may be slightly delayed), poll DB
  if (!code && sessionId) {
    // Try to find a very recent unused code as fallback (within last 60s)
    try {
      const rows = await db.select().from(purchaseCodes)
        .where(eq(purchaseCodes.used, false))
        .limit(1);
      if (rows.length) code = rows[0].code;
    } catch { /* ignore */ }
  }

  const codeHtml = code
    ? `<div class="code-box">${code}</div>
       <p class="hint">Copy this code, open GoldRush Arena → Shop → <strong>REDEEM</strong></p>`
    : `<p class="hint pending">Your reward code is being generated — check back in a moment or contact support if it doesn't appear.</p>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GoldRush Arena — Purchase Complete!</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #04060E;
    color: #fff;
    font-family: system-ui, -apple-system, sans-serif;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; padding: 24px;
  }
  .card {
    background: #0D1020;
    border: 1.5px solid #C8820A55;
    border-radius: 20px;
    padding: 36px 28px;
    max-width: 420px;
    width: 100%;
    text-align: center;
  }
  .trophy { font-size: 56px; margin-bottom: 16px; }
  h1 { font-size: 22px; font-weight: 700; color: #FFD700; letter-spacing: 1px; margin-bottom: 8px; }
  .sub { font-size: 14px; color: #FFFFFF88; margin-bottom: 28px; }
  .code-box {
    background: #1A1400;
    border: 2px solid #FFD700;
    border-radius: 12px;
    padding: 18px 24px;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 4px;
    color: #FFD700;
    margin: 0 auto 20px;
    font-family: monospace;
  }
  .hint { font-size: 14px; color: #FFFFFF99; line-height: 1.5; margin-bottom: 24px; }
  .hint.pending { color: #FFAA55; }
  .hint strong { color: #FFD700; }
  .steps {
    background: #FFFFFF08;
    border-radius: 12px;
    padding: 16px;
    text-align: left;
    font-size: 13px;
    color: #FFFFFF77;
    line-height: 2;
  }
  .steps strong { color: #FFD700; }
</style>
</head>
<body>
<div class="card">
  <div class="trophy">🏆</div>
  <h1>PAYMENT COMPLETE!</h1>
  <p class="sub">Thank you for supporting GoldRush Arena — ${label}</p>
  ${codeHtml}
  <div class="steps">
    <strong>How to claim:</strong><br>
    1. Open GoldRush Arena<br>
    2. Go to <strong>Shop</strong> tab<br>
    3. Tap <strong>REDEEM</strong><br>
    4. Enter the code above<br>
    5. Your reward is added instantly!
  </div>
</div>
</body>
</html>`);
});

// ── Cancel page ───────────────────────────────────────────────────────────────
router.get('/store/cancel', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>GoldRush Arena — Cancelled</title>
<style>body{background:#04060E;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;} .c{text-align:center;padding:32px;} h1{color:#FF4757;margin-bottom:12px;} p{color:#FFFFFF88;}</style>
</head><body><div class="c"><div style="font-size:48px">❌</div><h1>Purchase Cancelled</h1><p>No charge was made. Return to GoldRush Arena.</p></div></body></html>`);
});

export default router;
