import { PgBoss } from "pg-boss";
import { pool } from "@workspace/db";
import { reconcileSmsProvider, reconcileSmsSchedules, sendSmsDelivery } from "./smsService.js";
import { logger } from "./logger.js";

export async function startSmsWorker() {
  // pg-boss persists its cron schedule, work, leases and recovery in Postgres.
  // An always-on process is a production launch gate. Autoscaling HTTP alone
  // is not a clock and must not be represented as closed-app SMS scheduling.
  const boss = new PgBoss({
    db: { executeSql: (text, values) => pool.query(text, values) },
    schema: "goldrush_sms_queue",
  });
  boss.on("error", () => logger.warn("SMS durable scheduler unavailable; no delivery success is confirmed"));
  await boss.start();
  await boss.createQueue("event-sms-reconcile", { retryLimit: 2, retryDelay: 30 });
  await boss.createQueue("event-sms-send", { retryLimit: 0, expireInSeconds: 60 });
  await boss.work<{ id: string }>("event-sms-send", { batchSize: 1 }, async jobs => {
    for (const job of jobs) await sendSmsDelivery(job.data.id);
  });
  const reconcile = async () => {
    const due = await reconcileSmsSchedules();
    for (const row of due) await boss.send("event-sms-send", { id: row.id }, { singletonKey: row.id, singletonSeconds: 60, retryLimit: 0 });
    await reconcileSmsProvider();
  };
  await boss.work("event-sms-reconcile", async () => { await reconcile(); });
  await boss.schedule("event-sms-reconcile", "* * * * *", {}, { tz: "UTC" });
  await reconcile();
  logger.info("SMS durable scheduler ready; live sends still require all release gates");
  return boss;
}
