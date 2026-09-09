# Direct Apple Home setup — Pome 3.1.5

Prepared release guide, not a published update. The accepted local Connector is
1.0 development build 39. Its compatible Store release is planned as build 40 or
higher, pending packaging and Apple review. The release owner must insert and
verify its public Store link before publication. Older camera-enabled Connectors
may not implement `/home/*` and cannot substitute for the HomeKit-default release.

## One Mac installation

1. Install the matching Organik Apps Pebble Connector on your Mac. Its embedded
   HomeKit helper handles devices, scenes, sensors, and cameras. No Itsyhome
   installation, subscription, webhook server, or additional helper installation
   is needed for this version of Pome.
2. In Connector → Pome, choose **Connect Apple Home** and allow **Home** access
   when macOS asks. The Mac must be signed into an Apple
   account with access to the home and permission to control its accessories.
3. Connect the Mac and your iPhone to your private Tailscale network, then choose
   **Start private connection**. Connector
   stays running on the Mac; HomeKit permission does not replace this connection.
4. Choose **Copy Pome URL** and **Copy Pome token** in Connector.
5. In the Pebble iPhone app, open Pome settings → **Setup**. Paste the **Connector
   URL** and **Connector token**, then **Save setup**. Reopen settings to load
   scenes and camera choices. Existing Pome camera pairing is reused automatically.
6. Choose favorite scenes under **Favorite scenes**. These are Pome's selections,
   not Apple Home or Itsyhome favorites. Existing watch pins, themes, shortcuts,
   section order, and camera preferences are retained.

Keep setup concise: the watch settings page links here. Camera schedules, image
processing, and panning remain on the separate **Cameras** tab. Camera viewing
still requires Time 2 and macOS 15.2 or later; home controls require macOS 14.
Original Time retains home controls. In Connector, expand **Cameras** and enable
**Use cameras with Pome** if desired.

## Compatibility

- Rooms, scenes, light power/color/brightness, room-wide lights and rainbow,
  fan speed, switch/plug toggles, blind positions and increments, and sensor menus
  use native HomeKit. Watch interaction and voice matching are unchanged.
- Brightness greater than zero powers a light on; zero powers it off. Color and
  fan speed preserve the existing behavior without an extra power command.
- Only writable characteristics actually exposed by an accessory can be set.
  Unsupported commands return an error rather than pretending to work.
- Scene names and service UUIDs come from Apple Home. Custom Itsyhome aliases,
  hidden-item choices, favorites, virtual groups, and Home Assistant-only devices
  are not imported. Devices bridged into Apple Home remain eligible.
- Empty and automation-owned action sets are excluded from the scenes list.
  Duplicate room or scene names across homes fail safely instead of choosing
  a home implicitly. A future home selector can remove that limitation.
- Sensors are refreshed on opening a room. Failed or timed-out reads show
  unavailable rather than presenting stale values as fresh. Temperatures supplied
  by HomeKit are Celsius, matching the raw API convention used previously.
- A timed-out write has an unknown outcome. Refresh before manually trying again;
  the phone does not automatically repeat native commands. Multi-characteristic
  changes and multi-light commands are not atomic and can partially succeed.

## Privacy and access

The same bearer token now permits home control as well as camera viewing.
Treat it like a house-control credential. Never share it, expose the service with
Tailscale Funnel, forward its port publicly, or include it in screenshots or bug
reports. The helper listens only on loopback; use private authenticated Tailscale
HTTPS access. The saved token is not embedded in the settings HTML or public PBW.

Pome adds no hosted backend, analytics, or cloud image storage. Apple Home,
accessory manufacturers, Tailscale, and Pebble dictation retain their own service
and privacy behavior. Camera capture/cache behavior is unchanged; see
[camera privacy](../CAMERA-PRIVACY.md).
