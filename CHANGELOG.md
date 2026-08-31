# Changelog

## 2.0.7

- Invert device icons to white alongside the text when a menu row is selected.

## 2.0.6

- Add small Pebble-native icons for lights, fans, switches, outlets, blinds, locks,
  climate devices, garage doors, and other device types.
- Remove the redundant "Select to toggle" subtitle from toggle-only devices.

## 2.0.5

- Resolve same-named multi-service accessories by their exact Itsyhome service UUID.
- Label ambiguous rows by type so fan, light, and switch services are visibly distinct.
- Fix fan speed and switch commands that previously failed or targeted the wrong service.

## 2.0.4

- Add fan speed control with 25/50/75/100% presets.
- Keep fans limited to Toggle and Speed while switches and outlets remain toggle-only.

## 2.0.3

- Restrict brightness and color menus and commands to lights and All Lights groups.
- Keep switches, outlets, fans, and other toggle-safe accessories toggle-only.

## 2.0.2

- Replace the expanded setup walkthrough in phone settings with one concise link.

## 2.0.1

- Add a complete URL-finding guide directly to Pome's phone settings.
- Explain Itsyhome Webhooks/CLI setup, LAN URLs, and private Tailscale Serve URLs.
- Link to the full setup guide and warn against Funnel or router port forwarding.

## 2.0.0

- Prepare Pome for public distribution under the MIT License.
- Remove the developer's private server URL from fresh installations.
- Add a safe first-run setup message and URL validation.
- Document LAN-only and private Tailscale Serve configurations.
- Retain all room, sensor, scene, color, and paced All Lights controls from 1.9.1.
