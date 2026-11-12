# US event reminder texts: operations and release gates

Checked 12 November 2026. This is an implementation/runbook, not a legal opinion
or evidence of carrier delivery. International sending is disabled in code.

## Current release status

- Events and Settings contain a separate optional SMS channel. Existing native
  local notifications and browser in-app reminders remain separate.
- **Live sending is off. No purchase, registration submission, paid Lookup,
  verification text, or live reminder test was authorized or performed.**
- The connected Twilio integration documents that its message-create path cannot
  submit Twilio's required form body. The owner selected the official SDK using
  Replit Secrets instead. No credential belongs in a chat, commit or support log.
- The read-only SDK account preflight returned HTTP 401. Account access, sender
  inventory, account type and approval status therefore remain **unconfirmed**.
  Correct the dedicated key/account pairing securely and re-run the read-only
  preflight; never infer approval merely because a connection was attached.
- Publisher identity, public privacy URL, real support contact, sender selection,
  campaign classification, provider approval, worker hosting and costs require
  owner review. These are activation blockers, not successful live setup.

## Sender choice and costs

All Twilio application traffic is A2P, even a hobby game. Do not label engagement
reminders "P2P", route around registration, or use Verify to send event messages.
Verify is only for the separately requested ownership code.

| Option | Requirements | Trade-off | Observed public US pricing |
|---|---|---|---|
| Registered A2P 10DLC | Correct legal/business or eligible sole-proprietor brand, campaign vetted for this precise use case, sender attached to that approved Messaging Service/campaign, opt-in/STOP/HELP samples and public policies | Local identity; throughput depends on brand/campaign/carrier trust and limits. Registration and recurring campaign fees apply; rejection/resubmission can cost more. | $1.15/month number; $0.0083 per outbound/inbound SMS segment before carrier fees; campaign vetting FAQ lists $15. Brand/campaign fees depend on registration path: obtain owner-approved quote first. |
| Verified toll-free | Paid Twilio account, required compliance profile, toll-free sender verification **approved**, sender attached to correct Messaging Service, approved consent and samples | A different approval route, **not** an exemption from review. Can suit a small nationwide service; throughput still limited and filtered. | $2.15/month number; $0.0083 per outbound/inbound segment before carrier fees. Confirm verification/other fees with Twilio before submitting. |

Current public US outbound carrier examples: AT&T $0.0035/segment, T-Mobile
$0.0045, Verizon $0.005, plus Twilio's base rate. Published failed-message
processing fee: $0.001. Rates can change. Monthly numbers, registrations,
inbound STOP/HELP/START responses, taxes, Verify and paid mobile-line Lookup are
additional costs, **not all covered by the application's outbound budget**.
Owner must inspect the account-specific quote. Verify pricing and Lookup pricing
must be confirmed separately before enabling their chargeable calls.

Classification is not self-certified: reminders encouraging gameplay could be
classified as engagement/marketing by the provider or applicable law, even with
no shop promotion. Have Twilio/legal counsel approve the actual campaign, copy,
consent method, age policy and use case. Do not silently select "customer care"
or "account notifications" to avoid that review. GoldRush's current local
challenges are not cash-prize tournaments; any future prize/gambling-like
mechanic requires a new provider-content review.

## Configuration checklist — do not enable during development

Only after the owner approves **each** consequential action:

1. Secure credentials: `TWILIO_ACCOUNT_SID`, a dedicated
   `TWILIO_API_KEY_SID`/`TWILIO_API_KEY_SECRET`, and `TWILIO_AUTH_TOKEN`.
   Prefer a dedicated subaccount and least-privilege API key. The Account Auth
   Token is used solely for webhook signature validation by this feature.
2. Existing stable `SESSION_SECRET` must be high-entropy and at least 32
   characters. AES-256-GCM and HMAC use separately derived HKDF purpose keys.
   Do not rotate it without migrating encrypted numbers **and retained keyed
   suppression records**; losing the suppression key does not permit recontact.
