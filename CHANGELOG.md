# Changelog

## 2.1.1

- Label Voice as requiring Pebble Time 2 on the original Pebble Time.
- Replace the original Time's unexplained vibration with a clear information screen.

## 2.1.0

- Add Voice as the first Pome menu item with native Pebble dictation.
- Discover rooms, scenes, devices, and configured colors dynamically from Itsyhome.
- Support Siri-style scene commands such as "Set Lounge TV" while keeping explicit
  device commands such as "Turn Lounge TV on" distinct.
- Add confirmed voice control for power, room lights, color, brightness, fan speed,
  blinds, and scenes, plus read-only sensor and device-status questions.
- Reject ambiguous, unsupported, and security-sensitive voice targets instead of guessing.

## 2.0.10

- Accumulate repeated blind position presses instead of reusing a briefly stale position.
- Queue rapid blind commands per accessory and refresh from Itsyhome after 30 seconds idle.

## 2.0.9

- Add blind controls for Open, Close, Up, Down, Slow Up/Down, and Fast Up/Down.
- Use 1% slow steps, 5% regular steps, and 10% fast steps from the current position.
- Target blinds by their exact Itsyhome service UUID when available.

## 2.0.8

- Group room devices by type: lights, fans, switches, outlets/plugs, then other types.
- Keep device names alphabetical within each type group.

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
