# App Review Notes

GoldRush Arena is a portrait arcade game in which the player defends the bottom wall of a four-sided arena. The other paddles are computer controlled. A normal match takes about two to five minutes.

No sign-in is required. The display name chosen during onboarding is stored locally. Online party, matchmaking, challenge, referral, and leaderboard features use a randomly generated installation identifier and work only when a network connection is available. Bot-based play remains available without a connection.

## How to review the main game loop

1. Launch the app and choose any display name and avatar.
2. From Home, choose a mode and start a match.
3. Drag along the bottom edge to move the gold paddle.
4. Keep the ball from crossing the bottom goal. The last remaining paddle wins.
5. Complete the match to see rewards and progression.

## Purchases

The Shop uses Apple In-App Purchase through RevenueCat on iOS. Stripe checkout is restricted to the separate web build and is not presented in the iOS app. The Shop includes a Restore Purchases control for eligible non-consumable products. Consumable coin and extra-life products are not restorable after use.

Products must be submitted with this app version and present in the RevenueCat `current` offering before review. If products are not ready, remove the Store and Extras real-money sections from the release build rather than leaving unavailable purchase controls.

## Permissions and sharing

The app does not request camera, photo-library, microphone, contacts, or location permission. Highlight clips and party invitations are shared only after the player taps a share control, using the standard iOS share sheet.

## Review environment

- Account required: No
- Demo account: Not applicable
- Network required for core bot match: No
- Network required for party play, live matchmaking, challenges, referrals, leaderboards, code redemption, and purchases: Yes
- Advertising: None
- Tracking across apps or websites: None

Contact for review questions: goldrush.arena@gmail.com