3. Set `SMS_PUBLIC_BASE_URL` to the owner's approved public HTTPS origin, without
   path/query/userinfo. Obtain the actual published address using deployment
   information; never substitute a guessed domain or development URL.
4. Provide `SMS_SUPPORT_CONTACT` and `SMS_PRIVACY_URL`; review the 18+ product
   restriction and retention disclosures. Self-confirmation is not certified
   age assurance. Children must not be enrolled in this release.
5. Select `SMS_SENDER_TYPE=10dlc` or `tollfree`, set
   `SMS_APPROVED_PHONE_SID`, `SMS_APPROVED_FROM`,
   `TWILIO_MESSAGING_SERVICE_SID`, and for 10DLC
   `SMS_APPROVED_CAMPAIGN_ID`. Do not purchase or submit anything automatically.
6. Configure the Messaging Service inbound webhook, **POST form**:
   `/api/sms-reminders/provider/inbound`. Disable "use inbound webhook on number"
   so the service-level webhook actually runs. Messages pin the single approved
   From sender even if the service has other senders.
7. Configure **Advanced Opt-Out** for STOP and synonyms, START/UNSTOP and HELP/INFO.
   Review the localized/English replies in Twilio, with GoldRush identity,
   real support contact, frequency, rates, and STOP instructions. The provider
   sends keyword replies; the app returns empty TwiML to avoid duplicate replies.
   HELP must not re-enable texts or add shop marketing. Review confirmation
   requirements and campaign samples with Twilio before enabling any traffic.
   Set `SMS_ADVANCED_OPTOUT_APPROVED=true` only after this review.
8. Delivery callback, **POST form**:
   `/api/sms-reminders/provider/status?job=<opaque-receipt-id>`.
   The SDK sets this exact address per message. Signature verification uses the
   configured HTTPS origin plus exact path/query, never client Host/forwarded
   headers. Check reverse-proxy preservation of the original URL.
9. Configure an existing approved `TWILIO_VERIFY_SERVICE_SID` with six-digit codes,
   Fraud Guard, US-only Verify geographic permissions, and provider rate limits.
   Enable only US in Programmable Messaging geographic permissions as well.
   Review the separate Lookup line-type charge.
10. Set `SMS_DAILY_BUDGET_CENTS` to an explicitly approved bounded value (1–100000);
    this application reserves 25 cents per attempted Lookup/Verify flow and
    5 cents per reminder, with no refunds on ambiguous/failing calls. These are
    conservative US estimates, **not provider account spending caps**. Reconfirm
    they cover actual account rates before setting the live switch. Configure
    Twilio usage triggers/alerts and any available account spending controls.
    Disable the app switch immediately on unexpected usage. Inbound costs and
    calls from elsewhere in the account are outside this ledger.
11. Approve the durable hosting arrangement below, then set
    `SMS_WORKER_APPROVED=true`, `SMS_COMPLIANCE_APPROVED=true`.
    Sender runtime checks still require an active, non-trial account, correct
    service pool/callback and VERIFIED campaign or TWILIO_APPROVED toll-free
    record. Approval checks are cached for at most 60 seconds.
12. Only after **separate explicit permission to send**, set
    `SMS_OTP_APPROVED=true` and `SMS_LIVE_ENABLED=true`. There are intentionally no
    public endpoints for changing release gates. No one has authorized these
    values merely by connecting Twilio or saving credentials.

Missing/invalid gates are visible in Events and Settings. They must never be
reported as successful delivery or bypassed to make a demo look functional.

## Persistence, ownership and cancellation

- Every private request resolves a server-issued bearer guest credential.
  Mutations recheck its current hash inside the transaction, not a client player
  ID. Public gameplay responses never include SMS records.
