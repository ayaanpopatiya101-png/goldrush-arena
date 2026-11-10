# Phone event notifications

SMS is deferred at the owner's request. This implementation uses **one-shot
local notifications in the installed iPhone/Android app**, not remote push or
browser notifications. It does not collect phone numbers, register push tokens,
send messages through Twilio, or require an SMS account.

## Player flow

Events → Phone notifications (also reachable from Settings → Phone event
reminders). Permission is requested only after pressing Allow phone reminders.
Select open, eligible events and choose 1 hour, 3 hours or a custom whole number
of minutes from 5 to 10,080. Selections and lead time can be edited while off.
The screen lists each actual upcoming scheduled alert. A lead time already in
the past is skipped rather than producing an immediate late alert.

Turning reminders off, clearing them, signing out or deleting the active
profile cancels this feature's queued alerts. Cancellation failures are not
reported as a successful update/sign-out. Other notification namespaces are
not cancelled.

## Scheduling and limitations

- The operating system stores absolute one-shot fire dates, so an open app,
  browser tab, continuously running server or SMS scheduler is not required
  for an already-scheduled notification.
- Dates come from the app's published local-device event calendar, not an
  invented official tournament. Only open, eligible, selected events with
  valid closing times are scheduled.
- Settings are separate from existing in-app follows/reminders and from
  gameplay progress. A random per-profile local identifier is used in the OS
  schedule, not the player's name or phone number.
- Reconciliation runs on startup, foreground, rank/settings changes and once
  per minute while active. Duplicate requests are serialized and deduplicated
  by occurrence and lead time; old schedules are removed when choices change.
- Reopen Events to schedule a new event window or after timezone/rank changes.
  This is not a remote event-cancellation service: if the app is never reopened,
  previously queued alerts cannot be checked against later event changes.
- Focus, notification settings, provisional iOS authorization, Android battery
  restrictions and OS scheduling can affect visibility and timing. We do not
  request exact-alarm access or promise exact-to-the-second delivery.
- The web version keeps existing in-app reminders only. Merely adding the
  website to Home Screen does not enable background Web Push in this version.

## Verification record

Automated tests use non-sending fake OS adapters, including timing, DST,
eligibility, preference validation, permission denial/revocation, repeated
requests, failed cancellation/scheduling and profile cleanup. Native adapter
tests verify real Expo API request shapes without emitting a device alert.

Browser rendering and JS/platform exports do **not** prove native notification
delivery. Before release, perform the following on an installed signed build:

1. Deny permission; check the explanation and Phone settings link.
2. Allow permission and select an eligible event with a future reminder time.
   Choose a lead time that schedules an alert a few minutes ahead.
3. Background/close the app and confirm the notification appears in the
   notification center/lock screen when device settings permit it.
4. Change the time, deselect the event and disable reminders; confirm removed
   alerts no longer arrive. Repeat after sign-out and active-profile deletion.
5. Test iOS provisional/disabled alerts and Android battery/channel settings.
6. Reopen after a timezone/DST change and verify the displayed and queued
   instants agree. Check that unrelated app alerts are not removed.

Do not mark physical-device delivery as verified until these checks are
actually observed. New native dependencies/plugin configuration require a new
native build; a web republish alone does not update an installed app.

Development verification: all 15 focused notification tests and the 50-test
existing reliability suite passed, along with the mobile TypeScript check.
Both iOS and Android Hermes exports completed successfully. No physical-device
lock-screen delivery has been observed in this workspace.

A 390×844 browser check verified Settings → Events navigation, the installed-app
only disclosure, no web permission prompt, no horizontal overflow, existing in-app
reminder persistence after reload, and the privacy disclosure. This check used
an isolated local test profile and sent no real notifications.
