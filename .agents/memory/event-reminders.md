---
name: Event reminder scope
description: SMS is deferred; native scheduled local notifications are the approved first delivery, not browser push.
---

Defer texting. The user said to do it later and approved either native or browser
phone notifications if supporting both is not feasible.

**Why:** The user declined the SMS connection and explicitly accepted “either
or” for notification platform coverage.

**How to apply:** Do not reconnect an SMS provider or collect phone numbers
without a new user request. Native-first scheduled local notifications are the
chosen delivery; preserve browser in-app reminders and never imply that installing
the website automatically enables background browser push.

Treat native notification exports, mocked OS scheduling checks and real
lock-screen delivery as separate evidence.

**Why:** Local OS schedules do not require remote push infrastructure, but browser
tests cannot exercise native notification permission or system presentation.

**How to apply:** Require an installed-device check before claiming actual phone
delivery. Event schedules are device-local and reconcile when the app reopens;
they are not a cloud cancellation or remote update service.