- Recipients, current consent version/time/source, subscriptions, exact UTC
  instants, receipt states, rolling limits and minimal suppression persist in
  Postgres. Numbers are AES-GCM ciphertext; suppression/limits use keyed HMAC,
  not reversible numbers or unsalted low-entropy phone hashes.
- Ownership code and recurring-message consent have separate unchecked controls.
  Successful verification never enables a subscription. Consent is optional,
  adult-only, not a condition of purchase/play, and excludes shop marketing.
- An edit carries an expected revision. Stale requests cannot overwrite a
  cancellation or a newer edit. Changing number cancels pending work and
  requires ownership and recurring consent again. Sign-out withdraws consent,
  clears verification authority and cancels pending jobs. It requires an online
  acknowledgement; OS notification settings **do not stop SMS**.
- Profile deletion removes the private recipient and schedules inside the same
  serialized transaction used for credential retirement. Minimal HMAC consent
  evidence and suppression are retained as disclosed, not a public player link.
- STOP persists across profile removal and devices, cancels work and invalidates
  current verification and consent. A signed provider START only permits a fresh
  ownership/consent flow; it never restores old subscriptions. An already
  carrier-accepted text cannot be recalled.

## Calendar and delivery guarantees

Supported events are the four server-owned, all-player featured modes. Server
calendar code computes local midnights in the saved validated IANA timezone
using Temporal, including DST. No client message body, arbitrary deadline,
balance, rank or eligibility claim is used. A parity test catches changes to the
shipped featured-mode calendar. Rank/QP/plays are currently device-local, so
weekly/monthly/annual challenge groups explicitly remain unavailable for SMS.

Event settings are recurring, but jobs cover an authoritative upcoming window
and are periodically replenished. Work rechecks the current server catalog,
active window, closing instant, subscription revision, verification, consent,
suppression and quiet hours immediately before provider creation.

Quiet policy: only 09:00 through **before** 20:00 in the saved timezone.
Midnight deadlines mean the 1h and 3h presets are in quiet hours and **skip**
rather than silently moving. A custom 300-minute (5h) lead produces a 19:00
candidate. The UI explains this limitation. A lead before the event opens, a
passed lead, changed catalog, stale job (>10 minutes), or expired deadline is
not sent late. Travel does not silently change the saved SMS timezone.

Limits persist across processes: 3 OTP requests/recipient and player/rolling
24h; 120s recipient resend reservation plus at least 60s recipient-record
cooldown; 10 OTP flows/IP/24h; 5 checks/player/10m; 2 reminders/recipient/24h,
8/31d; 100 reminders/global/24h; bounded monetary reservation. Request limits
also cap owner/IP/global operations. Failed attempts count. Twilio Fraud Guard
and geo limits are additional provider controls, not substitutes.

`pg-boss` persists cron, jobs and leases in `goldrush_sms_queue`; the durable
recipient/delivery tables are the scheduling source of truth. The reconciliation
schedule runs once a minute; a poll/wake-up is not the stored schedule. Multiple
instances can consume safely. The committed attempt marker prevents a provider
create from being automatically repeated after a crash. A lost provider response
becomes **unknown**, not failed-then-retry; a signed callback can attach its SID
to that opaque receipt. Known provider SIDs reconcile by read-only fetch. No-SID
ambiguities require manual review and are **never blindly resent**.

**Hosting is a real production gate:** run an always-on worker process that can
reach the same Postgres database, with pg-boss schema privileges and verified
clock/timezone data. Do not promise timely SMS from an HTTP deployment that can
scale to zero. For autoscaling web servers, keep at least one independently
always-on worker; its database lease/heartbeat coordinates with all replicas.
No deployment is created or changed by this task. A stale worker heartbeat
pauses activation and sending. Monitor queue lag, oldest unknown attempt,
failed/delivered counts and heartbeat using only aggregate/non-PII information.

## Retention and access

