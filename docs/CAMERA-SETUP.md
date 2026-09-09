# Camera setup — Pome 3.0.1 draft

Requires camera-enabled **Organik Apps Pebble Connector 1.0 from the Mac App Store**. This release remains a draft until that dependency is available and validated. Public Connector 0.8.7 and public Pome 3.0.0 do not provide this feature. Do not use a private development PBW as a public installation method.

## Requirements

- Pebble Time 2 and its iPhone companion app.
- Organik Apps Pebble Connector 1.0, camera-enabled Mac App Store edition. Store availability and first-install validation remain release gates; the installed development build is not a public download.
- macOS 15.2 or later for camera capture. The base Connector supports macOS 14, but camera capture requires the newer system APIs.
- Home access permission granted on the Mac, with the desired cameras visible in Apple Home.
- Tailscale on the Mac and phone, signed in to the same authorized private network. Keep the Mac reachable and the camera service running.

## Pair Pome

1. In Connector's sidebar, choose **Pome**, then enable **Use cameras with Pome**. Choose **Start camera connection**, then **Allow Home access**, and approve Apple's Home permission prompt. The camera helper is included in Connector; users should not install or provision a separate development app.
2. Choose **Start private camera connection**, then **Copy camera address** and **Copy camera token**. Keep Tailscale connected on the Mac and phone.
3. Open Pome's phone settings, then **Cameras**. Paste both and save. The phone checks the authenticated camera connection.
4. Reopen settings to load individual cameras. Choose their refresh intervals, image processing and automatic pan preference, then **Save camera settings**.
5. On Time 2, open Cameras, choose a camera, then Capture now or a saved image. Use your assigned Pin / unpin gesture on a camera to add a direct capture shortcut.

Connector also offers each camera's refresh setting, **Capture now**, and **Show latest image** on its Pome page. Camera monitoring and preview stay inside Connector; the internal rendering helper does not need a separate visible window. Closing the Connector window leaves capture running; quitting Connector stops it. Fresh capture after window close and normal Quit/reopen has been verified on the tested Store build, with the camera token and refresh settings preserved.

Leave the token field blank to retain a saved token. Changing the URL requires the corresponding token, so a saved secret is never automatically sent to a different host. Clear the URL to disconnect camera pairing. Tokens are not included in the settings-page HTML or public PBW.

## Refresh and privacy

New cameras default to on-demand. For battery/solar cameras, use on-demand or a less frequent interval such as 15 minutes. Capture now wakes a camera regardless of its normal schedule; frequent captures can affect battery life.

The nine newest images are kept in memory. Hide a camera to clear its history; quit the helper to clear all images. Anyone with an unlocked paired device or the token plus authorized network access may be able to view images. Never share the token, use Tailscale Funnel or expose the camera port publicly.

See [camera privacy details](../CAMERA-PRIVACY.md), including the snapshot-cache freshness caveat and the helper's own-window capture behavior.

## Troubleshooting

- **Pair your Connector:** enter the camera URL and token in the Cameras tab; the Itsyhome control URL is separate.
- **Connection check failed:** verify Tailscale, Connector status and the camera token. Pairing is retained for correction, but a failed check is not reported as success.
- **Camera unavailable or capture timed out:** check whether Apple Home can show that camera. Battery cameras and unreliable wireless links can take longer to wake. Pome will not replace a failed manual capture with an older photo.
- **Settings save failed:** reopen settings and check Connector availability. Schedule changes are acknowledged individually, so earlier changes may have succeeded before a later failure.
