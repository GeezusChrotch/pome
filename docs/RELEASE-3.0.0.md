# Pome 3.0 — your home, your way

Pome 3.0 is a substantial Home Screen, personalization and everyday-control update for Pebble Time and Time 2. These highlights cover the changes since public 2.8.4.

## Make the Home Screen yours

Pin rooms alongside scenes, devices and sensors. Device pins open the device's controls directly without toggling it. Assign Pin / unpin to a button hold or Double Back, then use the same gesture to manage pins.

Drag to reorder pins and main sections together in phone settings. Hide sections you do not need, and keep useful shortcuts within easy reach. Clear subtitles identify pinned item types; Voice, Refresh and ordinary sections avoid unnecessary labels.

## Ten fresh themes, better readability

Choose from four readability-focused themes and six more playful palettes, all designed for strong contrast in normal and selected rows. Time 2 offers five font families and five title sizes. Adjust subtitle size independently, preview your choices and save custom themes in phone settings.

Large menu titles stay on one line and scroll when selected. Selected device icons remain visible. Menus start at the top, and enlarged subtitles have space of their own.

## Smoother everyday control

- Adjust a device repeatedly without being sent back to its room. Back or swipe exits when you are ready.
- Find devices grouped by type and alphabetically, with lights first. Room prefixes can be hidden from display names.
- Use room-wide light power, brightness and color controls, with paced group requests.
- Switches and plugs use simple toggles; fans and blinds have device-specific controls.
- Voice recognizes scene requests using “set” and clear room-color requests, without unnecessary confirmation for clear matches.
- Home Screen settings requests are coordinated to avoid duplicate-read conflicts and stale responses.
- Original Time memory headroom is improved by removing allocations and callbacks for obsolete, unreachable on-watch settings screens. Theme and shortcut customization remain in phone settings.

## What you need

Pome controls Apple Home through Itsyhome on your Mac. Use the Organik Apps Pebble Connector for coordinated setup, and your private Tailscale connection for access away from home. Your Mac must remain reachable. No public Funnel, router port forwarding or hosted Pome relay is required.

Time 2 has the expanded custom font collection and touch navigation. Original Time uses its supported stock fonts and physical buttons. Voice availability depends on dictation support and the phone companion's transcription service.

## Cameras are still experimental

**Camera viewing is not included in the public 3.0 package.** The public Connector does not yet ship a distributable HomeKit camera helper. The working private camera experiment is preserved, but it is not a public setup option. See [camera development status](CAMERAS-EXPERIMENTAL.md).

Pome remains an independent, open-source community app, with no added analytics or cloud storage. It is not affiliated with Apple, Itsyhome, Tailscale or Pebble.
