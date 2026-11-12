// Product disclosures, not a legal opinion. Owner review is a release gate.
export const PRIVACY_POLICY = `Updated 12 November 2026 · Pre-release disclosure

This describes the current GoldRush Arena build. The publisher must confirm its legal identity, support contact, retention rules and public policy URL before public release. This text is not a claim of legal compliance.

Optional event notifications
In the installed iPhone/Android app, you can allow local device notifications, select open events and set how long before closing to be reminded. Permission is requested only when you enable them. Event choices, lead time and a random reminder identifier are stored locally; no phone number or remote push token is collected for local notifications. The operating system stores upcoming notification times. Turn reminders off or clear them in Events; signing out cancels pending alerts, and deleting a profile removes its saved reminder settings. Notification text can appear on your lock screen. Device settings and Focus may delay or hide alerts. Reopen Events for new windows or timezone changes; later event changes cannot cancel a local alert while the app remains closed. Browser reminders remain in-app only; background browser push is not enabled.

Optional US event reminder texts (separate channel, pending launch approval)
The SMS controls are available in Events and Settings, but verification and recurring texting remain unavailable until the owner approves costs, the provider verifies a US sender/campaign, and operational and privacy requirements are met. Connecting Twilio or entering a number does not mean texting is live. No international destinations are supported. This optional channel is restricted to people who confirm they are 18 or older; it is not required to play or buy anything. This self-confirmation is not certified age verification.

When enabled for release, we send a separately requested ownership code through Twilio Verify, validate US region and mobile line type, and require a separate affirmative agreement before recurring event texts. Verifying a number does not grant recurring consent. Only selected, server-verifiable featured events are supported. Rank-locked local challenges cannot be verified for SMS. The server calculates deadlines in your saved IANA timezone, which may differ from your current device timezone. One-hour reminders for midnight deadlines fall in quiet hours and will be skipped; choose an earlier timing. We skip texts outside 9am–8pm in your saved timezone rather than moving them to an unexpected time. Timings, network delivery and carrier presentation are not guaranteed. Up to 2 reminders per rolling day and 8 per rolling 31 days; fewer may be sent because of quiet hours, budgets, changed events or stale deadlines. Message and data rates may apply.

Your full number is encrypted in the private server database; a keyed, non-reversible recipient identifier supports abuse prevention and opt-out suppression across profiles/devices. Guest-session authorization restricts access. Twilio processes the destination, verification and delivery metadata under its policies; SMS itself is not end-to-end encrypted. No phone number or ownership code is placed in public player data, app analytics or application logs. We store consent version, timestamp and source, selected events, timezone, schedules and delivery receipts. Ownership codes are checked by Twilio Verify, not stored by GoldRush. Verification references expire after 10 minutes. Unverified number records are removed after 24 hours, inactive verified numbers after 90 days, delivery records after 30 days, abuse counters after their window plus 1 day, and minimal keyed consent evidence after 2 years. Active opt-out suppression is kept until a valid provider START and fresh verification/consent; removing a number or deleting a profile does not erase suppression. Database backups and Twilio retention require publisher confirmation before release.

Turn texts off, remove your number or edit selected events in Events or Settings. Sign-out withdraws recurring consent and cancels pending jobs; profile deletion removes the active number and private schedules before revoking your guest session. An online connection is required to confirm server cancellation/deletion. Already accepted carrier messages cannot be recalled. Reply STOP to the approved sender to stop texts and HELP for assistance. A provider START never automatically restores subscriptions: reverify and give fresh consent in the app. We do not use event-text consent for shop marketing.

1. Progress on your device
Your chosen player name, avatar selection, progress, inventory, purchase fulfillment records, settings and saved match clips are stored locally. These are device profiles, not authenticated cloud accounts. Signing out does not delete a profile. Removing app data can erase progress and locally saved clips. There is no general cloud-save recovery.

Optional photo avatars are an exception to local-only appearance storage. Choosing a photo and applying a crop creates a preview; pressing Save uploads it through a size-limited authenticated server endpoint to cloud storage under your guest identity. Photos are private by default. Publishing makes the sanitized photo accessible to other players; making it private revokes new public requests but cannot erase copies somebody already saved. The server re-encodes images without camera/location metadata. Remove saved photo in Profile to revoke access and request file deletion. Deleting a local player also revokes its server photo and guest credential before clearing local access; online profiles need a connection to complete deletion safely. Uninstalling alone is not a server-photo deletion request. A scheduled process removes expired staging uploads independently of guest activity; failed file deletions may still require maintenance.

2. Online features
Optional Paddle Studio design help sends your prompt and current design parameters to OpenAI through Replit AI Integrations. Avoid personal information in prompts. Saved custom designs are private to your guest identity; they are not published to a marketplace. AI attempts are rate limited and provider processing policies apply.

Party and matchmaking requests send a server-issued guest identifier, chosen name, appearance, party membership and latency information to the game server. Supported online matches send paddle inputs and receive synchronized state. The server stores guest credential hashes, skill values, earned online totals and completed match receipts. Native guest credentials use secure device storage; browser credentials use local origin storage. These identities are not verified email accounts or general cloud saves. Referral codes and rewards, daily challenges and score submissions also use the server. Avoid personal information in player names. Active rooms and party state can be lost on a server restart; completed online receipts persist. Casual fallback opponents are labeled AI, while Ranked waits for humans.

3. Purchases
Web purchases use Stripe-hosted checkout. Native digital purchases use the device app store through RevenueCat when configured. These providers process transaction and device/customer identifiers under their own policies. The game uses transaction identifiers or redemption codes to fulfill virtual goods and prevent duplicate grants. The game does not ask you to enter payment-card details inside its own screens. Consumable coins and lives are not a general cloud backup; restore cannot guarantee recovery of spent or device-local consumables.

4. Analytics and service logs
The web build can send gameplay and store interaction events through an injected Umami tracker when present. Native event tracking is currently a no-op in the app helper. Hosting and payment providers may process operational logs, IP addresses and request metadata. Do not assume that online activity is anonymous or that no information leaves your device.

5. Clips and sharing
On supported native devices, recent gameplay frames are captured for highlights. GIF encoding and clip storage happen locally. Opening the system share sheet lets you choose a destination, whose privacy rules then apply. The game cannot confirm that another app actually published a clip. No player YouTube sign-in or direct upload flow is implemented; the publisher's connected channel is not exposed to players.

6. Permissions and controls
Highlight capture records the game view, not the camera or microphone. Optional sharing uses the system share sheet. Review device permissions and delete saved clips in the clip library. This build must not be represented as certified for children or as satisfying a particular privacy law without a separate review.

7. Contact and requests
Publisher identity and a verified privacy/support contact are not yet configured for release. Use Settings > Support to read the current support status. Before release, the publisher must provide a reachable contact and a process for server-data access/deletion requests, and confirm provider retention and international processing details.`;

