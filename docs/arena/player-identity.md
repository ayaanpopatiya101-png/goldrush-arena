# Player identity and onboarding

The existing welcome/name/default-look flow and playable paddle lesson remain.
Personalization is optional; Create works without opening the colour picker or
choosing a photo. Saved-player recovery and Settings tutorial replay remain.

## Appearance
- Shared ColorPicker supports presets, hue strip, saturation/value plane,
  numeric HSV inputs and hex entry. It is reusable by the paddle designer.
- Photo selection uses the system library picker. JPEG/PNG/WebP, 5 MB and
  16-megapixel limits apply before cropping.
- Drag or button controls adjust a square crop; Use this crop previews a real
  resized JPEG. Save photo is separate from saving emblem/frame colour.
- Photo upload is optional and needs a network connection. Failures, cancellation
  and invalid selections do not replace the saved avatar.
- Native denial offers another request or device Settings. Browser permission
  behavior differs and is not evidence of native permission behavior.

## Privacy and ownership
The existing cryptographically random guest session owns each avatar. No local
username or client player ID grants access to another player's object. Requests
use the bearer session, not URL tokens. This is device-bound guest ownership, not
email-account recovery or cloud progress sync.

Uploads cross an authenticated, 5 MB raw-body boundary before storage is written.
Oversized declared-length and chunked uploads are both rejected without storing
bytes. No unrestricted signed PUT is issued. Tickets are immutable, rate limited,
and write concurrency is bounded. Commit verifies ownership,
size, raster format and pixel limits against a pinned storage generation, strips
metadata and writes a separate 512px JPEG before changing the saved pointer.
Decode concurrency is bounded. Old and staging files are removed best-effort;
expired staging records are cleaned independently at startup and every minute,
even if the original guest never returns. Cleanup retries storage failures.

Private images require owner authentication. Explicit publication enables the
public avatar endpoint and opponent displays. Unpublishing/removing immediately
revokes new public reads and updates active room snapshots. Already downloaded
copies cannot be remotely erased. Local profile deletion first uses its existing
credential to revoke the photo and server identity. It then clears the local
credential, pending session and photo cache. Offline deletion of an online
profile stops with a retry message rather than discarding its deletion authority.
Recreating the same name creates a new identity with no old private photo.

## Verification
Browser at 390×844: new player, keyboard hex, pointer hue adjustment, image
selection/crop/private save, reload persistence, invalid image, cancelled draft,
publish/unpublish, removal and fallback passed. XP remained unchanged.
Protocol checks passed for unauthorized requests, cross-owner commit denial,
invalid format/oversize, sanitized dimensions/metadata, private default,
publication/revocation, failed-image preservation and deletion.

Native permission-denial behavior is unit-tested with mocked responses, not
certified on iOS/Android hardware. Test gallery permission refusal/permanent
refusal/limited access, crop gestures, offline retry and reload on signed
physical-device builds before store release.
