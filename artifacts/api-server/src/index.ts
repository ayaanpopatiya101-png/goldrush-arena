import app from "./app.js";
import { logger } from "./lib/logger.js";
import { getUncachableStripeClient } from "./stripeClient.js";

async function initStripe() {
  try {
    // Verify Stripe credentials are accessible on startup
    await getUncachableStripeClient();
    logger.info('Stripe client initialized');

    // Set up webhook endpoint (register in Stripe dashboard or via API)
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
    if (domain) {
      const webhookUrl = `https://${domain}/api/stripe/webhook`;
      logger.info({ webhookUrl }, 'Stripe webhook endpoint ready');
    }
  } catch (err: any) {
    logger.error({ err }, 'Failed to initialize Stripe — continuing without it');
  }
}

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

await initStripe();

app.listen(port, (err) => {
  if (err) { logger.error({ err }, "Error listening on port"); process.exit(1); }
  logger.info({ port }, "Server listening");
});
