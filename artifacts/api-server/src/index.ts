import app from "./app.js";
import { logger } from "./lib/logger.js";
import { getUncachableStripeClient } from "./stripeClient.js";
import { installArenaSocket } from "./lib/arenaSocket.js";
import { startAvatarCleanup } from "./routes/avatars.js";
import { startSmsWorker } from "./lib/smsWorker.js";

async function initStripe() {
  try {
    await getUncachableStripeClient();
    logger.info('Stripe client initialized; checkout-session fulfillment ready');
  } catch (err: any) {
    logger.error({ err }, 'Failed to initialize Stripe — continuing without it');
  }
}

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

await initStripe();

const server = app.listen(port, (err) => {
  if (err) { logger.error({ err }, "Error listening on port"); process.exit(1); }
  logger.info({ port }, "Server listening");
});
installArenaSocket(server);
startAvatarCleanup();
void startSmsWorker().catch(() => logger.warn("SMS scheduler could not start; texts remain unavailable until the database and worker are ready"));
