# Pome — Pebble Appstore listing

## Basic details

- Title: Pome
- Category: Utilities
- Source code URL: https://github.com/GeezusChrotch/pome
- Support URL: https://github.com/GeezusChrotch/pome/issues
- Large appstore icon: `appstore-assets/pome-icon-large.png` (144×144)
- Small appstore icon: `appstore-assets/pome-icon-small.png` (80×80)
- Watch launcher icon: `resources/images/pome-menu-icon.png` (25×25)

## Description (maximum 1,600 characters)

Pome puts Apple Home controls on Pebble Time and Pebble Time 2.

Browse favorites, scenes, rooms, devices and read-only sensors. Control lights, brightness and
colors; move blinds in small steps; and run favorite scenes from pinned shortcuts. Use Voice on
dictation-capable watches for home commands and sensor questions.

Make it yours with themes, fonts, text sizes, colors, optional device icons and configurable
long-press shortcuts. Pinned scenes stay at the top of the main menu.

Pome connects through Itsyhome on your Mac. For guided private setup, install Organik Apps Pebble
Connector and open its Pome page. It checks your Itsyhome service and helps configure Tailscale.
Itsyhome remains required and installed separately. Existing phone URLs and watch settings are
preserved. Direct LAN connections also remain supported.

Keep the Mac awake, Itsyhome running and Tailscale connected on Mac and phone for home-and-away
control. Voice uses the transcription service configured in Pebble. No Pome account, analytics
or hosted relay. Never expose the Itsyhome service through public Funnel or router forwarding.

Setup: https://github.com/GeezusChrotch/pome

Free MIT open-source software. Independent of Apple, Itsyhome, Tailscale and Pebble. Third-party
products have their own terms.

## Unified connector setup

The recommended guided setup is now [Organik Apps Pebble Connector](https://github.com/GeezusChrotch/organik-pebble-connector).
Use its Pome page; Itsyhome remains installed separately. [Migration guide](docs/UNIFIED_CONNECTOR.md).
Publish the connector link only after its coordinated release is available.

## Extended setup and troubleshooting

1. Install [Itsyhome for macOS](https://itsyhome.app/macos). Its Webhooks/CLI feature is required.
2. Open Itsyhome → Settings → Webhooks/CLI, enable the server, and keep the default port `8423` unless it conflicts with another service.
3. Verify the Mac endpoint before adding Tailscale:

   ```sh
   curl http://127.0.0.1:8423/status
   ```

4. Install [Tailscale](https://tailscale.com/download) on both the Mac and paired iPhone, then sign them into the same tailnet.
5. Publish the local Itsyhome service privately over tailnet HTTPS:

   ```sh
   tailscale serve --bg --https=10443 localhost:8423
   tailscale serve status
   ```

   If Itsyhome is explicitly bound to another local address, use that address as the Serve target.

6. Copy the reported `https://…ts.net:10443` URL. In the Pebble iPhone app, open Pome's settings, paste it into **Itsyhome server URL**, and save.
7. Keep Itsyhome running on the Mac and Tailscale connected on the iPhone. Pome works away from the LAN because the paired iPhone reaches the Mac through the private tailnet.

Never use Tailscale Funnel or router port-forwarding for this server. Pome and Itsyhome do not add authentication to a publicly exposed webhook endpoint.

## Suggested screenshots for each platform

1. Pome launcher icon and main navigation.
2. A room showing Sensors, Scenes, All Lights, and type-grouped alphabetical devices.
3. A read-only sensor submenu with live values.
4. A room-scene submenu showing active state.
5. A light's Toggle, Brightness, and Color controls.

Create separate Basalt and Emery asset collections in the Pebble Developer Portal.
