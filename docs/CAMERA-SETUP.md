# Camera setup — Pome 3.1.5

Prepared for the HomeKit-default Connector release; not publicly available yet.
First complete [Apple Home setup](HOMEKIT-SETUP.md). Controls and cameras use the
same Pome URL/token; do not create a second pairing in the Cameras tab.

## Requirements

- Pebble Time 2 and its iPhone companion app.
- The compatible HomeKit-default Organik Apps Pebble Connector.
- macOS 15.2 or later for optional camera capture; Home controls require macOS 14.
- Home access on the Mac and private Tailscale connectivity on Mac and phone.

## Enable and choose cameras

1. Open Connector → Pome. Complete Connect Apple Home, private connection and
   phone pairing. The helper is bundled; no additional app installation is needed.
2. Expand **Cameras**, enable **Use cameras with Pome**, and choose cameras and
   refresh preferences. Connector also provides **Capture now**.
3. Reopen Pome phone settings → **Cameras**. Set visibility, refresh intervals,
   image processing and automatic pan preference, then **Save camera settings**.
4. On Time 2, open Cameras, choose a camera, then Capture now or a saved image.
   Use your assigned Pin / unpin gesture to create a main-screen capture shortcut.

Keep Connector running. Closing its window leaves services active; quitting stops
them. The accepted development build preserved pairing/settings across normal
Quit/reopen. Fresh public Store installation remains a separate release gate.

New cameras default to on demand. For battery/solar cameras, prefer on demand or
a less frequent interval such as 15 minutes. Capture now wakes a camera regardless
of schedule. HomeKit scheduled snapshots can contain stale pixels; manual capture
uses a fresh stream and does not substitute cached images on failure.

Read [camera privacy](../CAMERA-PRIVACY.md) before enabling caching.
