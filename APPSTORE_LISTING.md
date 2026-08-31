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

Pome puts Apple Home controls on a Pebble Time or Pebble Time 2.

Browse favorites, scenes, rooms, devices, and read-only sensors from your wrist. Lights include toggle, 25/50/75/100% brightness presets, and six colors chosen with the iPhone color wheel. Each room has an All Lights control with paced commands and retries. Other compatible accessories can be toggled. Devices are grouped by type and alphabetized within each group, with redundant room prefixes hidden, while sensitive scene names require confirmation.

Pome uses PebbleKit JS on the paired phone to contact Itsyhome running on your Mac. Itsyhome bridges Apple Home/HomeKit to an HTTP webhook server. Pome has no account, analytics, hosted backend, or cloud relay; it talks only to the URL you configure.

Required setup:
1. Install Itsyhome for macOS: https://itsyhome.app/macos
2. In Itsyhome, open Settings > Webhooks/CLI and enable the server (port 8423 by default).
3. Open Pome's settings in the Pebble phone app and enter a reachable Itsyhome URL.

For LAN-only use, enter a local HTTP URL. For private home-and-away access, install Tailscale on the Mac and phone, sign both into the same tailnet, and run `tailscale serve --bg --https=10443 localhost:8423`. Paste the HTTPS URL reported by `tailscale serve status` into Pome.

Never use Tailscale Funnel or router port forwarding for this server. Pome is an independent open-source community project and is not affiliated with Apple, Itsyhome, Tailscale, or Pebble.

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
