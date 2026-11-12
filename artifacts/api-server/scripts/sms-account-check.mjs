// Read-only preflight. Never print account identifiers, numbers, keys or errors.
import twilio from "twilio";
try {
  const client = twilio(process.env.TWILIO_API_KEY_SID, process.env.TWILIO_API_KEY_SECRET, {
    accountSid: process.env.TWILIO_ACCOUNT_SID, autoRetry: false, logLevel: "silent",
  });
  const account = await client.api.v2010.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
  const numbers = await client.incomingPhoneNumbers.list({ limit: 100 });
  process.stdout.write(JSON.stringify({
    accountActive: account.status === "active",
    trialAccount: account.type === "Trial",
    smsCapableSenderCount: numbers.filter(n => n.capabilities.sms).length,
    sendingAttempted: false,
  }) + "\n");
} catch (error) {
  process.stdout.write(JSON.stringify({ readable: false, httpStatus: Number(error?.status) || null, sendingAttempted: false }) + "\n");
  process.exitCode = 1;
}