The durable worker runs expiry independently of an open app. Pending verification
references last 10 minutes; unverified recipient records expire after 24h;
inactive verified recipients after 90d; receipts after 30d; limit reservations
after their window plus 1d; minimal consent evidence after 730d. Active
suppression is intentionally not age-expired. A provider START retains the
minimal record and still requires fresh verification and consent.

Only runtime DB/service roles and authorized maintainers should access private
tables and encryption roots. Use TLS for DB and provider traffic, encrypted
managed storage/backups and restrictive workspace access. Application encryption
does not prevent a compromised runtime with the keys from decrypting data.
Review backup expiry, Twilio Verify retention, message metadata, subprocessors
and lawful deletion obligations with the publisher. Provider-side retention
controls are requested for reminder creates, but GoldRush cannot promise deletion
from a carrier, recipient device or an unknown accepted request. Provider errors,
full destinations, OTP values and request bodies are never logged by SMS code;
even malformed SMS bodies use a generic parser error. SMS request log URLs are
collapsed to a constant path with no query.

## Owner-controlled live test procedure — NOT YET AUTHORIZED

1. Obtain permission for the chosen number/campaign costs and registration
   separately. Owner reviews all actual legal/business fields before submission.
2. Resolve authentication and finish approved sender/service/keyword/worker
   setup. Keep all live gates off until ready.
3. Ask explicitly for permission for the exact live test: owner-controlled US
   mobile recipient entered in the app (never chat), date/time/timezone, maximum
   charge and maximum texts, including Verify and STOP/HELP replies. Never use
   a third-party recipient or an address harvested from account history.
4. Enable only the approved window/budget. In the real UI request the ownership
   code, confirm receipt on the owner's device, verify, then separately opt in
   to a supported event at a valid daytime candidate. Do not forge server event
   instants or bypass gating to force a test.
5. Record only redacted evidence: provider SID in access-controlled operations
   records, callback timestamps and states, owner confirmation of actual device
   receipt, then STOP/HELP/START behavior. Do not put the number, code, provider
   credentials or screenshots containing them in project memory, analytics,
   GitHub, chat or public artifacts.
6. Disable/revoke the test subscription, remove its active number if requested,
   retain required suppression, and return gates/budget to the agreed state.
   Mocked provider tests and screenshots do **not** establish carrier delivery.

## Verification commands and evidence

From project root:

```
pnpm run typecheck
pnpm --filter @workspace/scripts exec tsx --test ../artifacts/api-server/tests/sms.test.ts
pnpm --filter @workspace/scripts exec tsx --test ../artifacts/api-server/tests/sms-api.test.ts
pnpm --filter @workspace/mobile run test:notifications
pnpm --filter @workspace/api-server exec node scripts/sms-account-check.mjs
```

The unit/service suite injects a fake provider and uses fictional reserved
numbers. The API suite uses the running development API with live gates off.
Both use isolated guest fixtures in the development DB; neither sends real
texts. Account-check is read-only, prints only capability counts/status, and its
authentication rejection is not a carrier delivery failure. The Settings
browser check must remain scoped to this feature. Preserve existing profiles.

## Official sources

- [A2P 10DLC requirements](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc)
- [Toll-free verification](https://www.twilio.com/docs/messaging/compliance/toll-free/console-onboarding)
- [US pricing](https://www.twilio.com/en-us/sms/pricing/us)
- [Campaign vetting FAQ/fee](https://help.twilio.com/articles/11587910480155-A2P-10DLC-Campaign-Vetting-FAQ)
- [Messaging policy, including consent and A2P classification](https://www.twilio.com/en-us/legal/messaging-policy)
- [Verify pricing](https://www.twilio.com/en-us/verify/pricing)
- [Lookup pricing](https://www.twilio.com/en-us/lookup/pricing)
- [Webhook security](https://www.twilio.com/docs/usage/webhooks/webhooks-security)
- [Advanced Opt-Out](https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out)
- [pg-boss documentation](https://timgit.github.io/pg-boss/)

See [the country-by-country rollout matrix](sms-international-rollout.md).
