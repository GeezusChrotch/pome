# Pome 3.1.1 — development test candidate

- Adds a small right-edge pushpin to pinned Home Screen items (scenes, devices,
  sensors, rooms, cameras). Borrowed Beepster's fixed pin-badge placement, using
  a drawn glyph instead of a text badge. Semantic pin status remains visible
  when decorative icons are off.
- Reserves title/marquee space and masks the marker area before drawing it;
  selected/unselected foreground and background follow the theme.
- Redraws Favorites as soon as that list arrives, without waiting for scenes and
  rooms. Sends an authoritative count so removed/empty favorites disappear.
- Reloads Favorites after successful phone settings save without manual Refresh.
- No Connector/helper, HomeKit control, camera, pin-storage, or layout-order changes.

All JS regressions including `tests/pin-indicator.test.cjs` pass; clean Basalt and
Emery builds pass. Physical appearance/startup acceptance is pending.

Artifact: `dist/Pome-3.1.1-pin-indicator.pbw`

SHA-256: `16395ca099323dd9cbfa45d23e35160d157ec4e6d21ea7c04159c402ee376382`

Initial phone-LAN install attempt returned `Connection refused`; not installed.
Waiting for the phone's developer connection. Connector development38 remains
live and unchanged. Not published.

Josh accepted direct HomeKit control on 3.1.0 and clarified that existing pins
are present. That acceptance does not yet cover this new pin glyph/Favorites fix.
