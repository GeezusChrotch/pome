# Changelog

## 2.3.1

- Make the phone preview use the Time 2 watch's exact 200×228-pixel content geometry.
- Preview font sizes at their real requested pixel size and match watch row heights.
- Remove preview-only bolding that was not applied on the watch.
- Simulate Pebble's corrected 64-color display palette instead of showing raw RGB colors.
- Accept the five bundled Time 2 font IDs instead of silently falling back to Gothic.
- Make Apply Current Preview send edited colors directly instead of reloading and restoring the saved theme first.

## 2.3.0

- Add a Time 2 enhanced typography edition within the same Pome package.
- Bundle Inter, Roboto, Open Sans, Montserrat, and Poppins exclusively for Time 2.
- Offer every enhanced font at 14, 18, 22, 26, and 30 points.
- Keep Pebble Time on its lightweight system fonts and map themes safely when switching watches.
- Update the live phone preview and built-in themes for the active watch model.

## 2.2.3

- Scroll oversized menu-item names horizontally while their row is selected.
- Pause at both ends of the marquee and reset it immediately when selection changes.
- Keep unselected rows and subtitles stationary for quick menu scanning.

## 2.2.2

- Ship five built-in themes: Classic, Pome Amber, Midnight, Forest, and Berry.
- Put every real Pebble font-size option directly in the settings page so the selector
  cannot appear empty in the iPhone webview.
- Keep incompatible sizes visible but disabled, and keep built-in themes separate from
  the 20 user-created theme slots.

## 2.2.1

- Make **Save Theme & Apply to Watch** persist the named theme and send it immediately,
  without requiring a second hidden save action.
- Add in-page instructions and separate, explicit setup and theme actions.
- Add Gothic, Gothic Bold, Roboto Condensed, Droid Serif Bold, and Bitham Black,
  with every point size each Pebble system font actually supports.
- Allow themes to save independently of server setup and support the emulator return path.
- Migrate themes created by 2.2.0 to the expanded font-size format.

## 2.2.0

- Add a dedicated Themes tab to Pome's phone settings with a live Pebble preview.
- Customize menu font color, background color, selection color, font family, font size,
  and device-icon visibility.
- Save, load, replace, and delete up to 20 named themes.
- Apply themes across watch menus, headers, selection states, and confirmation screens.

## 2.1.2

- Run unambiguous safe voice commands immediately without a second confirmation.
- Recognize optional "scene" and "on" wording around exact `set` scene commands.
- Keep confirmation for security-sensitive scene names and refuse ambiguous targets.

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