export const TERMS_OF_SERVICE = `Updated 6 November 2026 · Pre-release terms

These product terms require publisher and legal review before public release. They do not remove any mandatory consumer rights.

1. Playing the game
GoldRush Arena is an arcade paddle game. Supported Ranked and Casual modes use synchronized server-controlled matches. Ranked waits for four humans; Casual may fill empty seats with labeled AI. Practice and unsupported online variants remain local bot modes. Online play cannot pause and disconnecting can eliminate your paddle. Active rooms may be interrupted during server restarts without fabricated rewards. Network features may be unavailable or change during pre-release testing.

2. Device profiles
Names and avatars identify local profiles, not verified identities. You are responsible for keeping your device and purchase codes secure. Local progress and clips may be lost if app data is removed. No general cloud recovery is promised.

3. Fair use
Do not disrupt services, abuse other players, cheat, exploit purchase codes or attempt unauthorized access. Report problems through the support entry in Settings. These rules do not restrict rights granted by applicable open-source licenses.

4. Virtual goods and payments
Coins, cosmetics, lives and pass rewards are virtual goods, not cash or transferable investments. Read the item description, availability and price before confirming with your payment provider. Web checkout is handled by Stripe; native digital purchases are handled through the app store and RevenueCat. Provider refund and restoration rules and your statutory rights apply. Some consumables cannot be restored after use or local data loss. Opening checkout or cancelling a payment is not a completed purchase.

5. Sharing
You choose whether and where to share a gameplay clip. Opening a share sheet is not proof of publication. Do not share material that violates another person's rights. The app does not upload to the publisher's YouTube channel on your behalf.

6. Availability and responsibility
This is pre-release software provided as available. Features, connectivity and compatibility can fail. No store approval, uninterrupted service, legal compliance or real-human multiplayer capability is guaranteed. Any liability limitations must be reviewed by the publisher and do not override mandatory law.

7. Ownership and third-party licenses
The publisher retains rights in its original content. Third-party fonts, software and adapted design guidance remain subject to their own licenses. See the project's third-party notices for attribution.

8. Publisher details and changes
The publisher's legal identity, governing jurisdiction and verified support contact remain release blockers, not invented details. Updated terms and a public policy URL must be supplied before release. Settings includes accessible Terms, Privacy and Support entry points.`;
