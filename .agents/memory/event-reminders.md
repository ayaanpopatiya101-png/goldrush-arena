---
name: Event reminder scope
description: US-only SMS is now requested first; native local notifications remain separate from browser push.
---

The user originally deferred texting, but now explicitly requests the SMS feature
before the next app upgrades: “United States first then plan out how to do other
countries and what will stop us from doing that.”

**Why:** The user's latest request supersedes the earlier SMS deferral.

**How to apply:** Plan/build US-only, optional verified SMS reminders first, with
an international readiness/blocker plan. Connect the provider through the secure
integration flow; provider connection is not permission to buy numbers or send
test messages. Preserve native local and browser in-app reminders as separate
channels. Never imply that installing the website automatically enables Web Push.

Treat native notification exports, mocked OS scheduling checks and real
lock-screen delivery as separate evidence.

**Why:** Local OS schedules do not require remote push infrastructure, but browser
tests cannot exercise native notification permission or system presentation.

**How to apply:** Require an installed-device check before claiming actual phone
delivery. Native local notification schedules are device-local and reconcile
when the app reopens; they are not a cloud cancellation or remote update service.
SMS requires its own durable server schedule and an approved always-on worker,
not an open app or an HTTP service that can scale to zero.

Preserve keyed SMS suppression through encryption/session-key rotation.

**Why:** A deleted profile can still correspond to a legally suppressed recipient.
Losing the old suppression key must not make that number eligible for recontact.

**How to apply:** Treat key changes as an encryption-and-suppression migration,
not routine session cleanup; keep sending disabled if old suppression cannot be
matched safely.
