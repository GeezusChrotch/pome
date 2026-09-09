# Pome — Pebble Appstore listing, 3.1.5 preparation

**Hold publication** until the compatible HomeKit-default Connector is publicly
available in the Mac App Store and the release owner clears the gate.

- Title: Pome
- Category: Utilities
- Source: https://github.com/GeezusChrotch/pome
- Support: https://github.com/GeezusChrotch/pome/issues
- Icons: existing `appstore-assets/pome-icon-large.png` and `pome-icon-small.png`
- Exact frozen PBW and gates: [release evidence](docs/RELEASE-GATES-3.1.5.json)

## Description

Pome puts Apple Home on Pebble Time and Pebble Time 2.

Browse rooms, scenes, devices and read-only sensors. Control lights from one menu with toggle, percentages, preset colors and a live custom-color picker. Control all lights in a room, fan speed, plugs and blinds. Use Voice on supported watches for scenes and device commands.

Pin scenes, rooms, devices and cameras; drag pins and sections into your preferred order. Choose themes, fonts, title/subtitle sizes, scrolling speed and button shortcuts.

Time 2 adds camera snapshots: capture now or browse nine saved images, with capture time/age and panoramic panning. Choose individual camera visibility, refresh intervals and image processing. Prefer on-demand capture for battery cameras.

Requires the HomeKit-default Organik Apps Pebble Connector on a Mac, Home permission, and Tailscale on Mac and iPhone. One bundled helper handles controls and cameras; Itsyhome is NOT required. Keep the Mac awake and Connector running. Home controls require macOS 14; cameras require macOS 15.2 and Time 2.

No Pome account, analytics or cloud image storage. Your token grants home control and camera access: keep it private. Voice uses Pebble's configured transcription service. Camera vendors and Apple Home have their own privacy practices.

Setup: https://github.com/GeezusChrotch/pome/blob/main/docs/HOMEKIT-SETUP.md

Free, MIT open source. Independent of Apple, Tailscale and Pebble.

## Publication checks

Use the frozen installed 3.1.5 bytes, not the superseded 3.0.1 draft. Verify the
final public Connector Store identity/link and source commit first. Older screenshots
show pre-flat-menu controls and may describe the old architecture; refresh or omit
them, and never upload personal home/camera screenshots. No public mutation has
been performed by this preparation task.
