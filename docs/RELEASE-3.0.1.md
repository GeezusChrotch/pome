# Pome 3.0.1 — cameras on your wrist

**Draft — not yet publicly released.** Requires the camera-enabled **Organik Apps Pebble Connector 1.0 from the Mac App Store**, which must be available before this release is published. This does not change the already-published 3.0.0 package.

## A fresh look at home

On Pebble Time 2, choose Cameras, then a camera. **Capture now** requests a new image; the nine newest saved images follow, newest first. Pin a camera to your Home Screen to request a fresh capture directly, using your usual Pin / unpin shortcut.

Photos preserve their aspect ratio at the watch's full native height. Wide images pan automatically, or you can drag sideways and use Up/Down. Set the automatic pan duration or turn it off. Choose Natural, High contrast or Original image processing.

A persistent, outlined caption shows the capture time and elapsed age. Configure each camera's refresh interval independently, from 15 seconds to one hour, on-demand only, or hidden. For battery and solar cameras, prefer on-demand or a less frequent interval such as 15 minutes.

## Personal setup, private connection

Pair using your own camera URL and token from the camera-enabled Organik Apps Pebble Connector. They are stored locally on the phone, never embedded in the public watch download. Saved tokens are not displayed in settings; changing the URL requires its token. Pairing is checked against the Connector, and schedule saves report completion or failure.

Connector 1.0's Mac App Store edition includes the camera helper and its controls in one installation. Camera capture requires macOS 15.2 or later; the base Connector's macOS 14 support does not include camera capture. [Camera setup instructions](https://github.com/GeezusChrotch/pome/blob/main/docs/CAMERA-SETUP.md).

The exact credential-free build has been installed on a physical Time 2, and camera functionality and preserved settings were accepted by the tester. Separate history and panning acceptance has not been claimed. Public Connector availability, final lifecycle checks and fresh-install permission validation remain release gates.

## Privacy and freshness

The helper retains up to nine images per enabled camera in memory. Hiding a camera clears its history; quitting the helper clears all images. Manual capture briefly opens a muted HomeKit stream, captures a still from the helper's own window and stops the stream. No desktop or other-app capture is used, and no video/audio recording is transferred to the watch.

Scheduled snapshots use HomeKit's snapshot API, which can return old pixels with a recent reported timestamp. Manual capture uses the live-stream path to avoid that cache limitation; a failed fresh request reports an error instead of silently substituting a saved image. The caption reflects the supplied capture time, not an independent guarantee of camera pixel freshness.

Images travel through the authenticated private Tailscale connection and paired phone. Pome adds no cloud image storage or analytics. Camera vendors, HomeKit, the operating system and backups have their own privacy behavior.

All Pome 3.0 Home Screen, theme, readability and device-control improvements remain. Original Pebble Time keeps those controls; camera viewing requires Time 2.
